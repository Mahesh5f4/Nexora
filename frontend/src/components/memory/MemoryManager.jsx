import React, { useState, useEffect } from 'react';
import { Brain, Trash2, X, RefreshCw } from 'lucide-react';
import { aiService } from '../../services/api';

const MemoryManager = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await aiService.listUserMemory();
      // res.data format is { memories: [ { id, content, created_at } ] }
      setMemories(res.data.memories || []);
      setError(null);
    } catch (err) {
      setError('Failed to load memories. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setMemories(prev => prev.filter(m => m.id !== id));
      await aiService.deleteUserMemory(id);
    } catch (err) {
      console.error(err);
      fetchMemories(); // reload if failed
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4 md:p-10">
      <div className="glass-card w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:px-10 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 group-hover:translate-y-full transition-transform duration-500 ease-out"></div>
              <Brain size={24} className="text-white relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Memory Dashboard</h2>
              <p className="text-[11px] text-white/50 uppercase tracking-widest font-semibold mt-1">AI Learned Context & Preferences</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 text-white/50 hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/30">
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 hide-scrollbar bg-gradient-to-b from-white/[0.01] to-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <RefreshCw className="animate-spin text-cyan-500" size={36} />
              <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Syncing Neural Network...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-rose-400 text-sm px-8 py-5 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3 shadow-lg">
                <Trash2 size={18} /> {error}
              </div>
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-8 border-2 border-white/5 border-dashed">
                <Brain size={56} />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">No Memories Yet</h3>
              <p className="text-white/40 text-sm max-w-md leading-relaxed">
                The AI hasn't learned any personalized facts about you yet. As you chat, it will automatically remember important details to improve future responses and tailor the experience to you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {memories.map((mem, i) => {
                const colors = [
                  'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]',
                  'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
                  'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                  'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                  'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                ];
                const bgColors = [
                  'bg-cyan-500/10', 'bg-purple-500/10', 'bg-amber-500/10', 'bg-emerald-500/10', 'bg-rose-500/10'
                ];
                const colorClass = colors[i % colors.length];
                const bgClass = bgColors[i % bgColors.length];

                return (
                  <div key={mem.id} className={`group relative p-7 rounded-3xl bg-gradient-to-br ${colorClass} backdrop-blur-md border hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 flex flex-col`}>
                    <div className="flex justify-between items-start mb-5">
                      <div className={`w-12 h-12 rounded-2xl ${bgClass} flex items-center justify-center shadow-inner border border-white/5`}>
                        <Brain size={20} className="opacity-80" />
                      </div>
                      <button 
                        onClick={() => handleDelete(mem.id)}
                        className="p-2.5 text-white/40 hover:text-white hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.6)] rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Forget memory"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <p className="text-white/90 text-sm font-medium leading-relaxed flex-1 mb-6">
                      {mem.content}
                    </p>
                    
                    <div className="flex items-center justify-between pt-5 border-t border-white/10 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                          Active Fact
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        {new Date(mem.created_at || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryManager;
