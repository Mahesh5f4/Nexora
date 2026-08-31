import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Database, User, RefreshCw, Plus, Check, Copy, Globe, ChevronDown, Upload, Book, FileText, List, Search, Menu } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import CodeBlock from '../chat/CodeBlock';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import { documentService } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';

const markdownComponents = {
  p({ node, children, ...props }) {
    return <div className="mb-2 last:mb-0 leading-relaxed">{children}</div>;
  },
  code({ node, inline, className, children, ...props }) {
    return <CodeBlock inline={inline} className={className} {...props}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 rounded-lg border border-white/10">
        <table className="w-full text-sm text-left" {...props}>{children}</table>
      </div>
    );
  },
  a({ node, href, children, ...props }) {
    const safe = href?.startsWith('javascript:') ? '#' : href;
    return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2" {...props}>{children}</a>;
  }
};

const SourcePill = ({ src }) => {
  const isWeb = src.url && src.url !== 'doc';
  return (
    <a
      href={isWeb ? src.url : '#'}
      target={isWeb ? '_blank' : '_self'}
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-white/25 text-[11px] text-white/60 hover:text-white transition-all"
    >
      <Globe size={9} className={isWeb ? 'text-blue-400' : 'text-emerald-400'} />
      <span className="truncate max-w-[160px]">{src.title || src.domain}</span>
    </a>
  );
};

const MessageBubble = React.memo(({ msg }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.sender === 'USER';
  
  // Create a config object specifically for KNOWLEDGE
  const config = {
    icon: Database,
    color: '#34d399', // emerald-400
    bg: 'rgba(52, 211, 153, 0.1)',
  };

  const handleCopy = () => {
    copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
        isUser
          ? 'bg-white/10 border-white/10 text-white'
          : 'border-emerald-500/20 text-emerald-300'
      }`} style={!isUser ? { backgroundColor: config.bg, color: config.color } : {}}>
        {isUser ? <User size={14} /> : <config.icon size={16} />}
      </div>
      
      <div className={`flex-1 overflow-hidden ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.metadata && <SourceRoutingTags flags={msg.metadata} />}
        
        <div className={`px-5 py-4 ${
          isUser 
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm' 
            : 'w-full text-white/85'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : msg.streaming && !msg.content ? (
            <div className="flex items-center gap-2 text-white/40">
              <RefreshCw size={13} className="animate-spin text-emerald-400" />
              <span className="text-xs">Searching knowledge base…</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-a:text-emerald-400 prose-strong:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {msg.content}
              </ReactMarkdown>
              {msg.streaming && <span className="stream-cursor" style={{ color: config.color }} />}
            </div>
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.sources.map((src, i) => <SourcePill key={i} src={src} />)}
          </div>
        )}

        {/* Actions */}
        {!isUser && !msg.streaming && msg.content && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 text-white/40 hover:text-white text-xs"
          >
            {copied ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.streaming === nextProps.msg.streaming &&
    prevProps.msg.thinking === nextProps.msg.thinking &&
    prevProps.msg.activities?.length === nextProps.msg.activities?.length &&
    prevProps.msg.sources?.length === nextProps.msg.sources?.length
  );
});

const KnowledgeMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated, onOpenSidebar }) => {
  const {
    messages, isLoading, error,
    handleSend, handleStop, handleNewChat, syncConversation
  } = useAgentStream('KNOWLEDGE', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

  const [input, setInput] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await documentService.getDocuments();
      const docs = res.data || [];
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await documentService.uploadDocument(file);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => { syncConversation(activeConversation); }, [activeConversation?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const submit = (content) => {
    const text = content || input;
    if (!text.trim() || isLoading) return;
    
    handleSend(text.trim(), {
      forceRag: true,
      documentId: selectedDocId
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#021008] text-white font-sans relative">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-emerald-500/10 flex items-center justify-between px-3 sm:px-6 bg-[#021008]/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-200 tracking-wide">Knowledge Base</span>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx"
          />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
          >
            {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
          
          <select 
            className="bg-[#111] border border-white/10 text-white/80 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500/50 appearance-none pr-6 cursor-pointer relative max-w-[120px] sm:max-w-[180px]"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            {documents.length === 0 && <option value="" className="bg-[#222] text-white">No docs</option>}
            {documents.map(doc => (
              <option key={doc.id} value={doc.id} className="bg-[#222] text-white">{doc.filename}</option>
            ))}
          </select>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-40 relative">
        {messages.length === 0 ? (
          <div className="min-h-full flex flex-col items-center max-w-4xl mx-auto px-4 w-full pt-10 pb-32 sm:pb-36">
            <div className="flex-1" />
            <div className="w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 sm:mb-10 relative"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#021008] to-[#041a0e] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
                  <Database size={28} className="text-emerald-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">Knowledge Base</h1>
                <p className="text-emerald-400/60 text-sm md:text-base max-w-md mx-auto font-light">
                  Strictly answers questions based on your uploaded documents.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
              >
                {[
                  { icon: FileText, title: 'Main Topic', desc: 'Identify the main topic of the document', color: 'text-emerald-400' },
                  { icon: Book, title: 'Summarize', desc: 'Get a summary of the key points', color: 'text-blue-400' },
                  { icon: List, title: 'Action Items', desc: 'Extract specific action items', color: 'text-amber-400' },
                  { icon: Search, title: 'Conclusion', desc: 'Explain the final conclusion', color: 'text-purple-400' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(action.title)}
                    className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-emerald-900/5 hover:bg-emerald-900/20 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full"
                  >
                    <action.icon size={18} className={`${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                    <span className="text-white/90 font-medium text-sm md:text-base mb-1">{action.title}</span>
                    <span className="text-white/40 text-xs md:text-sm">{action.desc}</span>
                  </button>
                ))}
              </motion.div>
            </div>
            <div className="flex-1" />
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto space-y-6 pb-36">
            {messages.map((msg, i) => <MessageBubble key={msg.id || i} msg={msg} />)}
            {error && (
              <div className="text-center text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent pt-10 pb-6 px-4 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-emerald-500/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={documents.length === 0 ? "Upload a document in the Knowledge Base section first..." : "Ask about your document..."}
              disabled={documents.length === 0 || isLoading}
              className="w-full max-h-[200px] bg-transparent text-white/90 placeholder-white/30 text-sm resize-none outline-none px-3 py-2 scrollbar-thin scrollbar-thumb-white/10"
            />
            <div className="flex items-center justify-between mt-2 px-1 pb-1">
              <div className="text-[10px] text-white/30 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans">↵</kbd> to send
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans">⇧↵</kbd> for newline
              </div>
              <button
                onClick={() => submit()}
                disabled={!input.trim() || isLoading || documents.length === 0}
                className={`p-2 rounded-xl transition-all ${
                  input.trim() && !isLoading && documents.length > 0
                    ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                    : 'bg-white/5 text-white/20'
                }`}
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} className="rotate-45" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeMode;
