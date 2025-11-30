/**
 * Findings Manager Component - Phase 2 Guardian Feature
 * Manages security findings with resolution workflow
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useItemStore } from '../stores/itemStore';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  X, 
  Loader2,
  Wrench,
  XOctagon
} from 'lucide-react';

interface FindingsManagerProps {
  userId: string;
  scanId?: string;
  onClose: () => void;
}

export const FindingsManager: React.FC<FindingsManagerProps> = ({ 
  userId, 
  scanId, 
  onClose 
}) => {
  const [findings, setFindings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { items } = useItemStore();
  
  useEffect(() => {
    if (userId) {
      fetchFindings();
    }
  }, [userId, scanId, filter]);
  
  const fetchFindings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('guardian_findings')
        .select('*')
        .eq('user_id', userId);
      
      if (scanId) query = query.eq('scan_id', scanId);
      if (filter === 'open') query = query.eq('resolved', false);
      if (filter === 'resolved') query = query.eq('resolved', true);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      setFindings(data || []);
    } catch (error) {
      console.error('Failed to fetch findings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const resolveFinding = async (findingId: string, resolution: string) => {
    try {
      await supabase
        .from('guardian_findings')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', findingId);
      
      fetchFindings();
    } catch (error) {
      console.error('Failed to resolve finding:', error);
    }
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="text-red-500" size={16} />;
      case 'high': return <AlertTriangle className="text-orange-500" size={16} />;
      case 'medium': return <AlertTriangle className="text-yellow-500" size={16} />;
      default: return <Clock className="text-blue-500" size={16} />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-900/10';
      case 'high': return 'border-orange-500/50 bg-orange-900/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-900/10';
      default: return 'border-blue-500/50 bg-blue-900/10';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={24} className="text-primary-500" /> Security Findings
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {(['all', 'open', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f} {f === 'open' && findings.filter(f => !f.resolved).length > 0 && `(${findings.filter(f => !f.resolved).length})`}
              </button>
            ))}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
          ) : findings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p>No {filter === 'all' ? '' : filter} findings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map(finding => (
                <div key={finding.id} className={`border rounded-xl p-3 md:p-4 ${getSeverityColor(finding.severity)}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-900 rounded-lg shrink-0">
                      {getSeverityIcon(finding.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm md:text-base truncate">{items.find(i => i.id === finding.item_id)?.name || `Item ${finding.item_id.slice(0, 8)}...`}</div>
                      <div className="text-xs md:text-sm text-gray-400 mt-1">
                        {finding.finding_type === 'weak' && `Weak password (score: ${finding.details?.score})`}
                        {finding.finding_type === 'reused' && `Used on ${finding.details?.reused_count || 'multiple'} accounts`}
                        {finding.finding_type === 'compromised' && `Found in ${finding.details?.breach_count} breaches`}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full capitalize ${
                          finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {finding.severity}
                        </span>
                        <span className="text-[10px] md:text-xs text-gray-600">
                          {new Date(finding.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 md:gap-2 shrink-0">
                      {!finding.resolved ? (
                        <>
                          <button
                            onClick={() => navigate(`/items/${finding.item_id}`)}
                            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs md:text-sm rounded-lg transition-colors"
                            title="Fix Now"
                          >
                            <Wrench size={14} className="md:w-4 md:h-4" />
                            <span className="hidden md:inline">Fix</span>
                          </button>
                          <button
                            onClick={() => resolveFinding(finding.id, 'dismissed')}
                            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs md:text-sm rounded-lg transition-colors"
                            title="Dismiss"
                          >
                            <XOctagon size={14} className="md:w-4 md:h-4" />
                            <span className="hidden md:inline">Dismiss</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-green-500">
                          <CheckCircle size={14} className="md:w-4 md:h-4" />
                          <span className="text-xs md:text-sm hidden md:inline">Resolved</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};