/**
 * Security Testing Utility
 * For development and testing of security features
 */

import SecureMemoryService from './secureMemory';
import RateLimiterService from './rateLimiter';
import IntegrityCheckerService from './integrityChecker';
import EncryptionService from './encryption';

class SecurityTesterService {
  /**
   * Test secure memory wiping
   */
  async testSecureWipe(): Promise<{ passed: boolean; details: string }> {
    const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const original = Array.from(testData);
    
    SecureMemoryService.secureWipe(testData);
    
    const allZeros = testData.every(byte => byte === 0);
    
    return {
      passed: allZeros,
      details: `Original: [${original}], After wipe: [${Array.from(testData)}]`
    };
  }

  /**
   * Test key wrapping/unwrapping
   */
  async testKeyWrapping(): Promise<{ passed: boolean; details: string }> {
    try {
      const originalKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      
      await SecureMemoryService.initializeWrappingKey();
      const wrapped = await SecureMemoryService.wrapMasterKey(originalKey);
      const unwrapped = await SecureMemoryService.unwrapMasterKey(wrapped);
      
      const matches = originalKey.every((byte, i) => byte === unwrapped[i]);
      
      return {
        passed: matches,
        details: `Key wrapping and unwrapping ${matches ? 'successful' : 'failed'}`
      };
    } catch (error) {
      return {
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(): Promise<{ passed: boolean; details: string }> {
    const testUserId = 'test-user-' + Date.now();
    const results: string[] = [];
    
    // Test multiple attempts
    for (let i = 1; i <= 6; i++) {
      const check = RateLimiterService.canAttempt(testUserId);
      results.push(`Attempt ${i}: ${check.allowed ? 'Allowed' : 'Blocked - ' + check.reason}`);
      
      if (check.allowed) {
        RateLimiterService.recordFailedAttempt(testUserId);
      }
    }
    
    // Cleanup
    RateLimiterService.resetAttempts(testUserId);
    
    const hasLockout = results.some(r => r.includes('locked'));
    
    return {
      passed: hasLockout,
      details: results.join('\n')
    };
  }

  /**
   * Test data integrity
   */
  async testIntegrity(): Promise<{ passed: boolean; details: string }> {
    try {
      const testKey = await EncryptionService.deriveMasterKey('test-password', EncryptionService.generateSalt());
      await IntegrityCheckerService.initialize(testKey);
      
      const testData = { message: 'Hello, World!', timestamp: Date.now() };
      const pkg = await IntegrityCheckerService.createSignedPackage(testData);
      
      // Test valid package
      const verified = await IntegrityCheckerService.verifySignedPackage(pkg);
      const validTest = JSON.stringify(verified) === JSON.stringify(testData);
      
      // Test tampered package
      let tamperedTest = false;
      try {
        const tamperedPkg = { ...pkg, data: JSON.stringify({ tampered: true }) };
        await IntegrityCheckerService.verifySignedPackage(tamperedPkg);
      } catch {
        tamperedTest = true; // Should throw error
      }
      
      IntegrityCheckerService.clear();
      
      return {
        passed: validTest && tamperedTest,
        details: `Valid package: ${validTest ? 'PASS' : 'FAIL'}, Tamper detection: ${tamperedTest ? 'PASS' : 'FAIL'}`
      };
    } catch (error) {
      return {
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test encryption/decryption
   */
  async testEncryption(): Promise<{ passed: boolean; details: string }> {
    try {
      const password = 'test-password-123';
      const salt = EncryptionService.generateSalt();
      const masterKey = await EncryptionService.deriveMasterKey(password, salt);
      
      const originalData = 'Sensitive information that needs encryption';
      const encrypted = await EncryptionService.encrypt(originalData, masterKey);
      const decrypted = await EncryptionService.decrypt(encrypted, masterKey);
      
      const matches = originalData === decrypted;
      const isDifferent = encrypted !== originalData;
      
      return {
        passed: matches && isDifferent,
        details: `Encryption/Decryption: ${matches ? 'PASS' : 'FAIL'}, Data transformed: ${isDifferent ? 'PASS' : 'FAIL'}`
      };
    } catch (error) {
      return {
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    
    const tests = [
      { name: 'Secure Memory Wipe', fn: () => this.testSecureWipe() },
      { name: 'Key Wrapping', fn: () => this.testKeyWrapping() },
      { name: 'Rate Limiting', fn: () => this.testRateLimiting() },
      { name: 'Data Integrity', fn: () => this.testIntegrity() },
      { name: 'Encryption', fn: () => this.testEncryption() }
    ];
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
      
      if (result.passed) {
        passed++;
        console.log(`✅ ${test.name}: PASS`);
      } else {
        failed++;
        console.log(`❌ ${test.name}: FAIL`);
      }
      console.log(`   ${result.details}\n`);
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    return { passed, failed, results };
  }
}

export default new SecurityTesterService();
