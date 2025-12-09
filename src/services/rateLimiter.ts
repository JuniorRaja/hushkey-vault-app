/**
 * Rate Limiter Service
 * Implements exponential backoff and account lockout for failed authentication attempts
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockoutUntil: number | null;
}

class RateLimiterService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'hushkey-rate-limit';

  /**
   * Check if authentication is allowed
   */
  canAttempt(userId: string): { allowed: boolean; waitTime?: number; reason?: string } {
    const record = this.getAttemptRecord(userId);
    
    if (!record) {
      return { allowed: true };
    }

    // Check if locked out
    if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
      const waitTime = Math.ceil((record.lockoutUntil - Date.now()) / 1000);
      return {
        allowed: false,
        waitTime,
        reason: `Account locked. Try again in ${Math.ceil(waitTime / 60)} minutes.`
      };
    }

    // Reset if attempt window expired
    if (Date.now() - record.firstAttempt > this.ATTEMPT_WINDOW_MS) {
      this.resetAttempts(userId);
      return { allowed: true };
    }

    // Check attempt count
    if (record.count >= this.MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this.lockAccount(userId, lockoutUntil);
      return {
        allowed: false,
        waitTime: Math.ceil(this.LOCKOUT_DURATION_MS / 1000),
        reason: `Too many failed attempts. Account locked for 15 minutes.`
      };
    }

    // Calculate exponential backoff
    const backoffDelay = this.calculateBackoff(record.count);
    const timeSinceLastAttempt = Date.now() - record.lastAttempt;
    
    if (timeSinceLastAttempt < backoffDelay) {
      const waitTime = Math.ceil((backoffDelay - timeSinceLastAttempt) / 1000);
      return {
        allowed: false,
        waitTime,
        reason: `Please wait ${waitTime} seconds before trying again.`
      };
    }

    return { allowed: true };
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(userId: string): void {
    const record = this.getAttemptRecord(userId);
    const now = Date.now();

    if (!record || now - record.firstAttempt > this.ATTEMPT_WINDOW_MS) {
      // Start new attempt window
      this.saveAttemptRecord(userId, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockoutUntil: null
      });
    } else {
      // Increment existing record
      this.saveAttemptRecord(userId, {
        ...record,
        count: record.count + 1,
        lastAttempt: now
      });
    }
  }

  /**
   * Record a successful attempt (clears failed attempts)
   */
  recordSuccessfulAttempt(userId: string): void {
    this.resetAttempts(userId);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attemptCount: number): number {
    // Exponential backoff: 2^(n-1) seconds, capped at 60 seconds
    const delay = Math.min(Math.pow(2, attemptCount - 1) * 1000, 60000);
    return delay;
  }

  /**
   * Lock account until specified time
   */
  private lockAccount(userId: string, lockoutUntil: number): void {
    const record = this.getAttemptRecord(userId);
    if (record) {
      this.saveAttemptRecord(userId, {
        ...record,
        lockoutUntil
      });
    }
  }

  /**
   * Reset failed attempts for user
   */
  resetAttempts(userId: string): void {
    const storage = this.getAllRecords();
    delete storage[userId];
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage));
  }

  /**
   * Get attempt record for user
   */
  private getAttemptRecord(userId: string): AttemptRecord | null {
    const storage = this.getAllRecords();
    return storage[userId] || null;
  }

  /**
   * Save attempt record for user
   */
  private saveAttemptRecord(userId: string, record: AttemptRecord): void {
    const storage = this.getAllRecords();
    storage[userId] = record;
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage));
  }

  /**
   * Get all attempt records
   */
  private getAllRecords(): Record<string, AttemptRecord> {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(userId: string): number {
    const record = this.getAttemptRecord(userId);
    if (!record) return this.MAX_ATTEMPTS;
    
    if (Date.now() - record.firstAttempt > this.ATTEMPT_WINDOW_MS) {
      return this.MAX_ATTEMPTS;
    }
    
    return Math.max(0, this.MAX_ATTEMPTS - record.count);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}

export default new RateLimiterService();
