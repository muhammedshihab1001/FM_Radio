/**
 * Industrial Stream Resolver
 * 
 * Handles playlist files (.m3u, .pls) and resolves them to direct stream URLs.
 * Also handles protocol checking and basic token normalization.
 */

export async function resolveStreamUrl(url: string): Promise<string> {
  if (!url) return '';

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();

  // If it's a known playlist format, we need to fetch and parse it
  if (ext === 'm3u' || ext === 'pls') {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, { 
        signal: controller.signal, 
        // @ts-ignore - Modern browser optimization
        priority: 'high' 
      } as any);
      clearTimeout(id);
      
      const text = await response.text();
      
      if (ext === 'm3u') {
        return parseM3U(text) || url;
      } else if (ext === 'pls') {
        return parsePLS(text) || url;
      }
    } catch (e) {
      console.warn('Stream resolution failed, falling back to original URL:', e);
      return url;
    }
  }

  return url;
}

function parseM3U(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      return trimmed;
    }
  }
  return null;
}

function parsePLS(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('file1=')) {
      return trimmed.split('=')[1].trim();
    }
  }
  return null;
}

export function isMixedContent(url: string): boolean {
  if (typeof window === 'undefined') return false;
  const isHttpsSite = window.location.protocol === 'https:';
  const isHttpStream = url.startsWith('http:');
  return isHttpsSite && isHttpStream;
}

/**
 * Senior Engineer Hack: Attempts to flip http to https for modern signal locks.
 */
export function upgradeToHttps(url: string): string {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

/**
 * Signal Pre-warming: Injects DNS/TCP handshake hints into the terminal head.
 */
export function injectPreconnect(url: string) {
  if (typeof document === 'undefined' || !url) return;
  try {
    const origin = new URL(url).origin;
    if (document.querySelector(`link[href="${origin}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    console.log(`📡 Signal pre-warmed: ${origin}`);
  } catch (e) {
    // Fail silently on malformed URLs
  }
}

/**
 * Detects if a URL is an HLS (m3u8) stream.
 */
export function isHls(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.m3u8');
}
