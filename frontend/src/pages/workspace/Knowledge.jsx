import { useState, useEffect, useRef } from 'react';
import { documentService } from '../../services/api';
import { 
  FileText, Plus, Trash2, Send, Search, 
  RefreshCw, User, LogOut, CheckCircle, AlertCircle, File, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Knowledge = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Input state
  const [input, setInput] = useState('');
  const [askingId, setAskingId] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const activeDocIdRef = useRef(null);

  const isAsking = activeDocument ? askingId === activeDocument.id : false;

  const fetchDocuments = async (hideError = false) => {
    try {
      const res = await documentService.getDocuments();
      const docs = res.data || [];
      setDocuments(docs);
      
      // Update activeDocument reference if its status changed
      setActiveDocument(prev => {
        if (!prev) return docs[0] || null;
        const updated = docs.find(d => d.id === prev.id);
        return updated || docs[0] || null;
      });
    } catch (err) {
      if (!hideError) {
        console.error("Failed to load documents:", err);
      }
    }
  };

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line
    fetchDocuments();
  }, []);

  // Polling for UPLOADED or PROCESSING documents
  useEffect(() => {
    let interval;
    const hasPendingDocs = documents.some(d => d.status === 'UPLOADED' || d.status === 'PROCESSING');
    if (hasPendingDocs) {
      interval = setInterval(() => {
        fetchDocuments(true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [documents]);

  // When active document changes, load chat state from localStorage
  useEffect(() => {
    const currentId = activeDocument ? activeDocument.id : null;
    activeDocIdRef.current = currentId;
    
    if (currentId) {
      const savedMessages = localStorage.getItem(`rag_messages_${currentId}`);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    setError(null);
  }, [activeDocument]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (activeDocIdRef.current) {
      if (messages.length > 0) {
        localStorage.setItem(`rag_messages_${activeDocIdRef.current}`, JSON.stringify(messages));
      } else {
        localStorage.removeItem(`rag_messages_${activeDocIdRef.current}`);
      }
    }
  }, [messages]);


  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await documentService.uploadDocument(file);
      await fetchDocuments();
      setActiveDocument(res.data);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload document. Please ensure it's a supported format.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await documentService.deleteDocument(id);
      if (activeDocument?.id === id) {
        setActiveDocument(null);
      }
      fetchDocuments();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'FAILED': return <AlertCircle size={14} className="text-red-400" />;
      case 'PROCESSING':
      case 'UPLOADED':
        return <RefreshCw size={14} className="text-blue-400 animate-spin" />;
      default: return null;
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeDocument || isAsking || activeDocument.status !== 'COMPLETED') return;

    const userMessageContent = input.trim();
    setInput('');
    setError(null);
    
    const tempUserMsg = { id: Date.now(), sender: 'USER', content: userMessageContent };
    setMessages(prev => [...prev, tempUserMsg]);
    
    const docId = activeDocument.id;
    setAskingId(docId);

    try {
      const res = await documentService.askQuestion({ documentId: docId, query: userMessageContent, topK: 5 });
      
      // Update UI only if user hasn't switched away
      if (activeDocIdRef.current === docId) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: 'AI', 
          content: res.data.answer,
          sources: res.data.sources
        }]);
      }
    } catch (err) {
      console.error("Error asking question:", err);
      if (activeDocIdRef.current === docId) {
        setError(err.response?.data?.message || "Failed to get an answer. Please try again.");
      }
    } finally {
      setAskingId(prev => prev === docId ? null : prev);
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
        <div className="p-4 space-y-3">
          <button 
            onClick={() => navigate('/workspace')}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all border border-white/10"
          >
            <span>&larr; Back to Chat</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.md,.html,.htm,.json,.xml"
          />
          <button 
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all border border-white/10 disabled:opacity-50"
          >
            {uploading ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
          <div className="text-xs font-semibold text-white/40 mb-2 px-2 uppercase tracking-wider">Knowledge Base</div>
          {documents.length === 0 ? (
            <div className="text-sm text-white/30 px-2 italic">No documents uploaded</div>
          ) : (
            documents.map(doc => (
              <div 
                key={doc.id}
                onClick={() => setActiveDocument(doc)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  activeDocument?.id === doc.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/70'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText size={16} className="flex-shrink-0 opacity-50" />
                  <div className="flex flex-col truncate">
                    <span className="truncate text-sm font-medium">{doc.filename}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getStatusIcon(doc.status)}
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">
                        {doc.status} • {formatSize(doc.size)}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1 flex-shrink-0 ml-2"
                  title="Delete Document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md absolute top-0 w-full z-10">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            RAG Workspace
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
            {activeDocument && (
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">{activeDocument.filename}</span>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-md ml-2 border border-white/5 hidden sm:inline-flex items-center gap-1">
                  {getStatusIcon(activeDocument.status)} {activeDocument.status}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 pt-24 pb-32">
          {!activeDocument ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Search size={48} className="mb-4 text-white/20" />
              <h2 className="text-2xl font-medium">Select or Upload a Document</h2>
              <p className="text-sm mt-2 text-center">Ask questions and search through your knowledge base.<br/>(Ensure your files are processed before querying)</p>
            </div>
          ) : activeDocument.status === 'PROCESSING' || activeDocument.status === 'UPLOADED' ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <RefreshCw size={40} className="mb-4 animate-spin text-blue-400" />
              <h2 className="text-xl font-medium">Processing Document...</h2>
              <p className="text-sm mt-2 max-w-md text-center">We are extracting and indexing the contents of {activeDocument.filename}. This might take a moment.</p>
            </div>
          ) : activeDocument.status === 'FAILED' ? (
            <div className="h-full flex flex-col items-center justify-center">
              <AlertCircle size={48} className="mb-4 text-red-400 opacity-80" />
              <h2 className="text-xl font-medium text-red-400">Processing Failed</h2>
              <p className="text-sm mt-2 text-white/50">There was an error processing {activeDocument.filename}. Please try uploading it again.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center opacity-40">
                  <File size={40} className="mb-4 text-white/20" />
                  <h3 className="text-lg font-medium">Document Ready</h3>
                  <p className="text-sm mt-2 text-center">Ask a question about {activeDocument.filename}.<br/>The search will securely retrieve context from your knowledge base.</p>
                </div>
              ) : null}

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
                      <div>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Sources</div>
                            <div className="space-y-2">
                              {msg.sources.map((src, sIdx) => (
                                <div key={sIdx} className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <FileText size={12} className="text-white/40 flex-shrink-0" />
                                    <span className="text-xs font-medium text-white/80 truncate" title={src.filename}>{src.filename}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {src.publishedDate && (
                                      <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                                        Date: {src.publishedDate}
                                      </span>
                                    )}
                                    {src.score != null && (
                                      <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                                        Relevance: {(src.score * 100).toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none px-5 py-4 mr-12">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <RefreshCw size={14} className="animate-spin" />
                      Searching your documents...
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex justify-center my-4">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg text-center max-w-md">
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
              placeholder={activeDocument?.status === 'COMPLETED' ? "Ask a question..." : "Select a ready document to ask questions"}
              rows={1}
              disabled={!activeDocument || activeDocument.status !== 'COMPLETED'}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#222] transition-all resize-none overflow-hidden max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isAsking || !activeDocument || activeDocument.status !== 'COMPLETED'}
              className="absolute right-3 bottom-3 p-2 bg-white text-black rounded-xl hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/20 transition-all flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] text-white/30 font-medium">
            ThinkAction Ai searches your knowledge base. Always verify important information.
          </div>
        </div>

      </div>
    </div>
  );
};

export default Knowledge;
