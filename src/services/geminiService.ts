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

export const analyzePerformance = async (history: any[]): Promise<AIAssessment> => {
  if (history.length === 0) {
    return {
      suggestedText: "Ceci est un test initial pour évaluer votre niveau de base.",
      feedback: "Commencez votre première session pour recevoir des conseils personnalisés !",
      focusCharacters: []
    };
  }

  try {
    const res = await fetch('/api/analyze-performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.suggestedText && data.feedback) {
      return {
        suggestedText: data.suggestedText,
        feedback: data.feedback,
        focusCharacters: Array.isArray(data.focusCharacters) ? data.focusCharacters : []
      };
    }

    return FALLBACK_ASSESSMENT;
  } catch (error) {
    console.warn("Gemini Analysis API Error:", error);
    return FALLBACK_ASSESSMENT;
  }
};
