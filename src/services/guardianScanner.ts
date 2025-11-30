/**
 * Guardian Scanner Service
 * Performs security scans on vault items and stores results in database
 */

import { supabase } from '../supabaseClient';
import { analyzePassword } from './passwordAnalyzer';
import { detectReusedPasswords } from './reuseDetector';
import { checkMultiplePasswords } from './breachChecker';
import type { Item } from '../../types';

export async function resolveFinding(findingId: string, resolution?: string) {
  const { error } = await supabase
    .from('guardian_findings')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString()
    })
    .eq('id', findingId);
  
  if (error) throw error;
}

export interface ScanResult {
  scanId: string;
  totalItems: number;
  weakCount: number;
  reusedCount: number;
  compromisedCount: number;
  securityScore: number;
  weakItems: Item[];
  reusedItems: Item[];
  compromisedItems: Item[];
  duration: number;
}

export async function fetchScanHistory(userId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('guardian_scans')
    .select('*')
    .eq('user_id', userId)
    .order('scan_date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function fetchFindings(userId: string, scanId?: string) {
  let query = supabase
    .from('guardian_findings')
    .select(`
      *,
      items!inner(id, data_encrypted)
    `)
    .eq('user_id', userId);
  
  if (scanId) {
    query = query.eq('scan_id', scanId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
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
    const { data: insertedFindings, error: findingsError } = await supabase
      .from('guardian_findings')
      .insert(findings)
      .select();
    
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
    compromisedCount: 0,
    securityScore: avgScore,
    weakItems,
    reusedItems,
    compromisedItems: [],
    duration
  };
}

export async function runBreachCheck(
  userId: string,
  items: Item[],
  onProgress?: (current: number, total: number) => void
): Promise<{ compromisedItems: any[], scanId: string }> {
  const startTime = Date.now();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const loginItems = items.filter(i => i.data?.password && uuidRegex.test(i.id));
  const passwords = loginItems.map(i => i.data.password!);
  
  const breachResults = await checkMultiplePasswords(passwords, onProgress);
  
  const compromisedItems: any[] = [];
  const findings: any[] = [];
  
  for (const item of loginItems) {
    const result = breachResults.get(item.data.password!);
    if (result?.compromised) {
      compromisedItems.push({ ...item, breachCount: result.breachCount });
    }
  }
  
  const duration = Date.now() - startTime;
  
  // Create new scan record for breach check
  const { data: scan, error: scanError } = await supabase
    .from('guardian_scans')
    .insert({
      user_id: userId,
      scan_type: 'breach_check',
      total_items_scanned: loginItems.length,
      weak_passwords_count: 0,
      reused_passwords_count: 0,
      compromised_passwords_count: compromisedItems.length,
      scan_duration_ms: duration
    })
    .select('*')
    .single();
  
  if (scanError || !scan) {
    throw new Error('Failed to create breach scan record');
  }
  
  // Store compromised findings
  for (const item of compromisedItems) {
    findings.push({
      scan_id: scan.id,
      user_id: userId,
      item_id: item.id,
      finding_type: 'compromised',
      severity: 'critical',
      details: { breach_count: item.breachCount }
    });
  }
  
  if (findings.length > 0) {
    await supabase.from('guardian_findings').insert(findings);
  }
  
  return { compromisedItems, scanId: scan.id };
}
