import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../../services/api';
import { 
  MessageSquare, Plus, Trash2, Send, Command, 
  Code2, BrainCircuit, Compass, Calendar,
  MoreVertical, RefreshCw, User, LogOut
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { id: 'GENERAL', label: 'General', icon: BrainCircuit, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'CODE', label: 'Code Expert', icon: Code2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'RESEARCH', label: 'Researcher', icon: Compass, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'PLANNER', label: 'Planner', icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-400/10' }
];

const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // New chat state
  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);
  
  // Input state
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const fetchConversations = async () => {
    try {
      const res = await aiService.listConversations();
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const res = await aiService.getMessages(id);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load conversation history.");
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setError(null);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    
    try {
      await aiService.deleteConversation(id);
      if (activeConversation?.id === id) {
        handleNewChat();
      }
      fetchConversations();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageContent = input.trim();
    setInput('');
    setError(null);
    
    // Optimistic UI for user message
    const tempUserMsg = { id: Date.now(), sender: 'USER', content: userMessageContent };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      let convId = activeConversation?.id;
      
      // Create conversation if it's a new chat
      if (!convId) {
        const convRes = await aiService.createConversation({ role: selectedRole });
        convId = convRes.data.id;
        setActiveConversation(convRes.data);
        fetchConversations(); // refresh sidebar
      }

      // Send message
      const msgRes = await aiService.sendMessage(convId, { content: userMessageContent });
      
      // Update messages with actual saved user message and AI response
      await fetchMessages(convId);
      
      // Refresh sidebar to update title if it was first message
      if (!activeConversation) {
        fetchConversations();
      }
      
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Unable to get a response right now. Please try again.");
      // We don't remove the user message optimistically added, 
      // the backend keeps it, so we just show an error.
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#0A0A0A] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-[#111111] border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-4">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
          <div className="text-xs font-semibold text-white/40 mb-2 px-2 uppercase tracking-wider">History</div>
          {conversations.length === 0 ? (
            <div className="text-sm text-white/30 px-2 italic">No previous chats</div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  activeConversation?.id === conv.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/70'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className="flex-shrink-0 opacity-50" />
                  <span className="truncate text-sm">{conv.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header / Role Selector */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md absolute top-0 w-full z-10">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            ThinkAction Ai
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
            {!activeConversation ? (
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedRole === role.id 
                        ? 'bg-white/10 text-white shadow-sm' 
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <role.icon size={16} className={selectedRole === role.id ? role.color : ''} />
                    <span className="hidden sm:inline">{role.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">{activeConversation.title}</span>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-md ml-2 border border-white/5 hidden sm:inline-block">
                  {ROLES.find(r => r.id === activeConversation.role)?.label || activeConversation.role}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/profile')} className="text-white/50 hover:text-white text-sm font-medium transition-colors" title="Profile">
               <User size={18} />
             </button>
             <button onClick={() => {
                dispatch(logout());
                navigate('/login');
             }} className="text-white/50 hover:text-white text-sm font-medium transition-colors" title="Logout">
               <LogOut size={18} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 pt-24 pb-32">
          {messages.length === 0 && !activeConversation ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Command size={48} className="mb-4 text-white/20" />
              <h2 className="text-2xl font-medium">How can I help you today?</h2>
              <p className="text-sm mt-2">Select a role above and start typing below.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.sender === 'USER' 
                      ? 'bg-blue-600/20 border border-blue-500/20 text-blue-50 rounded-br-none ml-12' 
                      : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-none mr-12'
                  }`}>
                    {msg.sender === 'USER' ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none px-5 py-4 mr-12">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <RefreshCw size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex justify-center my-4">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg">
                    {error}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto relative group">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#222] transition-all resize-none overflow-hidden max-h-[200px]"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 bottom-3 p-2 bg-white text-black rounded-xl hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/20 transition-all flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] text-white/30 font-medium">
            ThinkAction Ai can make mistakes. Consider verifying critical information.
          </div>
        </div>

      </div>
    </div>
  );
};

export default Workspace;
