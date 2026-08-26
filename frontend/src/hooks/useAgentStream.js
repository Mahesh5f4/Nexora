import { useState, useRef, useCallback } from 'react';
import { aiService } from '../services/api';
import { IS_PREVIEW_MODE, generateAdaptivePreviewResponse } from '../config/previewConfig';

export function cleanResponseText(text) {
  if (!text) return '';
  // Strip <think>...</think> tags if leaked
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Strip 'Here's a thinking process: ...' blocks if leaked
  cleaned = cleaned.replace(/^Here's a thinking process:[\s\S]*?(?=\n\n(?:[A-Z0-9#\*]|Hello|Hi|Sure|To |In |The |Based |According |\Z))/i, '');
  return cleaned.trimStart();
}

/**
 * useAgentStream — reusable SSE streaming hook for all Thinkaction agent modes.
 *
 * Supports IS_PREVIEW_MODE for interactive founder demos & rate-limit lockdown during model development.
 */
export function useAgentStream(role, activeConversation, setActiveConversation, fetchConversations, onConversationCreated) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSources, setActiveSources] = useState([]);

  const isLoadingRef = useRef(false);
  const currentConvIdRef = useRef(null);
  const streamBufferRef = useRef('');
  const lastRenderedLengthRef = useRef(0);
  const rafRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ─── Load historic messages when switching conversations ────────────────────
  const loadMessages = useCallback(async (id) => {
    try {
      setIsLoading(true);
      if (IS_PREVIEW_MODE && typeof id === 'string' && id.startsWith('preview-')) {
        // Saved in session/local preview
        const stored = sessionStorage.getItem(`preview_conv_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed);
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg?.sources) setActiveSources(lastMsg.sources);
        }
        setIsLoading(false);
        return;
      }

      const res = await aiService.getMessages(id);
      const msgs = res.data.content || res.data || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.metadata?.evidence) setActiveSources(lastMsg.metadata.evidence);
    } catch {
      if (!IS_PREVIEW_MODE) {
        setError('Failed to load conversation history.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Sync hook state with the Workspace's activeConversation ────────────────
  const syncConversation = useCallback((conv) => {
    const id = conv?.id;
    if (id && id !== currentConvIdRef.current) {
      currentConvIdRef.current = id;
      loadMessages(id);
    } else if (!id) {
      currentConvIdRef.current = null;
      setMessages([]);
      setActiveSources([]);
    }
  }, [loadMessages]);

  // ─── Send a message and stream the response ─────────────────────────────────
  const handleSend = useCallback(async (content, options = {}) => {
    if (!content.trim() || isLoadingRef.current) return;
    isLoadingRef.current = true;

    // BUG 3 FIX — Analyze agent short-input guard
    if (role === 'ANALYZE' && content.trim().length < 10) {
      const clarificationId = Date.now().toString();
      setMessages(prev => [
        ...prev,
        { id: (Date.now() - 1).toString(), sender: 'USER', content },
        {
          id: clarificationId,
          sender: 'ASSISTANT',
          content:
            'Please describe the situation, code, data, or decision you\'d like me to analyze. ' +
            'The more context you provide, the more accurate my analysis will be.',
          streaming: false,
          sources: [],
          metadata: null,
        },
      ]);
      isLoadingRef.current = false;
      return;
    }

    setError(null);

    const userMsgId = Date.now().toString();
    const asstMsgId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'USER', content },
      { id: asstMsgId, sender: 'ASSISTANT', content: '', streaming: true, sources: [], metadata: null },
    ]);
    setIsLoading(true);

    let convId = activeConversation?.id;

    // ─── PREVIEW SIMULATION MODE ──────────────────────────────────────────────
    if (IS_PREVIEW_MODE) {
      const mockResult = generateAdaptivePreviewResponse(role, content);
      
      if (!convId) {
        convId = `preview-${Date.now()}`;
        currentConvIdRef.current = convId;
        const mockConv = {
          id: convId,
          title: content.length > 35 ? content.substring(0, 32) + '...' : content,
          role,
          createdAt: new Date().toISOString()
        };
        if (onConversationCreated) {
          onConversationCreated(mockConv, content);
        } else if (setActiveConversation) {
          setActiveConversation(mockConv);
        }
      }

      // Simulate source citations arrival
      if (mockResult.sources && mockResult.sources.length > 0) {
        setTimeout(() => {
          setActiveSources(mockResult.sources);
          setMessages(prev => prev.map(m =>
            m.id === asstMsgId ? { ...m, sources: mockResult.sources } : m
          ));
        }, 300);
      }

      if (mockResult.metadata) {
        setMessages(prev => prev.map(m =>
          m.id === asstMsgId ? { ...m, metadata: mockResult.metadata } : m
        ));
      }

      // Typewriter streaming loop
      let charIndex = 0;
      const fullText = mockResult.content;
      
      const streamTimer = setInterval(() => {
        if (!isLoadingRef.current) {
          clearInterval(streamTimer);
          return;
        }

        // Adaptive chunk size (6-12 chars per 16ms tick for ultra smooth typing)
        charIndex += Math.floor(Math.random() * 6) + 6;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          clearInterval(streamTimer);
          
          setMessages(prev => {
            const updated = prev.map(m =>
              m.id === asstMsgId ? { ...m, content: fullText, streaming: false } : m
            );
            if (convId) {
              sessionStorage.setItem(`preview_conv_${convId}`, JSON.stringify(updated));
            }
            return updated;
          });

          setIsLoading(false);
          isLoadingRef.current = false;
        } else {
          const currentSlice = fullText.substring(0, charIndex);
          setMessages(prev => prev.map(m =>
            m.id === asstMsgId ? { ...m, content: currentSlice } : m
          ));
        }
      }, 16);

      return;
    }

    // ─── LIVE BACKEND API STREAMING (IS_PREVIEW_MODE = false) ─────────────────
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let wasNewConversation = !convId;

    try {
      if (!convId) {
        const convRes = await aiService.createConversation({ role });
        convId = convRes.data.id;
        currentConvIdRef.current = convId;
        if (onConversationCreated) {
          onConversationCreated(convRes.data, content);
        } else {
          setActiveConversation(convRes.data);
          if (fetchConversations) fetchConversations();
        }
        
        aiService.generateConversationTitle(convId, { prompt: content })
          .then(() => {
            if (fetchConversations) fetchConversations();
          })
          .catch(console.error);
      }

      streamBufferRef.current = '';
      lastRenderedLengthRef.current = 0;

      const startTypewriter = () => {
        if (rafRef.current) return;
        const updateLoop = () => {
          if (lastRenderedLengthRef.current < streamBufferRef.current.length) {
            const remaining = streamBufferRef.current.length - lastRenderedLengthRef.current;
            const chunkSize = Math.max(3, Math.ceil(remaining / 4));
            lastRenderedLengthRef.current += chunkSize;
            
            const currentText = streamBufferRef.current.substring(0, lastRenderedLengthRef.current);
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, content: currentText } : m
            ));
          }
          rafRef.current = requestAnimationFrame(updateLoop);
        };
        rafRef.current = requestAnimationFrame(updateLoop);
      };

      await aiService.streamMessage(
        convId,
        {
          content,
          mode: role,
          forceWebSearch: options.forceWebSearch || false,
          forceRag: options.forceRag || false,
          documentId: options.documentId
        },
        (eventName, dataStr) => {
          if (eventName === 'token') {
            startTypewriter();
            try {
              const node = JSON.parse(dataStr);
              const chunk = node.content || node.text || node.token;
              if (chunk) streamBufferRef.current += chunk;
              
              if (node.metadata) {
                setMessages(prev => prev.map(m =>
                  m.id === asstMsgId ? { ...m, metadata: node.metadata } : m
                ));
              }
            } catch {
              streamBufferRef.current += dataStr;
            }
          } else if (eventName === 'message') {
            startTypewriter();
            try {
              const node = JSON.parse(dataStr);
              const chunk = node.content || node.text || node.token;
              if (chunk) {
                streamBufferRef.current += chunk;
              } else if (typeof node === 'string') {
                streamBufferRef.current += node;
              }
            } catch {
              if (dataStr && dataStr !== '{}') {
                streamBufferRef.current += dataStr;
              }
            }
          } else if (eventName === 'source') {
            try {
              const src = JSON.parse(dataStr);
              if (src.url && (src.url.includes('localhost') || src.url.includes('127.0.0.1'))) return;
              setActiveSources(prev => [...prev, src]);
              setMessages(prev => prev.map(m =>
                m.id === asstMsgId ? { ...m, sources: [...(m.sources || []), src] } : m
              ));
            } catch { /* ignore */ }
          } else if (eventName === 'metadata') {
            try {
              const meta = JSON.parse(dataStr);
              setMessages(prev => prev.map(m =>
                m.id === asstMsgId ? { ...m, metadata: meta } : m
              ));
            } catch { /* ignore */ }
          } else if (eventName === 'error') {
            try {
              const errData = JSON.parse(dataStr);
              setError(errData.error || 'Stream error from server.');
            } catch {
              setError(dataStr || 'Unknown stream error.');
            }
          }
        },
        controller.signal
      );

      cancelAnimationFrame(rafRef.current);
      setMessages(prev => prev.map(m =>
        m.id === asstMsgId
          ? { ...m, streaming: false, content: cleanResponseText(streamBufferRef.current) }
          : m
      ));

      if (wasNewConversation && fetchConversations) {
        fetchConversations();
      }

    } catch (err) {
      cancelAnimationFrame(rafRef.current);
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
        setError('AI service is temporarily unavailable. Please try again.');
        setMessages(prev => prev.map(m =>
          m.id === asstMsgId
            ? { ...m, streaming: false, content: streamBufferRef.current || '*Response failed. Please retry.*' }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [activeConversation, role, setActiveConversation, fetchConversations, onConversationCreated]);

  // ─── Abort the current stream ───────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      isLoadingRef.current = false;
    }
    cancelAnimationFrame(rafRef.current);
    setMessages(prev => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.streaming) last.streaming = false;
      return msgs;
    });
  }, []);

  // ─── Start a new chat ───────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setActiveConversation(null);
    setMessages([]);
    setActiveSources([]);
    setError(null);
    currentConvIdRef.current = null;
  }, [setActiveConversation]);

  return {
    messages, setMessages,
    isLoading, error, activeSources,
    handleSend, handleStop, handleNewChat,
    syncConversation,
  };
}
