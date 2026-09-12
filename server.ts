import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (err) {
    console.warn('Gemini client initialization notice:', err);
    return null;
  }
}

/**
 * Intelligent rule-based typing diagnosis
 */
function generateHeuristicAssessment(
  history: any[] = [],
  errorKeys: Record<string, number> = {},
  layout: string = 'azerty'
) {
  const recent = history.slice(0, 5);
  const avgWpm = recent.length > 0
    ? Math.round(recent.reduce((acc, h) => acc + (Number(h.wpm) || 0), 0) / recent.length)
    : 36;
  const avgAcc = recent.length > 0
    ? Math.round(recent.reduce((acc, h) => acc + (Number(h.accuracy) || 0), 0) / recent.length)
    : 95;

  const sortedErrors = Object.entries(errorKeys)
    .filter(([k]) => k.length === 1 && k !== ' ')
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k.toLowerCase());

  const topWeakChars = sortedErrors.slice(0, 4);
  const defaultFocus = layout === 'qwerty' ? ['e', 't', 'a', 'o'] : ['e', 'a', 's', 't'];
  const focusCharacters = topWeakChars.length > 0 ? topWeakChars : defaultFocus;

  let feedback = '';
  let suggestedText = '';

  if (avgAcc < 92) {
    feedback = `Votre vitesse moyenne est de ${avgWpm} MPM, mais votre précision (${avgAcc}%) nécessite de la tempérance. Privilégiez la fluidité gestuelle et l'ancrage des doigts avant d'accélérer.`;
    suggestedText = layout === 'qwerty'
      ? "keep your hands steady on the home row and press every key with calm precision"
      : "posez vos doigts avec calme sur la ligne médiane pour assurer chaque touche";
  } else if (avgWpm < 42) {
    feedback = `Très bonne précision (${avgAcc}%) ! Votre base est solide. Concentrez-vous sur le rythme continu et l'anticipation du mot suivant pour dépasser les 50 MPM.`;
    suggestedText = layout === 'qwerty'
      ? "typing smoothly with constant rhythm helps your speed increase naturally day by day"
      : "enchaînez les mots avec fluidité et régularité pour développer votre vitesse de frappe";
  } else if (avgWpm < 70) {
    feedback = `Excellente cadence à ${avgWpm} MPM avec ${avgAcc}% de précision ! Travaillez la réactivité de vos auriculaires et les combinaisons complexes.`;
    suggestedText = layout === 'qwerty'
      ? "expert typists maintain perfect balance between speed and precision across complex text"
      : "les experts développent des automatismes précis sur les enchaînements les plus rapides";
  } else {
    feedback = `Performance remarquable (${avgWpm} MPM, ${avgAcc}% de précision) ! Vous êtes au niveau d'élite. Maintenez cette dextérité sur des textes variés.`;
    suggestedText = layout === 'qwerty'
      ? "lightning fast fingers execute intricate keystrokes with absolute mastery and flow"
      : "une vélocité remarquable alliée à une maîtrise totale des touches les plus exigeantes";
  }

  if (topWeakChars.length > 0) {
    feedback += ` Focus prioritaire sur vos touches sensibles : [${topWeakChars.join(', ')}].`;
  }

  return {
    suggestedText,
    feedback,
    focusCharacters,
    source: 'smart-heuristic'
  };
}

// In-memory cache to prevent redundant quota usage
const assessmentCache = new Map<string, { data: any; timestamp: number }>();

// AI performance analysis endpoint
app.post('/api/analyze-performance', async (req, res) => {
  const { history = [], errorKeys = {}, layout = 'azerty' } = req.body || {};

  if (!Array.isArray(history) || history.length === 0) {
    return res.json(generateHeuristicAssessment([], errorKeys, layout));
  }

  // Check cache for identical recent history (cached for 60 seconds)
  const cacheKey = `${layout}_${history.length}_${history[0]?.date || ''}_${history[0]?.wpm || 0}`;
  const cached = assessmentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return res.json(cached.data);
  }

  const ai = getAiClient();
  if (!ai) {
    const result = generateHeuristicAssessment(history, errorKeys, layout);
    assessmentCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  }

  const prompt = `L'utilisateur s'entraîne sur un clavier ${layout.toUpperCase()}.
Voici ses 5 dernières sessions de frappe :
${JSON.stringify(history.slice(0, 5))}
Touches ayant enregistré des erreurs : ${JSON.stringify(errorKeys)}

En tant que coach de dactylographie expert :
1. Identifie 2 à 4 caractères ou combinaisons de touches problématiques (en tenant compte de la disposition ${layout.toUpperCase()}).
2. Fournis un court texte d'entraînement d'environ 12 à 18 mots ciblant ces touches (${layout === 'qwerty' ? 'en anglais ou français sans aucun accent' : 'en français'}).
3. Donne un conseil motivant et constructif en 1 à 2 phrases.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedText: { type: Type.STRING, description: "Court texte ciblé" },
            feedback: { type: Type.STRING, description: "Conseil personnalisé du coach" },
            focusCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste des 2 à 4 caractères cibles" }
          },
          required: ['suggestedText', 'feedback', 'focusCharacters']
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      const result = {
        ...parsed,
        source: 'gemini'
      };
      assessmentCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.json(result);
    }
    throw new Error('Empty response from model');
  } catch (error: any) {
    // Log as a harmless warning, avoiding platform crash triggers for quota limits
    console.warn('[Gemini Coach] API quota or connection issue, serving smart diagnostic:', error?.status || error?.message || 'Quota exceeded');
    const fallback = generateHeuristicAssessment(history, errorKeys, layout);
    assessmentCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return res.json(fallback);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
