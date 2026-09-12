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
  if (!apiKey) return null;
  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (err) {
    console.warn('Gemini client initialization failed:', err);
    return null;
  }
}

// AI performance analysis endpoint
app.post('/api/analyze-performance', async (req, res) => {
  const { history } = req.body || {};

  if (!Array.isArray(history) || history.length === 0) {
    return res.json({
      suggestedText: "Ceci est un test initial pour évaluer votre niveau de base.",
      feedback: "Commencez votre première session pour recevoir des conseils personnalisés !",
      focusCharacters: []
    });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.json({
      suggestedText: "La pratique régulière est la clé de la maîtrise du clavier.",
      feedback: "Continuez à vous entraîner ! Votre vitesse s'améliorera avec le temps.",
      focusCharacters: []
    });
  }

  const prompt = `L'utilisateur a terminé plusieurs sessions de frappe. Voici son historique récent :
${JSON.stringify(history.slice(0, 5))}

En tant que coach de frappe expert, analyse ces données et :
1. Identifie les caractères ou combinaisons de touches problématiques.
2. Fournis un court texte d'entraînement (environ 15-20 mots) qui cible ces faiblesses.
3. Donne un conseil motivant.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedText: { type: Type.STRING, description: "Le texte d'entraînement ciblé" },
            feedback: { type: Type.STRING, description: "Conseil personnalisé" },
            focusCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste des caractères à travailler" }
          },
          required: ['suggestedText', 'feedback', 'focusCharacters']
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return res.json(parsed);
    }
    throw new Error('No response text generated');
  } catch (error) {
    console.error('Gemini Analysis Error on server:', error);
    return res.json({
      suggestedText: "La pratique régulière est la clé de la maîtrise du clavier.",
      feedback: "Continuez à vous entraîner ! Votre vitesse s'améliorera avec le temps.",
      focusCharacters: []
    });
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
