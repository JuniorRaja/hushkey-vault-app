/**
 * Reuse Detector Service
 * Detects password reuse across vault items using secure hashing
 */

import type { Item } from '../../types';

export interface ReuseGroup {
  hash: string;
  itemIds: string[];
  count: number;
  severity: 'medium' | 'high' | 'critical';
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function detectReusedPasswords(items: Item[]): Promise<ReuseGroup[]> {
  const passwordMap = new Map<string, string[]>();
  
  for (const item of items) {
    if (item.data?.password) {
      const hash = await hashPassword(item.data.password);
      if (!passwordMap.has(hash)) {
        passwordMap.set(hash, []);
      }
      passwordMap.get(hash)!.push(item.id);
    }
  }
  
  const reuseGroups: ReuseGroup[] = [];
  
  for (const [hash, itemIds] of passwordMap.entries()) {
    if (itemIds.length > 1) {
      let severity: 'medium' | 'high' | 'critical';
      if (itemIds.length === 2) severity = 'medium';
      else if (itemIds.length <= 4) severity = 'high';
      else severity = 'critical';
      
      reuseGroups.push({ hash, itemIds, count: itemIds.length, severity });
    }
  }
  
  return reuseGroups;
}
