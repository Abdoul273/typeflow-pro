export interface AIAssessment {
  suggestedText: string;
  feedback: string;
  focusCharacters: string[];
}

/**
 * Intelligent rule-based typing coach heuristic.
 * Computes personalized feedback, identifies weak finger/key clusters,
 * and generates tailored training exercises based on real performance metrics.
 */
export function generateSmartAssessment(
  history: any[] = [],
  errorKeys: Record<string, number> = {},
  layout: 'azerty' | 'qwerty' = 'azerty'
): AIAssessment {
  const recent = history.slice(0, 5);
  const avgWpm = recent.length > 0
    ? Math.round(recent.reduce((acc, h) => acc + (Number(h.wpm) || 0), 0) / recent.length)
    : 35;
  const avgAcc = recent.length > 0
    ? Math.round(recent.reduce((acc, h) => acc + (Number(h.accuracy) || 0), 0) / recent.length)
    : 95;

  // Identify top error characters
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
    feedback = `Votre vitesse moyenne est de ${avgWpm} MPM, mais votre précision (${avgAcc}%) nécessite de la retenue. Privilégiez la fluidité gestuelle et l'ancrage des mains sur les repères avant d'accélérer.`;
    if (layout === 'qwerty') {
      suggestedText = "keep your hands steady on the home row and press every key with calm precision";
    } else {
      suggestedText = "posez vos doigts avec calme sur la ligne médiane pour assurer chaque touche";
    }
  } else if (avgWpm < 42) {
    feedback = `Très bonne précision (${avgAcc}%) ! Votre socle technique est solide. Concentrez-vous à présent sur le rythme continu et l'anticipation du mot suivant pour franchir les 50 MPM.`;
    if (layout === 'qwerty') {
      suggestedText = "typing smoothly with constant rhythm helps your speed increase naturally day by day";
    } else {
      suggestedText = "enchaînez les mots avec fluidité et régularité pour développer votre vitesse de frappe";
    }
  } else if (avgWpm < 70) {
    feedback = `Excellente cadence à ${avgWpm} MPM avec ${avgAcc}% de précision ! Travaillez la réactivité de vos auriculaires et les liaisons entre touches opposées.`;
    if (layout === 'qwerty') {
      suggestedText = "expert typists maintain perfect balance between speed and precision across complex text";
    } else {
      suggestedText = "les experts développent des automatismes précis sur les enchaînements les plus rapides";
    }
  } else {
    feedback = `Performance remarquable (${avgWpm} MPM, ${avgAcc}% de précision) ! Vous êtes au niveau compétitif. Maintenez cette dextérité sur des textes techniques variés.`;
    if (layout === 'qwerty') {
      suggestedText = "lightning fast fingers execute intricate keystrokes with absolute mastery and flow";
    } else {
      suggestedText = "une vélocité remarquable alliée à une maîtrise totale des touches les plus exigeantes";
    }
  }

  if (topWeakChars.length > 0) {
    feedback += ` Focus prioritaire sur vos touches de friction : [${topWeakChars.join(', ')}].`;
  }

  return {
    suggestedText,
    feedback,
    focusCharacters
  };
}

export const analyzePerformance = async (
  history: any[],
  errorKeys: Record<string, number> = {},
  layout: 'azerty' | 'qwerty' = 'azerty'
): Promise<AIAssessment> => {
  if (!history || history.length === 0) {
    return {
      suggestedText: layout === 'qwerty' 
        ? "quick brown fox jumps over the lazy dog" 
        : "un exercice d'évaluation initiale pour jauger votre vitesse de base",
      feedback: "Complétez votre première session pour recevoir des conseils personnalisés !",
      focusCharacters: layout === 'qwerty' ? ['f', 'j', 'd', 'k'] : ['f', 'j', 'd', 'k']
    };
  }

  try {
    const res = await fetch('/api/analyze-performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        history: history.slice(0, 5),
        errorKeys,
        layout
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.suggestedText && data.feedback) {
        return {
          suggestedText: String(data.suggestedText).trim(),
          feedback: String(data.feedback).trim(),
          focusCharacters: Array.isArray(data.focusCharacters) ? data.focusCharacters : []
        };
      }
    }
  } catch (error) {
    // Graceful silent fallback without noisy error throwing
    console.warn("AI Coach API fallback activated:", error);
  }

  // Fallback to local intelligent diagnostic
  return generateSmartAssessment(history, errorKeys, layout);
};
