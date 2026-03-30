/**
 * Favicon Service - Generate favicon URLs with CORS-safe providers
 */

export class FaviconService {
  static getFaviconUrl(url: string): string | null {
    if (!url) return null;
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      // favicon.im is CORS-friendly and doesn't block PWA/localhost requests
      return `https://favicon.im/${domain}?larger=true`;
    } catch {
      return null;
    }
  }

  /** Returns ordered list of fallback URLs to try in sequence */
  static getFaviconFallbacks(url: string): string[] {
    if (!url) return [];
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return [
        `https://favicon.im/${domain}?larger=true`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://${domain}/favicon.ico`,
      ];
    } catch {
      return [];
    }
  }
}
