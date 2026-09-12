import { GoogleGenAI, Type } from "@google/genai";

export interface AIAssessment {
  suggestedText: string;
  feedback: string;
  focusCharacters: string[];
}

const FALLBACK_ASSESSMENT: AIAssessment = {
  suggestedText: "La pratique régulière est la clé de la maîtrise du clavier.",
  feedback: "Continuez à vous entraîner ! Votre vitesse s'améliorera avec le temps.",
  focusCharacters: []
};

function resolveApiKey(): string {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const raw =
    process.env.GEMINI_API_KEY ||
    viteEnv?.VITE_GEMINI_API_KEY ||
    viteEnv?.GEMINI_API_KEY ||
    "";
  const key = String(raw).trim();
  if (!key || key === "undefined" || key === "MY_GEMINI_API_KEY") {
    return "";
  }
  return key;
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = resolveApiKey();
  if (!apiKey) return null;
  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (error) {
    console.warn("Gemini client unavailable:", error);
    return null;
  }
}

export const analyzePerformance = async (history: any[]): Promise<AIAssessment> => {
  if (history.length === 0) {
    return {
      suggestedText: "Ceci est un test initial pour évaluer votre niveau de base.",
      feedback: "Commencez votre première session pour recevoir des conseils personnalisés !",
      focusCharacters: []
    };
  }

  const ai = getAiClient();
  if (!ai) {
    return FALLBACK_ASSESSMENT;
  }

  const prompt = `L'utilisateur a terminé plusieurs sessions de frappe. Voici son historique récent :
  ${JSON.stringify(history.slice(0, 5))}
  
  En tant que coach de frappe expert, analyse ces données et :
  1. Identifie les caractères ou combinaisons de touches problématiques.
  2. Fournis un court texte d'entraînement (environ 15-20 mots) qui cible ces faiblesses.
  3. Donne un conseil motivant.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedText: { type: Type.STRING, description: "Le texte d'entraînement ciblé" },
            feedback: { type: Type.STRING, description: "Conseil personnalisé" },
            focusCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste des caractères à travailler" }
          },
          required: ["suggestedText", "feedback", "focusCharacters"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return FALLBACK_ASSESSMENT;
  }
};
