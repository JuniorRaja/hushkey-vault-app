/**
 * Scan History Component - Phase 2 Guardian Feature
 * Shows historical security scans with trend analysis
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { History, TrendingDown, TrendingUp, X, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScanHistoryProps {
  userId: string;
  onClose: () => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ userId, onClose }) => {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (userId) {
      fetchScans();
    }
  }, [userId]);
  
  const fetchScans = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('guardian_scans')
        .select('*')
        .eq('user_id', userId)
        .order('scan_date', { ascending: false })
        .limit(10);
      
      setScans(data || []);
    } catch (error) {
      console.error('Failed to fetch scan history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTrend = (current: number, previous: number) => {
    if (current < previous) return { icon: TrendingDown, color: 'text-green-500', text: `↓ ${previous - current} fewer` };
    if (current > previous) return { icon: TrendingUp, color: 'text-red-500', text: `↑ ${current - previous} more` };
    return null;
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History size={24} className="text-primary-500" /> Scan History
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-2 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>No scan history available</p>
            </div>
          ) : (
            <>
              {/* Trend Chart */}
              {scans.length > 1 && (
                <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Security Trends</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={[...scans].reverse().map(s => ({
                      date: new Date(s.scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      weak: s.weak_passwords_count,
                      reused: s.reused_passwords_count,
                      compromised: s.compromised_passwords_count || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="weak" stroke="#EF4444" name="Weak" strokeWidth={2} />
                      <Line type="monotone" dataKey="reused" stroke="#F59E0B" name="Reused" strokeWidth={2} />
                      <Line type="monotone" dataKey="compromised" stroke="#DC2626" name="Compromised" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Scan List */}
              <div className="space-y-4">
              {scans.map((scan, idx) => {
                const prev = scans[idx + 1];
                const weakTrend = prev ? getTrend(scan.weak_passwords_count, prev.weak_passwords_count) : null;
                const reusedTrend = prev ? getTrend(scan.reused_passwords_count, prev.reused_passwords_count) : null;
                
                return (
                  <div key={scan.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-white">{new Date(scan.scan_date).toLocaleString()}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="capitalize">{scan.scan_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{scan.scan_duration_ms}ms</span>
                          <span>•</span>
                          <span>{scan.total_items_scanned} items</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">{scan.weak_passwords_count}</div>
                        <div className="text-xs text-gray-500 mb-1">Weak Passwords</div>
                        {weakTrend && (
                          <div className={`text-xs ${weakTrend.color} flex items-center gap-1`}>
                            <weakTrend.icon size={12} />
                            {weakTrend.text}
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-orange-400">{scan.reused_passwords_count}</div>
                        <div className="text-xs text-gray-500 mb-1">Reused Passwords</div>
                        {reusedTrend && (
                          <div className={`text-xs ${reusedTrend.color} flex items-center gap-1`}>
                            <reusedTrend.icon size={12} />
                            {reusedTrend.text}
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-500">{scan.compromised_passwords_count || 0}</div>
                        <div className="text-xs text-gray-500">Compromised</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};