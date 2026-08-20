import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, RefreshCw, AlertCircle, Database, Calendar } from 'lucide-react';
import { aiService } from '../../services/api';
import Card from '../../components/ui/Card';

const Usage = () => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await aiService.getUsage();
      setUsageData(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Handle 404 cleanly as "No session"
        setUsageData({ tokensUsed: 0, tokenBudget: 0, tokensRemaining: 0 });
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load usage data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getPercentage = () => {
    if (!usageData || usageData.tokenBudget <= 0) return 0;
    const pct = (usageData.tokensUsed / usageData.tokenBudget) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans pt-24 relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-3xl w-full z-10 animate-pulse">
          <div className="h-10 bg-white/10 rounded w-1/3 mb-10"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="h-32 bg-white/5 rounded-2xl"></div>
            <div className="h-32 bg-white/5 rounded-2xl"></div>
            <div className="h-32 bg-white/5 rounded-2xl"></div>
          </div>
          <div className="h-48 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans pt-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-3xl mx-auto relative z-10 flex flex-col min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-end mb-10"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
              Usage & Quota
            </h1>
            <p className="text-white/50 mt-2 text-sm">Monitor your current AI token consumption and limits.</p>
          </div>
          <button 
            onClick={() => fetchUsage(true)}
            disabled={refreshing || loading}
            aria-label="Refresh usage data"
            className="p-2 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
          >
            <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={18} />
            <div className="text-sm text-red-200">{error}</div>
          </motion.div>
        )}

        {usageData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 liquid-glass border border-white/5 bg-[#111]/60">
                <div className="flex items-center gap-3 mb-4 text-white/50">
                  <Activity size={18} className="text-blue-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">Tokens Used</span>
                </div>
                <div className="text-3xl font-light text-white">
                  {usageData.tokensUsed.toLocaleString()}
                </div>
              </Card>

              <Card className="p-6 liquid-glass border border-white/5 bg-[#111]/60">
                <div className="flex items-center gap-3 mb-4 text-white/50">
                  <Database size={18} className="text-purple-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">Token Budget</span>
                </div>
                <div className="text-3xl font-light text-white">
                  {usageData.tokenBudget > 0 ? usageData.tokenBudget.toLocaleString() : 'N/A'}
                </div>
              </Card>

              <Card className="p-6 liquid-glass border border-white/5 bg-[#111]/60">
                <div className="flex items-center gap-3 mb-4 text-white/50">
                  <Database size={18} className="text-emerald-400" />
                  <span className="text-sm font-medium uppercase tracking-wider">Remaining</span>
                </div>
                <div className="text-3xl font-light text-white">
                  {usageData.tokenBudget > 0 ? usageData.tokensRemaining.toLocaleString() : 'N/A'}
                </div>
              </Card>
            </div>

            <Card className="p-6 liquid-glass border border-white/5 bg-[#111]/80 mt-8">
              <h3 className="text-lg font-medium text-white/90 mb-6 flex items-center gap-2">
                Current Usage Session
              </h3>
              
              {usageData.tokenBudget > 0 ? (
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-white/60">Consumption</span>
                    <span className="text-sm font-medium text-white/90" aria-label={`${usageData.tokensUsed.toLocaleString()} out of ${usageData.tokenBudget.toLocaleString()} tokens used`}>
                      {usageData.tokensUsed.toLocaleString()} / {usageData.tokenBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        getPercentage() > 90 ? 'bg-red-500' : getPercentage() > 75 ? 'bg-amber-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${getPercentage()}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-white/40 text-sm mb-8 text-center italic">
                  No active token budget found.
                </div>
              )}

              {usageData.startedAt && usageData.expiresAt && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="text-white/30 mt-0.5 shrink-0" size={16} />
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Session Started</div>
                      <div className="text-sm text-white/80">{formatDate(usageData.startedAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="text-white/30 mt-0.5 shrink-0" size={16} />
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Session Expires</div>
                      <div className="text-sm text-white/80">{formatDate(usageData.expiresAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Usage;
