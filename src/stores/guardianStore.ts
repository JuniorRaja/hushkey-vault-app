/**
 * Guardian Store - Security scanning state management
 * Handles security scans, findings, and scan history
 */

import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { runSecurityScan, ScanResult } from '../services/guardianScanner';
import type { Item } from '../../types';

interface GuardianFinding {
  id: string;
  scanId: string;
  userId: string;
  itemId: string;
  findingType: string;
  severity: string;
  details: any;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

interface GuardianState {
  isScanning: boolean;
  scanProgress: number;
  lastScan: ScanResult | null;
  findings: GuardianFinding[];
  error: string | null;
}

interface GuardianActions {
  startScan: (userId: string, items: Item[]) => Promise<void>;
  fetchLatestScan: (userId: string) => Promise<void>;
  fetchFindings: (userId: string) => Promise<void>;
  resolveFindings: (findingIds: string[]) => Promise<void>;
}

export const useGuardianStore = create<GuardianState & GuardianActions>((set, get) => ({
  isScanning: false,
  scanProgress: 0,
  lastScan: null,
  findings: [],
  error: null,

  async startScan(userId: string, items: Item[]) {
    set({ isScanning: true, scanProgress: 0, error: null });
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        set(state => ({ 
          scanProgress: Math.min(state.scanProgress + 10, 90) 
        }));
      }, 300);
      
      const result = await runSecurityScan(userId, items);
      
      clearInterval(progressInterval);
      set({ 
        isScanning: false, 
        scanProgress: 100, 
        lastScan: result 
      });
      
      // Fetch updated findings
      await get().fetchFindings(userId);
      
      // Reset progress after a delay
      setTimeout(() => set({ scanProgress: 0 }), 1000);
    } catch (error) {
      console.error('Failed to run security scan:', error);
      set({ 
        isScanning: false, 
        scanProgress: 0, 
        error: 'Failed to complete security scan' 
      });
    }
  },

  async fetchLatestScan(userId: string) {
    try {
      const { data, error } = await supabase
        .from('guardian_scans')
        .select('*')
        .eq('user_id', userId)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        set({
          lastScan: {
            scanId: data.id,
            totalItems: data.total_items_scanned,
            weakCount: data.weak_passwords_count,
            reusedCount: data.reused_passwords_count,
            securityScore: 0, // Will be calculated from findings
            weakItems: [],
            reusedItems: [],
            duration: data.scan_duration_ms
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest scan:', error);
    }
  },

  async fetchFindings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('guardian_findings')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const findings: GuardianFinding[] = (data || []).map(f => ({
        id: f.id,
        scanId: f.scan_id,
        userId: f.user_id,
        itemId: f.item_id,
        findingType: f.finding_type,
        severity: f.severity,
        details: f.details,
        resolved: f.resolved,
        resolvedAt: f.resolved_at,
        createdAt: f.created_at
      }));
      
      set({ findings });
    } catch (error) {
      console.error('Failed to fetch findings:', error);
    }
  },

  async resolveFindings(findingIds: string[]) {
    try {
      const { error } = await supabase
        .from('guardian_findings')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .in('id', findingIds);
      
      if (error) throw error;
      
      // Update local state
      set(state => ({
        findings: state.findings.filter(f => !findingIds.includes(f.id))
      }));
    } catch (error) {
      console.error('Failed to resolve findings:', error);
      throw error;
    }
  }
}));
