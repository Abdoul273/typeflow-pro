import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { KeyboardLayoutType, sanitizeForQwerty } from './constants';

export interface DuelPlayer {
  id: string;
  name: string;
  photo?: string | null;
  ready: boolean;
  rematchReady?: boolean;
  progress: number;
  cursorIndex: number;
  wpm: number;
  rawWpm?: number;
  accuracy: number;
  errors: number;
  correctChars?: number;
  totalKeystrokes?: number;
  finished: boolean;
  finishTime?: number | null;
  lastHeartbeat?: number | null;
}

export type DuelCategory = 'sprint' | 'standard' | 'literary' | 'tech';

export interface DuelTextItem {
  id: string;
  title: string;
  category: DuelCategory;
  categoryLabel: string;
  content: string;
  charCount: number;
  estimatedSeconds: number;
}

export interface DuelRoom {
  id: string;
  code: string;
  textId: string;
  textTitle: string;
  textContent: string;
  textFingerprint: string;
  category: DuelCategory;
  layout: KeyboardLayoutType;
  status: 'waiting' | 'ready' | 'starting' | 'in_progress' | 'finished' | 'cancelled';
  countdown?: number | null;
  startTime?: number | null;
  raceStartsAt?: number | null;
  createdAt: string;
  round: number;
  player1: DuelPlayer;
  player2?: DuelPlayer | null;
  winnerId?: string | null;
  firstFinisherId?: string | null;
  finishDeadlineAt?: number | null;
  cancelledBy?: {
    id: string;
    name: string;
    role: 'player1' | 'player2';
  } | null;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  botTargetWpm?: number;
}

export const RACE_SYNC_MS = 180;
export const FINISH_GRACE_MS = 90000;

export function textFingerprint(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function getStableGuestId(): string {
  const storageKey = 'typeflow_guest_id';
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = `guest_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `guest_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function computeRaceStats(params: {
  correctChars: number;
  errors: number;
  elapsedMs: number;
  totalChars: number;
}): {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  progress: number;
  finishTime: number;
  totalKeystrokes: number;
} {
  const elapsedMs = Math.max(250, params.elapsedMs);
  const minutes = elapsedMs / 60000;
  const totalKeystrokes = params.correctChars + params.errors;
  const wpm = minutes > 0 ? Math.round((params.correctChars / 5) / minutes) : 0;
  const rawWpm = minutes > 0 ? Math.round((totalKeystrokes / 5) / minutes) : 0;
  const accuracy =
    totalKeystrokes === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((params.correctChars / totalKeystrokes) * 100)));
  const progress =
    params.totalChars === 0
      ? 0
      : Math.min(100, Math.round((params.correctChars / params.totalChars) * 100));
  const finishTime = Math.round((elapsedMs / 1000) * 100) / 100;
  return { wpm, rawWpm, accuracy, progress, finishTime, totalKeystrokes };
}

function createFreshPlayer(base: { id: string; name: string; photo?: string | null }, ready = false): DuelPlayer {
  return {
    id: base.id,
    name: base.name || 'Pilote Anonyme',
    photo: base.photo || null,
    ready,
    rematchReady: false,
    progress: 0,
    cursorIndex: 0,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    errors: 0,
    correctChars: 0,
    totalKeystrokes: 0,
    finished: false,
    finishTime: null,
    lastHeartbeat: null
  };
}

function resolveWinner(playerA: DuelPlayer, playerB: DuelPlayer): string {
  const aDone = Boolean(playerA.finished);
  const bDone = Boolean(playerB.finished);
  if (aDone && !bDone) return playerA.id;
  if (bDone && !aDone) return playerB.id;

  const aTime = playerA.finishTime ?? Number.POSITIVE_INFINITY;
  const bTime = playerB.finishTime ?? Number.POSITIVE_INFINITY;
  if (aTime + 0.02 < bTime) return playerA.id;
  if (bTime + 0.02 < aTime) return playerB.id;

  const aWpm = playerA.wpm ?? 0;
  const bWpm = playerB.wpm ?? 0;
  if (aWpm !== bWpm) return aWpm > bWpm ? playerA.id : playerB.id;

  const aAcc = playerA.accuracy ?? 0;
  const bAcc = playerB.accuracy ?? 0;
  if (aAcc !== bAcc) return aAcc > bAcc ? playerA.id : playerB.id;

  return playerA.id;
}

export const DUEL_TEXTS: DuelTextItem[] = [
  // Sprint
  {
    id: 'sprint_1',
    title: 'Éclair Sprint',
    category: 'sprint',
    categoryLabel: 'Sprint Éclair',
    content: "La rapidité sans la précision n'est que précipitation. Gardez vos doigts posés sur la ligne de repos et trouvez votre tempo.",
    charCount: 131,
    estimatedSeconds: 25
  },
  {
    id: 'sprint_2',
    title: 'Rythme & Souplesse',
    category: 'sprint',
    categoryLabel: 'Sprint Éclair',
    content: "Frappez chaque touche avec assurance, comme les touches d'un piano. Le regard fixe sur l'écran, les mains détendues.",
    charCount: 119,
    estimatedSeconds: 22
  },
  {
    id: 'sprint_3',
    title: 'Ligne Droite',
    category: 'sprint',
    categoryLabel: 'Sprint Éclair',
    content: "Une frappe franche libère l'esprit. Accélérez sur les mots simples et respirez profondément.",
    charCount: 93,
    estimatedSeconds: 18
  },

  // Standard
  {
    id: 'standard_1',
    title: 'Le Défi de la Constance',
    category: 'standard',
    categoryLabel: 'Course Standard',
    content: "La dactylographie est un art de la régularité. Ce n'est pas le coureur le plus brutal qui franchit la ligne en tête, mais celui qui commet le moins d'erreurs et maintient une cadence fluide du premier au dernier mot.",
    charCount: 225,
    estimatedSeconds: 40
  },
  {
    id: 'standard_2',
    title: 'Synapses Digitales',
    category: 'standard',
    categoryLabel: 'Course Standard',
    content: "Chaque caractère envoyé dans la mémoire tampon est le fruit d'un réflexe conditionné. Avec la pratique, les lettres se transforment en mots, puis en idées directes sans aucune friction entre l'esprit et l'écran.",
    charCount: 223,
    estimatedSeconds: 42
  },
  {
    id: 'standard_3',
    title: 'Légèreté & Vitesse',
    category: 'standard',
    categoryLabel: 'Course Standard',
    content: "La vitesse découle naturellement de la fluidité. Plus vos gestes sont économes et souples, plus la cadence s'élève sans effort. La régularité du rythme devance toujours l'agitation.",
    charCount: 181,
    estimatedSeconds: 34
  },

  // Littéraire
  {
    id: 'literary_1',
    title: 'Le Petit Prince (Saint-Exupéry)',
    category: 'literary',
    categoryLabel: 'Défi Littéraire',
    content: "On ne voit bien qu'avec le coeur. L'essentiel est invisible pour les yeux. C'est le temps que tu as perdu pour ta rose qui fait ta rose si importante. Les hommes ont oublié cette vérité.",
    charCount: 184,
    estimatedSeconds: 35
  },
  {
    id: 'literary_2',
    title: 'Vingt Mille Lieues (Jules Verne)',
    category: 'literary',
    categoryLabel: 'Défi Littéraire',
    content: "La mer est le vaste réservoir de la nature. C'est pour ainsi dire par la mer que le globe a commencé, et qui sait s'il ne finira pas par elle ! Là est la suprême tranquillité.",
    charCount: 178,
    estimatedSeconds: 35
  },
  {
    id: 'literary_3',
    title: 'Cyrano de Bergerac (Rostand)',
    category: 'literary',
    categoryLabel: 'Défi Littéraire',
    content: "Moi, c'est moralement que j'ai mes élégances. Je ne sors pas avec une négligence qu'on n'a pas lavée, un scrupule aux yeux demi-clos, ni des rougeurs d'honneur fripé.",
    charCount: 168,
    estimatedSeconds: 32
  },

  // Tech & Innovation
  {
    id: 'tech_1',
    title: 'L’Ère Numérique',
    category: 'tech',
    categoryLabel: 'Culture Tech',
    content: "L'intelligence artificielle et les réseaux mondiaux redéfinissent la transmission du savoir. L'écriture au clavier reste le pont le plus direct entre la pensée humaine et la création informatique.",
    charCount: 198,
    estimatedSeconds: 36
  },
  {
    id: 'tech_2',
    title: 'Architecture & Données',
    category: 'tech',
    categoryLabel: 'Culture Tech',
    content: "Dans un système distribué, la vitesse de propagation et la tolérance aux pannes garantissent la stabilité globale. Chaque instruction bien structurée produit une mécanique limpide et durable.",
    charCount: 194,
    estimatedSeconds: 36
  }
];

export function getDuelText(
  category?: DuelCategory,
  layout: KeyboardLayoutType = 'azerty',
  excludeId?: string
): DuelTextItem {
  let filtered = category ? DUEL_TEXTS.filter(t => t.category === category) : [...DUEL_TEXTS];
  if (excludeId && filtered.length > 1) {
    const withoutCurrent = filtered.filter(t => t.id !== excludeId);
    if (withoutCurrent.length > 0) filtered = withoutCurrent;
  }
  const randomItem = filtered[Math.floor(Math.random() * filtered.length)] || DUEL_TEXTS[0];
  if (layout === 'qwerty') {
    return {
      ...randomItem,
      content: sanitizeForQwerty(randomItem.content)
    };
  }
  return randomItem;
}

export function generateRoomCode(): string {
  const prefixes = ['DUEL', 'RACE', 'FAST', 'VOLT', 'APEX', 'FLUX', 'ZOOM', 'FIRE'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

// Bot competitor profiles
export const BOT_PROFILES = [
  { difficulty: 'easy' as const, name: 'Claviotin (Novice)', wpm: 35, variance: 4, accuracy: 94, avatar: '🤖' },
  { difficulty: 'medium' as const, name: 'CyberTypist (Intermédiaire)', wpm: 58, variance: 5, accuracy: 96, avatar: '⚡' },
  { difficulty: 'hard' as const, name: 'Phantom racer (Expert)', wpm: 84, variance: 6, accuracy: 98, avatar: '🏎️' },
  { difficulty: 'expert' as const, name: 'Quantum Core (Maître)', wpm: 110, variance: 5, accuracy: 99, avatar: '🔥' },
];

// Helper to recursively remove or replace undefined values so Firestore never throws unsupported field value error
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      sanitized[key] = null;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForFirestore(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

// Create a new Duel in Firestore
export async function createFirestoreDuel(params: {
  creator: { id: string; name: string; photo?: string | null };
  category: DuelCategory;
  layout: KeyboardLayoutType;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}): Promise<string> {
  const chosenText = getDuelText(params.category, params.layout);
  const roomCode = generateRoomCode();
  const now = new Date().toISOString();
  const player1 = createFreshPlayer(params.creator);

  let player2: DuelPlayer | null = null;
  let botTargetWpm: number | null = null;
  let botDiff: 'easy' | 'medium' | 'hard' | 'expert' | null = null;

  if (params.isBot) {
    botDiff = params.botDifficulty || 'medium';
    const bot = BOT_PROFILES.find(b => b.difficulty === botDiff) || BOT_PROFILES[1];
    botTargetWpm = bot.wpm;
    player2 = createFreshPlayer(
      { id: `bot_${bot.difficulty}`, name: bot.name, photo: null },
      true
    );
    player2.wpm = bot.wpm;
    player2.accuracy = bot.accuracy;
  }

  const rawRoomData = {
    code: roomCode,
    textId: chosenText.id,
    textTitle: chosenText.title,
    textContent: chosenText.content,
    textFingerprint: textFingerprint(chosenText.content),
    category: chosenText.category,
    layout: params.layout,
    status: params.isBot ? 'ready' : 'waiting',
    createdAt: now,
    round: 1,
    player1,
    player2: player2 || null,
    winnerId: null,
    firstFinisherId: null,
    finishDeadlineAt: null,
    isBot: Boolean(params.isBot),
    botDifficulty: botDiff,
    botTargetWpm: botTargetWpm,
    countdown: null,
    startTime: null,
    raceStartsAt: null
  };

  const roomData = sanitizeForFirestore(rawRoomData);
  const path = 'duels';

  try {
    const docRef = await addDoc(collection(db, path), roomData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Join an existing duel room by its 6-character code OR document ID
export async function joinFirestoreDuelByCode(
  code: string,
  joiningPlayer: { id: string; name: string; photo?: string | null }
): Promise<string> {
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '-');
  const path = 'duels';

  try {
    let duelDoc: any = null;

    // 1. Try search by room code
    const q = query(
      collection(db, path),
      where('code', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      duelDoc = snap.docs[0];
    }

    // 2. If not found by room code, try direct Firestore document ID
    if (!duelDoc && code.trim().length > 10) {
      const directRef = doc(db, path, code.trim());
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        duelDoc = directSnap;
      }
    }

    if (!duelDoc) {
      throw new Error(`Aucun duel trouvé avec le code "${cleanCode}". Vérifiez le code fourni.`);
    }

    const duelData = duelDoc.data() as DuelRoom;

    // Check if player is already player 1
    if (duelData.player1.id === joiningPlayer.id) {
      return duelDoc.id;
    }

    // Check if player is already player 2
    if (duelData.player2 && duelData.player2.id === joiningPlayer.id) {
      return duelDoc.id;
    }

    // If slot 2 is already occupied by someone else and match already underway
    if (duelData.player2 && duelData.player2.id !== joiningPlayer.id && duelData.status !== 'waiting') {
      throw new Error("Ce salon de duel est déjà complet ou la course a déjà débuté.");
    }

    const player2 = createFreshPlayer({
      id: joiningPlayer.id,
      name: joiningPlayer.name || 'Challenger',
      photo: joiningPlayer.photo || null
    });

    await updateDoc(doc(db, path, duelDoc.id), {
      player2,
      status: 'ready'
    });

    return duelDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Subscribe in real-time to a specific duel
export function subscribeToDuel(
  duelId: string,
  onUpdate: (room: DuelRoom | null) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'duels', duelId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ id: snap.id, ...(snap.data() as Omit<DuelRoom, 'id'>) });
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `duels/${duelId}`);
      if (onError) onError(err);
    }
  );
}

// Subscribe to public open duels waiting for an opponent (no composite index needed)
export function subscribeToOpenDuels(
  onUpdate: (rooms: DuelRoom[]) => void
): () => void {
  const path = 'duels';
  // Query without orderBy('createdAt') to completely avoid composite index requirement
  const q = query(
    collection(db, path),
    where('status', '==', 'waiting'),
    limit(25)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const duels = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<DuelRoom, 'id'>)
      }));
      // Sort in memory by createdAt descending
      duels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(duels.slice(0, 10));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// Update player's real-time live racing metrics
export async function updatePlayerRaceProgress(
  duelId: string,
  playerRole: 'player1' | 'player2',
  stats: Partial<DuelPlayer>
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    const updateObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(stats)) {
      if (val !== undefined) {
        updateObj[`${playerRole}.${key}`] = val;
      }
    }
    if (Object.keys(updateObj).length > 0) {
      await updateDoc(docRef, updateObj);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

// Set a player ready
export async function setPlayerReadyStatus(
  duelId: string,
  playerRole: 'player1' | 'player2',
  ready: boolean
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await updateDoc(docRef, {
      [`${playerRole}.ready`]: ready
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

export async function startDuelCountdown(duelId: string): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'ready') return;
      if (!data.player1?.ready || !data.player2?.ready) return;
      transaction.update(docRef, {
        status: 'starting',
        countdown: 3,
        raceStartsAt: Date.now() + 3800,
        startTime: null,
        winnerId: null,
        firstFinisherId: null,
        finishDeadlineAt: null
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

export async function launchDuelRace(duelId: string, actualStartTime?: number): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'starting' && data.status !== 'ready') return;
      transaction.update(docRef, {
        status: 'in_progress',
        startTime: actualStartTime || data.raceStartsAt || Date.now()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

function applyPlayerStats(
  prefix: 'player1' | 'player2',
  stats: Partial<DuelPlayer>
): Record<string, unknown> {
  const updateObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(stats)) {
    if (val !== undefined) {
      updateObj[`${prefix}.${key}`] = val;
    }
  }
  return updateObj;
}

export async function reportPlayerFinished(
  duelId: string,
  playerRole: 'player1' | 'player2',
  finalPlayerStats: Partial<DuelPlayer>
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status === 'cancelled') return;

      const me = playerRole === 'player1' ? data.player1 : data.player2;
      const opponent = playerRole === 'player1' ? data.player2 : data.player1;
      if (!me) return;
      if (me.finished && data.status === 'finished') return;

      const mergedMe: DuelPlayer = {
        ...me,
        ...finalPlayerStats,
        finished: true,
        progress: 100
      };

      const updates: Record<string, unknown> = {
        ...applyPlayerStats(playerRole, {
          ...finalPlayerStats,
          finished: true,
          progress: 100,
          cursorIndex: finalPlayerStats.cursorIndex ?? data.textContent.length
        })
      };

      if (!opponent) {
        updates.status = 'finished';
        updates.winnerId = me.id;
        updates.firstFinisherId = data.firstFinisherId || me.id;
        transaction.update(docRef, updates);
        return;
      }

      if (opponent.finished) {
        const mergedOpponent: DuelPlayer = { ...opponent, finished: true };
        updates.status = 'finished';
        updates.winnerId = resolveWinner(mergedMe, mergedOpponent);
        updates.firstFinisherId = data.firstFinisherId || me.id;
        updates.finishDeadlineAt = null;
      } else {
        updates.firstFinisherId = data.firstFinisherId || me.id;
        updates.winnerId = data.winnerId || me.id;
        updates.finishDeadlineAt = data.finishDeadlineAt || Date.now() + FINISH_GRACE_MS;
      }

      transaction.update(docRef, updates);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

export async function finishDuelRoom(
  duelId: string,
  _winnerId: string,
  playerRole: 'player1' | 'player2',
  finalPlayerStats: Partial<DuelPlayer>
): Promise<void> {
  await reportPlayerFinished(duelId, playerRole, finalPlayerStats);
}

export async function finalizeDuelIfDeadlinePassed(duelId: string): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'in_progress') return;
      if (!data.finishDeadlineAt || Date.now() < data.finishDeadlineAt) return;

      const p1 = data.player1;
      const p2 = data.player2;
      if (!p1 || !p2) return;
      if (!p1.finished && !p2.finished) return;

      transaction.update(docRef, {
        status: 'finished',
        winnerId: resolveWinner(
          { ...p1, finished: Boolean(p1.finished) },
          { ...p2, finished: Boolean(p2.finished) }
        ),
        finishDeadlineAt: null
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

function rematchResetPayload(
  newText: DuelTextItem,
  layout: KeyboardLayoutType,
  isBotMatch: boolean,
  currentRound: number
): Record<string, unknown> {
  return {
    status: 'ready',
    textId: newText.id,
    textTitle: newText.title,
    textContent: newText.content,
    textFingerprint: textFingerprint(newText.content),
    category: newText.category,
    layout,
    round: currentRound + 1,
    winnerId: null,
    firstFinisherId: null,
    finishDeadlineAt: null,
    countdown: null,
    startTime: null,
    raceStartsAt: null,
    'player1.ready': false,
    'player1.rematchReady': false,
    'player1.progress': 0,
    'player1.cursorIndex': 0,
    'player1.wpm': 0,
    'player1.rawWpm': 0,
    'player1.accuracy': 100,
    'player1.errors': 0,
    'player1.correctChars': 0,
    'player1.totalKeystrokes': 0,
    'player1.finished': false,
    'player1.finishTime': null,
    'player2.ready': isBotMatch,
    'player2.rematchReady': false,
    'player2.progress': 0,
    'player2.cursorIndex': 0,
    'player2.wpm': 0,
    'player2.rawWpm': 0,
    'player2.accuracy': 100,
    'player2.errors': 0,
    'player2.correctChars': 0,
    'player2.totalKeystrokes': 0,
    'player2.finished': false,
    'player2.finishTime': null
  };
}

export async function rematchDuelRoom(
  duelId: string,
  category: DuelCategory,
  layout: KeyboardLayoutType,
  isBotMatch: boolean = false
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'finished' && data.status !== 'cancelled') return;
      const lockedLayout = data.layout || layout;
      const lockedCategory = data.category || category;
      const newText = getDuelText(lockedCategory, lockedLayout, data.textId);
      transaction.update(docRef, rematchResetPayload(newText, lockedLayout, isBotMatch, data.round || 1));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

export async function requestRematch(
  duelId: string,
  playerRole: 'player1' | 'player2',
  category: DuelCategory,
  layout: KeyboardLayoutType,
  isBotMatch: boolean = false
): Promise<void> {
  if (isBotMatch) {
    await rematchDuelRoom(duelId, category, layout, true);
    return;
  }

  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'finished') return;

      const already = playerRole === 'player1' ? data.player1?.rematchReady : data.player2?.rematchReady;
      const opponentReady = playerRole === 'player1' ? data.player2?.rematchReady : data.player1?.rematchReady;

      const lockedLayout = data.layout || layout;
      const lockedCategory = data.category || category;

      if (already && opponentReady) {
        const newText = getDuelText(lockedCategory, lockedLayout, data.textId);
        transaction.update(docRef, rematchResetPayload(newText, lockedLayout, false, data.round || 1));
        return;
      }

      if (opponentReady) {
        const newText = getDuelText(lockedCategory, lockedLayout, data.textId);
        transaction.update(docRef, rematchResetPayload(newText, lockedLayout, false, data.round || 1));
        return;
      }

      transaction.update(docRef, {
        [`${playerRole}.rematchReady`]: true
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

export async function tryStartRematch(
  duelId: string,
  category: DuelCategory,
  layout: KeyboardLayoutType
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as DuelRoom;
      if (data.status !== 'finished') return;
      if (!data.player1?.rematchReady || !data.player2?.rematchReady) return;
      const lockedLayout = data.layout || layout;
      const lockedCategory = data.category || category;
      const newText = getDuelText(lockedCategory, lockedLayout, data.textId);
      transaction.update(docRef, rematchResetPayload(newText, lockedLayout, Boolean(data.isBot), data.round || 1));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `duels/${duelId}`);
  }
}

// Leave or cancel room handler: notify the opponent and terminate the duel
export async function leaveDuelRoom(
  duelId: string,
  playerRole: 'player1' | 'player2',
  playerInfo?: { id: string; name: string }
): Promise<void> {
  const docRef = doc(db, 'duels', duelId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as DuelRoom;

    // Determine the player who cancelled
    const cancellingPlayer = playerRole === 'player1' ? data.player1 : data.player2;
    const cancellerName = playerInfo?.name || cancellingPlayer?.name || (playerRole === 'player1' ? "L'hôte" : "L'adversaire");
    const cancellerId = playerInfo?.id || cancellingPlayer?.id || 'unknown';

    // If already finished or already cancelled, no update needed
    if (data.status === 'finished' || data.status === 'cancelled') {
      return;
    }

    // If player1 leaves while waiting for someone, cancel the room
    if (playerRole === 'player1' && data.status === 'waiting') {
      await updateDoc(docRef, {
        status: 'cancelled',
        cancelledBy: {
          id: cancellerId,
          name: cancellerName,
          role: playerRole
        }
      });
      return;
    }

    // In any active phase (ready, starting, in_progress, waiting with 2 players)
    // When ANY participant leaves or cancels, mark room as 'cancelled' with canceller details
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledBy: {
        id: cancellerId,
        name: cancellerName,
        role: playerRole
      }
    });
  } catch (err) {
    console.warn('Error leaving duel:', err);
  }
}
