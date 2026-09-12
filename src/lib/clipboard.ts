// Bulletproof copy to clipboard with fallback for iframes and sandboxes
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern navigator.clipboard
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback...', err);
    }
  }

  // 2. Fallback: temporary hidden textarea using document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // For iOS compatibility
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('All clipboard copy methods failed:', fallbackErr);
    return false;
  }
}

// Generate bulletproof direct link to join a duel
export function getDuelShareUrl(roomCode: string): string {
  try {
    let origin = window.location.origin;

    // Google AI Studio environment:
    // ais-dev- URLs are private and will return "Page not found - Check that the URL was entered correctly"
    // to other users or external devices.
    // ais-pre- URLs are the public shared URLs accessible by anyone without authentication!
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }

    // If running in local dev (localhost) without public domain, fallback to the public preview app URL
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `https://ais-pre-3xjoqerj6ewh2iizitwu7o-526846184877.europe-west2.run.app/?duel=${encodeURIComponent(roomCode)}`;
    }

    return `${origin}/?duel=${encodeURIComponent(roomCode)}`;
  } catch {
    return `https://ais-pre-3xjoqerj6ewh2iizitwu7o-526846184877.europe-west2.run.app/?duel=${encodeURIComponent(roomCode)}`;
  }
}

// Native share if supported
export async function shareDuelNative(roomCode: string, duelTitle: string): Promise<boolean> {
  const url = getDuelShareUrl(roomCode);
  const shareData = {
    title: `Duel de frappe TypeFlow Pro : ${duelTitle}`,
    text: `⚡ Viens m'affronter en 1v1 sur TypeFlow Pro ! Entre le code [${roomCode}] ou clique sur ce lien direct :`,
    url
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}
