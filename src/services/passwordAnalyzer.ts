/**
 * Password Analyzer Service
 * Analyzes password strength using client-side heuristics
 */

export interface PasswordAnalysis {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
}

const COMMON_PASSWORDS = [
  'password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome', 
  'monkey', 'dragon', 'master', 'sunshine', 'princess', 'football',
  'iloveyou', 'admin', 'password123', '12345678'
];

const COMMON_PATTERNS = /^(123|abc|qwe|asd|zxc|pass|admin)/i;

export function analyzePassword(password: string): PasswordAnalysis {
  let score = 0;
  const issues: string[] = [];
  
  // Length check
  if (password.length < 8) {
    issues.push('Too short (minimum 8 characters)');
  } else if (password.length < 12) {
    score += 20;
  } else if (password.length < 16) {
    score += 35;
  } else {
    score += 50;
  }
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;
  
  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score = 0;
    issues.push('Common password');
  }
  
  // Pattern check
  if (COMMON_PATTERNS.test(password)) {
    score -= 20;
    issues.push('Contains common pattern');
  }
  
  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    issues.push('Repeated characters');
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 40) strength = 'weak';
  else if (score < 75) strength = 'medium';
  else strength = 'strong';
  
  return { score, strength, issues };
}
