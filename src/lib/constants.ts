export type KeyboardLayoutType = 'azerty' | 'qwerty';

export interface Exercise {
  id: string;
  title: string;
  content: string;
  level: string;
  category: string;
}

/**
 * Remove any accented characters for QWERTY compatibility
 */
export function sanitizeForQwerty(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .replace(/['’]/g, "'");
}

/**
 * Cursus AZERTY (Clavier Français avec touches accentuées)
 * 20 Missions réelles, cohérentes, captivantes et grammaticalement soignées
 */
export const EXERCISES_AZERTY: Exercise[] = [
  {
    id: 'intro-1',
    title: 'Mission 1 : Premiers Pas & Mémoire Musculaire',
    content: "Posez vos index sur les touches F et J. Respirez calmement et laissez vos mains trouver leur équilibre naturel sur la rangée de repos.",
    level: 'Débutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'intro-2',
    title: 'Mission 2 : La Rangée Centrale au Travail',
    content: "La régularité est le secret d'une frappe sans effort. Chaque doigt veille sur sa propre colonne avec précision et souplesse.",
    level: 'Débutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'intro-3',
    title: 'Mission 3 : Le Rythme du Dactylographe',
    content: "Ne cherchez pas la précipitation mais la justesse. Un mouvement continu et fluide vous fera gagner en vitesse sans la moindre fatigue.",
    level: 'Débutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'upper-1',
    title: "Mission 4 : L'Envol vers la Rangée Haute",
    content: "Vos doigts montent avec agilité pour atteindre les voyelles. Revenez toujours à votre ligne de repos entre chaque mot prononcé.",
    level: 'Intermédiaire',
    category: 'Rangée Supérieure'
  },
  {
    id: 'upper-2',
    title: "Mission 5 : L'Art du Récit & de l'Écriture",
    content: "Écrire sans regarder son clavier libère l'imagination. Les pensées glissent directement sur la page sans aucun obstacle entre l'esprit et l'écran.",
    level: 'Intermédiaire',
    category: 'Rangée Supérieure'
  },
  {
    id: 'lower-1',
    title: 'Mission 6 : La Descente vers les Consonnes',
    content: "Une brise marine traverse le port au lever du jour. Les navires marchands s'apprêtent à lever l'ancre vers de nouveaux horizons lointains.",
    level: 'Intermédiaire',
    category: 'Rangée Inférieure'
  },
  {
    id: 'lower-2',
    title: 'Mission 7 : Coordination Complète des Deux Mains',
    content: "La main gauche et la main droite travaillent de concert, comme les deux mains d'un pianiste jouant une mélodie harmonieuse sur son instrument.",
    level: 'Intermédiaire',
    category: 'Coordination'
  },
  {
    id: 'lit-1',
    title: 'Mission 8 : Le Petit Prince',
    content: "On ne voit bien qu'avec le coeur. L'essentiel est invisible pour les yeux, répéta le petit prince afin de s'en souvenir fidèlement.",
    level: 'Avancé',
    category: 'Littérature'
  },
  {
    id: 'lit-2',
    title: 'Mission 9 : Vingt Mille Lieues sous les Mers',
    content: "La mer est un immense réservoir de vie et de liberté où l'homme n'est jamais seul. Là règne une suprême et éternelle tranquillité.",
    level: 'Avancé',
    category: 'Littérature'
  },
  {
    id: 'lit-3',
    title: 'Mission 10 : Cyrano de Bergerac',
    content: "C'est un roc, c'est un pic, c'est un cap ! Que dis-je, c'est un cap ? C'est une péninsule ! La verve et le panache illuminent chaque phrase.",
    level: 'Avancé',
    category: 'Littérature'
  },
  {
    id: 'lit-4',
    title: 'Mission 11 : Les Misérables',
    content: "Rien n'est plus puissant qu'une idée dont l'heure est venue. Même la nuit la plus sombre prendra fin et le soleil brillera à nouveau.",
    level: 'Expert',
    category: 'Littérature'
  },
  {
    id: 'sci-1',
    title: "Mission 12 : L'Épopée Spatiale Apollo",
    content: "C'est un petit pas pour un homme, mais un bond de géant pour l'humanité. Les étoiles et les galaxies nous appellent vers l'infini.",
    level: 'Intermédiaire',
    category: 'Science & Cosmos'
  },
  {
    id: 'sci-2',
    title: "Mission 13 : Les Mystères de l'Océan",
    content: "Dans les profondeurs abyssales des fosses océaniques, des créatures bioluminescentes scintillent comme des constellations sous-marines.",
    level: 'Intermédiaire',
    category: 'Science & Nature'
  },
  {
    id: 'nature-1',
    title: "Mission 14 : La Forêt Primaire d'Amazonie",
    content: "Véritable poumon vert de notre planète, cette forêt millénaire abrite une biodiversité unique au monde qu'il est indispensable de préserver.",
    level: 'Intermédiaire',
    category: 'Nature & Écologie'
  },
  {
    id: 'history-1',
    title: "Mission 15 : Les Pionniers de l'Aviation",
    content: "Traverser les tempêtes à bord d'un monoplan de toile exigeait un courage absolu. Ces héros de l'Aéropostale ont ouvert les routes du monde.",
    level: 'Avancé',
    category: 'Histoire & Aventure'
  },
  {
    id: 'phi-1',
    title: 'Mission 16 : Pensées pour Moi-Même (Marc Aurèle)',
    content: "Que la force me soit donnée de supporter ce qui ne peut être changé, et le courage d'agir sur les choses qui dépendent de ma volonté.",
    level: 'Expert',
    category: 'Philosophie'
  },
  {
    id: 'art-1',
    title: 'Mission 17 : Le Génie de Léonard de Vinci',
    content: "La simplicité est la sophistication suprême. En observant la nature et le vol des faucons, il imagina le futur avec des siècles d'avance.",
    level: 'Expert',
    category: 'Arts & Culture'
  },
  {
    id: 'music-1',
    title: 'Mission 18 : La Neuvième Symphonie de Beethoven',
    content: "Composée dans le silence complet de sa surdité, cette oeuvre magistrale célèbre la fraternité entre tous les êtres humains avec passion.",
    level: 'Expert',
    category: 'Musique & Harmonie'
  },
  {
    id: 'speed-1',
    title: 'Mission 19 : Le Défi de Haute Vélocité',
    content: "Fixez l'écran sans baisser les yeux. La cadence s'accélère, les syllabes fusent avec fluidité et vos doigts dansent sur le clavier.",
    level: 'Expert',
    category: 'Haute Vitesse'
  },
  {
    id: 'master-1',
    title: 'Mission 20 : Le Grand Prix du Maître Dactylographe',
    content: "La parfaite communion entre la pensée et la machine est accomplie. Une précision chirurgicale, un rythme imperturbable et zéro erreur.",
    level: 'Maître',
    category: 'Maître Dactylo'
  }
];

/**
 * Cursus QWERTY (Clavier US/International : Garanti STRICTEMENT SANS AUCUN ACCENT)
 * 20 Missions réelles, cohérentes, captivantes et 100% compatibles clavier US
 */
export const EXERCISES_QWERTY: Exercise[] = [
  {
    id: 'intro-1',
    title: 'Mission 1 : Premiers Pas & Memoire Musculaire',
    content: "Posez vos index sur les touches F et J. Respirez dans le calme et laissez vos mains trouver leur repos naturel sur la ligne centrale.",
    level: 'Debutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'intro-2',
    title: 'Mission 2 : La Rangee Centrale au Travail',
    content: "La constance est la cle d'une frappe sans effort. Chaque doigt veille sur sa propre colonne avec precision et souplesse.",
    level: 'Debutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'intro-3',
    title: 'Mission 3 : Le Rythme du Dactylographe',
    content: "Ne cherchez pas la vitesse pure mais la justesse. Un mouvement continu et fluide vous fera progresser rapidement sans fatigue.",
    level: 'Debutant',
    category: 'Initiation & Bases'
  },
  {
    id: 'upper-1',
    title: "Mission 4 : L'Envol vers la Rangee Haute",
    content: "Vos doigts montent avec souplesse pour toucher les lettres du haut. Revenez toujours au repos entre chaque mot sans vous presser.",
    level: 'Intermediaire',
    category: 'Rangee Superieure'
  },
  {
    id: 'upper-2',
    title: "Mission 5 : L'Art du Recit & de l'Ecriture",
    content: "Ecrire sans regarder les touches donne des ailes. Les mots glissent directement sur la page sans aucun temps mort entre esprit et ecran.",
    level: 'Intermediaire',
    category: 'Rangee Superieure'
  },
  {
    id: 'lower-1',
    title: 'Mission 6 : La Descente vers les Consonnes',
    content: "Une brise marine traverse le port au lever du jour. Les navires marchands voguent vers le grand large sous un ciel bleu pur.",
    level: 'Intermediaire',
    category: 'Rangee Inferieure'
  },
  {
    id: 'lower-2',
    title: 'Mission 7 : Coordination Complete des Deux Mains',
    content: "La main gauche et la main droite jouent ensemble, comme les deux mains d'un pianiste sur un clavier de concert plein de talent.",
    level: 'Intermediaire',
    category: 'Coordination'
  },
  {
    id: 'lit-1',
    title: 'Mission 8 : Le Petit Prince',
    content: "On ne voit bien qu'avec le coeur. L'essentiel est invisible pour les yeux, dit le petit prince afin de ne rien oublier de sa rose.",
    level: 'Avance',
    category: 'Litterature'
  },
  {
    id: 'lit-2',
    title: 'Mission 9 : Vingt Mille Lieues sous les Mers',
    content: "La mer est un vaste empire ou l'homme est libre. Dans le calme des grands fonds marins, le capitaine Nemo contemple l'immensite.",
    level: 'Avance',
    category: 'Litterature'
  },
  {
    id: 'lit-3',
    title: 'Mission 10 : Le Grand Pangramme du Juge',
    content: "Portez ce vieux whisky au juge blond qui fume sans fin un grand cigare dans le salon sombre et silencieux de la vieille demeure.",
    level: 'Avance',
    category: 'Litterature'
  },
  {
    id: 'lit-4',
    title: 'Mission 11 : Les Miserables',
    content: "Rien n'est plus fort qu'une idee dont l'heure arrive. La nuit la plus noire finira toujours par laisser place a la lumiere du jour.",
    level: 'Expert',
    category: 'Litterature'
  },
  {
    id: 'sci-1',
    title: "Mission 12 : L'Epopee Spatiale Apollo",
    content: "C'est un petit pas pour un homme, mais un bond immense pour l'humanite. La Lune scintille au loin dans la nuit du grand cosmos.",
    level: 'Intermediaire',
    category: 'Science & Cosmos'
  },
  {
    id: 'sci-2',
    title: 'Mission 13 : Les Mysteres des Profondeurs',
    content: "Dans les fosses marines, de surprenants poissons brillent dans le noir complet. La vie sauvage sait s'adapter a toutes les pressions.",
    level: 'Intermediaire',
    category: 'Science & Nature'
  },
  {
    id: 'nature-1',
    title: 'Mission 14 : La Foret Sauvage',
    content: "Les grands arbres millenaires protegent une faune rare et precieuse. Nous devons preserver ce patrimoine vivant pour le futur.",
    level: 'Intermediaire',
    category: 'Nature & Ecologie'
  },
  {
    id: 'history-1',
    title: 'Mission 15 : Les Explorateurs Polaires',
    content: "Affronter le vent blanc du pole sud exigeait une volonte de fer. Ces aventuriers intrépides ont brave le froid pour faire avancer la science.",
    level: 'Avance',
    category: 'Histoire & Aventure'
  },
  {
    id: 'phi-1',
    title: 'Mission 16 : Pensees Stoiciennes',
    content: "Ce qui trouble les hommes, ce ne sont pas les choses, mais les jugements et les peurs qu'ils portent sur ces memes choses du monde.",
    level: 'Expert',
    category: 'Philosophie'
  },
  {
    id: 'art-1',
    title: 'Mission 17 : Leonard de Vinci',
    content: "La simplicite est le sommet de l'art. En observant la nature et les oiseaux, il inventa le futur des siecles avant son epoque.",
    level: 'Expert',
    category: 'Arts & Culture'
  },
  {
    id: 'music-1',
    title: 'Mission 18 : La Symphonie Triomphale',
    content: "Dans le silence de sa surdite, Beethoven composa une musique prodigieuse qui fait vibrer les coeurs du monde entier sans faiblir.",
    level: 'Expert',
    category: 'Musique & Harmonie'
  },
  {
    id: 'speed-1',
    title: 'Mission 19 : Le Defi Haute Velocite',
    content: "Fixez le texte sans ciller. Vos doigts frappent sans ralentir et le compteur de mots par minute grimpe vers des sommets eclatants.",
    level: 'Expert',
    category: 'Haute Vitesse'
  },
  {
    id: 'master-1',
    title: 'Mission 20 : Le Grand Prix du Maitre Dactylo',
    content: "Le vrai dactylographe ne baisse jamais les yeux vers le clavier. Sa vue reste ancree sur le texte avec assurance et precision totale.",
    level: 'Maitre',
    category: 'Maitre Dactylo'
  }
];

// Helper to get exercises for layout
export function getExercises(layout: KeyboardLayoutType | string = 'azerty'): Exercise[] {
  if (layout === 'qwerty') {
    return EXERCISES_QWERTY;
  }
  return EXERCISES_AZERTY;
}

// Default export for backward compatibility
export const EXERCISES = EXERCISES_AZERTY;

/**
 * Keyboard Rows for AZERTY (Standard French)
 */
export const KEYBOARD_LAYOUT_AZERTY = [
  ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '=', 'Backspace'],
  ['Tab', 'a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '^', '$'],
  ['Caps', 'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'ù', 'Enter'],
  ['Shift', 'w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!', 'Shift'],
  ['Space']
];

/**
 * Keyboard Rows for QWERTY (Standard US/International)
 */
export const KEYBOARD_LAYOUT_QWERTY = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Space']
];

export function getKeyboardLayout(layout: KeyboardLayoutType | string = 'azerty'): string[][] {
  return layout === 'qwerty' ? KEYBOARD_LAYOUT_QWERTY : KEYBOARD_LAYOUT_AZERTY;
}

export const KEYBOARD_LAYOUT = KEYBOARD_LAYOUT_AZERTY;

/**
 * Recommended Finger mapping for AZERTY
 */
export const FINGER_MAP_AZERTY: Record<string, string> = {
  // Row 0
  '&': 'left-pinky', '1': 'left-pinky',
  'é': 'left-ring', '2': 'left-ring',
  '"': 'left-middle', '3': 'left-middle',
  "'": 'left-index', '4': 'left-index',
  '(': 'left-index', '5': 'left-index',
  '-': 'right-index', '6': 'right-index',
  'è': 'right-index', '7': 'right-index',
  '_': 'right-middle', '8': 'right-middle',
  'ç': 'right-ring', '9': 'right-ring',
  'à': 'right-pinky', '0': 'right-pinky',
  ')': 'right-pinky',
  '=': 'right-pinky',
  // Row 1 (AZERTY: A Z E R T Y U I O P ^ $)
  'a': 'left-pinky',
  'z': 'left-ring',
  'e': 'left-middle',
  'r': 'left-index',
  't': 'left-index',
  'y': 'right-index',
  'u': 'right-index',
  'i': 'right-middle',
  'o': 'right-ring',
  'p': 'right-pinky',
  '^': 'right-pinky',
  '$': 'right-pinky',
  // Row 2 (AZERTY: Q S D F G H J K L M Ù)
  'q': 'left-pinky',
  's': 'left-ring',
  'd': 'left-middle',
  'f': 'left-index',
  'g': 'left-index',
  'h': 'right-index',
  'j': 'right-index',
  'k': 'right-middle',
  'l': 'right-ring',
  'm': 'right-pinky',
  'ù': 'right-pinky',
  // Row 3 (AZERTY: W X C V B N , ; : !)
  'w': 'left-pinky',
  'x': 'left-ring',
  'c': 'left-middle',
  'v': 'left-index',
  'b': 'left-index',
  'n': 'right-index',
  ',': 'right-middle',
  ';': 'right-ring',
  ':': 'right-pinky',
  '!': 'right-pinky',
  '.': 'right-ring',
  // Space
  ' ': 'thumb'
};

/**
 * Recommended Finger mapping for QWERTY
 */
export const FINGER_MAP_QWERTY: Record<string, string> = {
  // Row 0
  '`': 'left-pinky', '~': 'left-pinky', '1': 'left-pinky', '!': 'left-pinky',
  '2': 'left-ring', '@': 'left-ring',
  '3': 'left-middle', '#': 'left-middle',
  '4': 'left-index', '$': 'left-index', '5': 'left-index', '%': 'left-index',
  '6': 'right-index', '^': 'right-index', '7': 'right-index', '&': 'right-index',
  '8': 'right-middle', '*': 'right-middle',
  '9': 'right-ring', '(': 'right-ring',
  '0': 'right-pinky', ')': 'right-pinky', '-': 'right-pinky', '_': 'right-pinky', '=': 'right-pinky', '+': 'right-pinky',
  // Row 1 (QWERTY: Q W E R T Y U I O P [ ] \)
  'q': 'left-pinky',
  'w': 'left-ring',
  'e': 'left-middle',
  'r': 'left-index',
  't': 'left-index',
  'y': 'right-index',
  'u': 'right-index',
  'i': 'right-middle',
  'o': 'right-ring',
  'p': 'right-pinky',
  '[': 'right-pinky', '{': 'right-pinky',
  ']': 'right-pinky', '}': 'right-pinky',
  '\\': 'right-pinky', '|': 'right-pinky',
  // Row 2 (QWERTY: A S D F G H J K L ; ')
  'a': 'left-pinky',
  's': 'left-ring',
  'd': 'left-middle',
  'f': 'left-index',
  'g': 'left-index',
  'h': 'right-index',
  'j': 'right-index',
  'k': 'right-middle',
  'l': 'right-ring',
  ';': 'right-pinky', ':': 'right-pinky',
  "'": 'right-pinky', '"': 'right-pinky',
  // Row 3 (QWERTY: Z X C V B N M , . /)
  'z': 'left-pinky',
  'x': 'left-ring',
  'c': 'left-middle',
  'v': 'left-index',
  'b': 'left-index',
  'n': 'right-index',
  'm': 'right-index',
  ',': 'right-middle', '<': 'right-middle',
  '.': 'right-ring', '>': 'right-ring',
  '/': 'right-pinky', '?': 'right-pinky',
  // Space
  ' ': 'thumb'
};

export function getFingerMap(layout: KeyboardLayoutType | string = 'azerty'): Record<string, string> {
  return layout === 'qwerty' ? FINGER_MAP_QWERTY : FINGER_MAP_AZERTY;
}

export const FINGER_MAP = FINGER_MAP_AZERTY;
