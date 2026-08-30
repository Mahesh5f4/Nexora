import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import {
  MessageSquare, Plus, Trash2, Search,
  Code2, BrainCircuit, Compass, Calendar, FileSearch,
  User, LogOut, Menu, Database, Sparkles, Zap, Play
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

import GeneralMode from '../../components/general/GeneralMode';
import ResearcherMode from '../../components/researcher/ResearcherMode';
import PlannerMode from '../../components/planner/PlannerMode';
import AnalyzeMode from '../../components/analyze/AnalyzeMode';
import KnowledgeMode from '../../components/knowledge/KnowledgeMode';
import MemoryManager from '../../components/memory/MemoryManager';

// ─── Agent role definitions ──────────────────────────────────────────────────
const ROLES = [
  { id: 'GENERAL', label: 'General', icon: BrainCircuit, color: 'text-blue-400', bg: 'bg-blue-400/10', accent: 'hover:border-blue-500/30' },
  { id: 'RESEARCH', label: 'Researcher', icon: Compass, color: 'text-purple-400', bg: 'bg-purple-400/10', accent: 'hover:border-purple-500/30' },
  { id: 'PLAN', label: 'Planner', icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-400/10', accent: 'hover:border-rose-500/30' },
  { id: 'ANALYZE', label: 'Analyze', icon: FileSearch, color: 'text-amber-400', bg: 'bg-amber-400/10', accent: 'hover:border-amber-500/30' },
  { id: 'KNOWLEDGE', label: 'Knowledge Base', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-400/10', accent: 'hover:border-emerald-500/30' },
];

// ─── Route to the right mode component ──────────────────────────────────────
const ModeRenderer = ({ role, activeConversation, setActiveConversation, fetchConversations, onConversationCreated }) => {
  const props = { activeConversation, setActiveConversation, fetchConversations, onConversationCreated };
  switch (role) {
    case 'RESEARCH': return <ResearcherMode {...props} />;
    case 'PLAN': return <PlannerMode {...props} />;
    case 'ANALYZE': return <AnalyzeMode {...props} />;
    case 'KNOWLEDGE': return <KnowledgeMode {...props} />;
    default: return <GeneralMode {...props} />;
  }
};

// ─── Main Workspace ──────────────────────────────────────────────────────────
const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  const { id: urlConvId } = useParams(); // Architecture A: read session ID from URL

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [selectedRole, setSelectedRole] = useState('GENERAL');
  const [memoryManagerOpen, setMemoryManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch conversation list ────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await aiService.listConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // ─── On mount: load conversations and restore URL session ──────────────────
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Architecture A: if URL contains /chat/:id, auto-load that conversation
  useEffect(() => {
    // Don't auto-load if we already have this conversation set (e.g. just created it mid-stream)
    if (urlConvId && urlConvId !== activeConversation?.id?.toString()) {
      aiService.getConversation(urlConvId)
        .then(res => {
          const conv = res.data;
          setActiveConversation(conv);
          // BUG 2 FIX: restore selectedRole from conversation record
          if (conv.role) setSelectedRole(conv.role);
        })
        .catch(() => {
          // Conversation not found — navigate back to clean workspace
          navigate('/workspace', { replace: true });
        });
    }
  }, [urlConvId]);

  // ─── Architecture A: called by mode components after creating a new conv ───
  const handleConversationCreated = useCallback((conv, firstMessage) => {
    // Optimistically set the title from the first message right away
    const optimisticTitle = firstMessage
      ? (firstMessage.length > 40 ? firstMessage.substring(0, 37) + '...' : firstMessage)
      : conv.title;
    const convWithTitle = { ...conv, title: optimisticTitle };
    setActiveConversation(convWithTitle);
    if (conv.role) setSelectedRole(conv.role);
    // Add to conversations list immediately with the optimistic title
    setConversations(prev => [convWithTitle, ...prev.filter(c => c.id !== conv.id)]);
    // Update URL — replace:true avoids pushing a new history entry during streaming
    navigate(`/workspace/chat/${conv.id}`, { replace: true });
  }, [navigate]);

  // ─── Wrap setActiveConversation to also sync URL ───────────────────────────
  const handleSetActiveConversation = useCallback((conv) => {
    setActiveConversation(conv);
    if (!conv) {
      navigate('/workspace', { replace: true });
    }
  }, [navigate]);

  const handleNewChat = () => {
    setActiveConversation(null);
    setSidebarOpen(false); // Close sidebar on mobile
    navigate('/workspace', { replace: true });
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await aiService.deleteConversation(id);
      if (activeConversation?.id === id) handleNewChat();
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Derive the effective role — active conversation overrides the selector
  const effectiveRole = activeConversation?.role || selectedRole;
  const activeRoleObj = ROLES.find(r => r.id === effectiveRole) || ROLES[0];

  // Group and filter conversations
  const filteredConversations = conversations.filter(c => 
    (c.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const today = new Date();
  const todayStr = today.toDateString();
  
  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    const convDate = new Date(conv.updatedAt || conv.createdAt || Date.now());
    const isToday = convDate.toDateString() === todayStr;
    if (isToday) {
      acc.today.push(conv);
    } else {
      acc.previous.push(conv);
    }
    return acc;
  }, { today: [], previous: [] });

  return (
    <div className="flex flex-1 h-full w-full bg-[#0A0A0B] text-white overflow-hidden font-sans">

      {/* ─── Mobile Sidebar Overlay ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ──────────────────────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative w-64 flex-shrink-0 bg-[#111111] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:flex`}>
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
            <Plus size={17} /> New Chat
          </button>
          <button 
            className="md:hidden ml-3 text-white/50 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30" />
            <input 
              type="text" 
              placeholder="Search Chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Role selector (only shown before a conversation is active) */}
        {!activeConversation && (
          <div className="px-4 pb-3">
            <div className="text-[10px] font-bold text-white/40 mb-2 px-1 uppercase tracking-widest">Select Mode</div>
            <div className="space-y-1">
              {ROLES.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? `${role.bg} ${role.color} border border-white/10 shadow-sm`
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? role.color : 'text-white/40'} />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-xs">
              No conversations yet
            </div>
          ) : (
            <>
              {groupedConversations.today.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-white/40 mb-2 px-2 uppercase tracking-widest">Today</div>
                  <div className="space-y-1">
                    {groupedConversations.today.map(conv => {
                      const roleObj = ROLES.find(r => r.id === conv.role);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setActiveConversation(conv);
                            if (conv.role) setSelectedRole(conv.role);
                            setSidebarOpen(false); // Close sidebar on mobile
                            navigate(`/workspace/chat/${conv.id}`, { replace: false });
                          }}
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${activeConversation?.id === conv.id ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-white shadow-lg' : 'bg-transparent border border-transparent hover:bg-white/5 text-white/70'
                            }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeConversation?.id === conv.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/70'}`}>
                              {roleObj ? <roleObj.icon size={13} /> : <MessageSquare size={13} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="truncate text-sm font-medium">{conv.title || 'Untitled'}</span>
                              <span className="text-[9px] text-white/30">{new Date(conv.updatedAt || conv.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                          <button
                            onClick={e => handleDelete(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1.5 hover:bg-red-500/10 rounded-md"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {groupedConversations.previous.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-white/40 mb-2 px-2 uppercase tracking-widest">Previous 7 Days</div>
                  <div className="space-y-1">
                    {groupedConversations.previous.map(conv => {
                      const roleObj = ROLES.find(r => r.id === conv.role);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setActiveConversation(conv);
                            if (conv.role) setSelectedRole(conv.role);
                            setSidebarOpen(false); // Close sidebar on mobile
                            navigate(`/workspace/chat/${conv.id}`, { replace: false });
                          }}
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${activeConversation?.id === conv.id ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-white shadow-lg' : 'bg-transparent border border-transparent hover:bg-white/5 text-white/70'
                            }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeConversation?.id === conv.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/70'}`}>
                              {roleObj ? <roleObj.icon size={13} /> : <MessageSquare size={13} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="truncate text-sm font-medium">{conv.title || 'Untitled'}</span>
                              <span className="text-[9px] text-white/30">{new Date(conv.updatedAt || conv.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                          <button
                            onClick={e => handleDelete(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1.5 hover:bg-red-500/10 rounded-md"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User actions */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm ml-auto"
            title="Profile"
          >
            <User size={16} />
          </button>
          <button
            onClick={() => setMemoryManagerOpen(true)}
            className="flex items-center gap-2 text-white/50 hover:text-teal-400 transition-colors text-sm"
            title="Manage AI Memory"
          >
            <BrainCircuit size={16} />
          </button>
          <button
            onClick={() => { dispatch(logout()); navigate('/login'); }}
            className="flex items-center gap-2 text-white/50 hover:text-rose-400 transition-colors text-sm"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ─── Main Content Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)} className="text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <activeRoleObj.icon size={14} className={activeRoleObj.color} />
            <span className="text-sm font-semibold text-white/80">{activeRoleObj.label}</span>
          </div>
          <button onClick={() => { dispatch(logout()); navigate('/login'); }} className="text-white/50 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>

        {/* Mode renderer */}
        <div className="flex-1 relative overflow-hidden">
          <ModeRenderer
            role={effectiveRole}
            activeConversation={activeConversation}
            setActiveConversation={handleSetActiveConversation}
            fetchConversations={fetchConversations}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>

      <MemoryManager isOpen={memoryManagerOpen} onClose={() => setMemoryManagerOpen(false)} />
    </div>
  );
};

export default Workspace;
