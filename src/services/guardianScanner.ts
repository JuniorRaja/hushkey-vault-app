/**
 * Guardian Scanner Service
 * Performs security scans on vault items and stores results in database
 */

import { supabase } from '../supabaseClient';
import { analyzePassword } from './passwordAnalyzer';
import { detectReusedPasswords } from './reuseDetector';
import type { Item } from '../../types';

export interface ScanResult {
  scanId: string;
  totalItems: number;
  weakCount: number;
  reusedCount: number;
  securityScore: number;
  weakItems: Item[];
  reusedItems: Item[];
  duration: number;
}

export async function runSecurityScan(userId: string, items: Item[]): Promise<ScanResult> {
  const startTime = Date.now();
  
  // Filter items with passwords and valid UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const loginItems = items.filter(i => i.data?.password && uuidRegex.test(i.id));
  
  // Analyze weak passwords
  const weakItems: Item[] = [];
  let totalScore = 0;
  
  for (const item of loginItems) {
    const analysis = analyzePassword(item.data.password!);
    totalScore += analysis.score;
    
    if (analysis.strength === 'weak') {
      weakItems.push(item);
    }
  }
  
  const avgScore = loginItems.length > 0 ? Math.round(totalScore / loginItems.length) : 100;
  
  // Detect reused passwords
  const reuseGroups = await detectReusedPasswords(loginItems);
  const reusedItems = loginItems.filter(item => 
    reuseGroups.some(g => g.itemIds.includes(item.id))
  );
  
  const duration = Date.now() - startTime;
  
  // Store scan record
  const { data: scan, error: scanError } = await supabase
    .from('guardian_scans')
    .insert({
      user_id: userId,
      scan_type: 'manual',
      total_items_scanned: loginItems.length,
      weak_passwords_count: weakItems.length,
      reused_passwords_count: reuseGroups.length,
      compromised_passwords_count: 0,
      scan_duration_ms: duration
    })
    .select('*')
    .single();
  
  if (scanError) {
    console.error('Scan insert error:', scanError);
    throw scanError;
  }
  
  if (!scan || !scan.id) {
    throw new Error('Scan record not created properly');
  }
  
  // Store findings
  const findings: any[] = [];
  
  // Weak password findings (only for items with valid UUIDs)
  for (const item of weakItems) {
    if (!uuidRegex.test(item.id)) continue;
    
    const analysis = analyzePassword(item.data.password!);
    findings.push({
      scan_id: scan.id,
      user_id: userId,
      item_id: item.id,
      finding_type: 'weak',
      severity: analysis.score < 20 ? 'critical' : analysis.score < 40 ? 'high' : 'medium',
      details: { score: analysis.score, issues: analysis.issues }
    });
  }
  
  // Reused password findings (only for items with valid UUIDs)
  for (const group of reuseGroups) {
    for (const itemId of group.itemIds) {
      if (!uuidRegex.test(itemId)) continue;
      
      findings.push({
        scan_id: scan.id,
        user_id: userId,
        item_id: itemId,
        finding_type: 'reused',
        severity: group.severity,
        details: { reused_count: group.count, group_hash: group.hash }
      });
    }
  }
  
  if (findings.length > 0) {
    console.log("inserting finds")
    const { error: findingsError } = await supabase
      .from('guardian_findings')
      .insert(findings);
    
    if (findingsError) {
      console.error('Findings insert error:', findingsError);
      throw findingsError;
    }
  }
  
  return {
    scanId: scan.id,
    totalItems: loginItems.length,
    weakCount: weakItems.length,
    reusedCount: reuseGroups.length,
    securityScore: avgScore,
    weakItems,
    reusedItems,
    duration
  };
}
