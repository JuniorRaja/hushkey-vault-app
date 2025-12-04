/**
 * Favicon Service - Generate favicon URLs
 */

export class FaviconService {
  static getFaviconUrl(url: string): string | null {
    if (!url) return null;
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (error) {
      return null;
    }
  }
}
