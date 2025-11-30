/**
 * Breach Checker Service - Have I Been Pwned Integration
 */

interface BreachResult {
  compromised: boolean;
  breachCount: number;
}

async function sha1Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function checkPasswordBreach(password: string): Promise<BreachResult> {
  const hash = await sha1Hash(password);
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5);
  
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await response.text();
    
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return { compromised: true, breachCount: parseInt(count) };
      }
    }
    
    return { compromised: false, breachCount: 0 };
  } catch (error) {
    console.error('Breach check failed:', error);
    throw error;
  }
}

export async function checkMultiplePasswords(
  passwords: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, BreachResult>> {
  const results = new Map<string, BreachResult>();
  
  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    
    // Rate limit: 1 request per 5 seconds
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    try {
      const result = await checkPasswordBreach(password);
      results.set(password, result);
      onProgress?.(i + 1, passwords.length);
    } catch (error) {
      results.set(password, { compromised: false, breachCount: 0 });
    }
  }
  
  return results;
}
