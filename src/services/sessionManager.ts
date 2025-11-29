/**
 * Session Manager Service
 * Implements secure session token management with rotation
 */

interface SessionToken {
  token: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
}

class SessionManagerService {
  private readonly SESSION_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private currentSession: SessionToken | null = null;

  /**
   * Create a new session token
   */
  async createSession(userId: string): Promise<SessionToken> {
    const token = await this.generateSecureToken();
    const refreshToken = await this.generateSecureToken();
    
    const session: SessionToken = {
      token,
      refreshToken,
      expiresAt: Date.now() + this.SESSION_DURATION,
      createdAt: Date.now()
    };

    this.currentSession = session;
    this.storeSession(userId, session);
    
    return session;
  }

  /**
   * Validate current session
   */
  isSessionValid(): boolean {
    if (!this.currentSession) return false;
    return Date.now() < this.currentSession.expiresAt;
  }

  /**
   * Check if session needs refresh
   */
  needsRefresh(): boolean {
    if (!this.currentSession) return false;
    const timeUntilExpiry = this.currentSession.expiresAt - Date.now();
    return timeUntilExpiry < this.REFRESH_THRESHOLD;
  }

  /**
   * Refresh session token
   */
  async refreshSession(userId: string): Promise<SessionToken> {
    if (!this.currentSession) {
      throw new Error('No active session to refresh');
    }

    const newToken = await this.generateSecureToken();
    
    const session: SessionToken = {
      token: newToken,
      refreshToken: this.currentSession.refreshToken,
      expiresAt: Date.now() + this.SESSION_DURATION,
      createdAt: Date.now()
    };

    this.currentSession = session;
    this.storeSession(userId, session);
    
    return session;
  }

  /**
   * Get current session token
   */
  getSessionToken(): string | null {
    return this.currentSession?.token || null;
  }

  /**
   * Invalidate current session
   */
  invalidateSession(userId: string): void {
    this.currentSession = null;
    this.removeStoredSession(userId);
  }

  /**
   * Generate cryptographically secure token
   */
  private async generateSecureToken(): Promise<string> {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    
    // Hash the random bytes for additional security
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store session in secure storage
   */
  private storeSession(userId: string, session: SessionToken): void {
    const key = `hushkey-session-${userId}`;
    sessionStorage.setItem(key, JSON.stringify(session));
  }

  /**
   * Load session from storage
   */
  loadSession(userId: string): SessionToken | null {
    try {
      const key = `hushkey-session-${userId}`;
      const stored = sessionStorage.getItem(key);
      
      if (!stored) return null;
      
      const session = JSON.parse(stored) as SessionToken;
      
      // Validate expiry
      if (Date.now() >= session.expiresAt) {
        this.removeStoredSession(userId);
        return null;
      }
      
      this.currentSession = session;
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Remove stored session
   */
  private removeStoredSession(userId: string): void {
    const key = `hushkey-session-${userId}`;
    sessionStorage.removeItem(key);
  }

  /**
   * Get session info
   */
  getSessionInfo(): { expiresIn: number; needsRefresh: boolean } | null {
    if (!this.currentSession) return null;
    
    const expiresIn = Math.max(0, this.currentSession.expiresAt - Date.now());
    
    return {
      expiresIn,
      needsRefresh: this.needsRefresh()
    };
  }
}

export default new SessionManagerService();
