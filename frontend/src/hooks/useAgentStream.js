import { useState, useRef, useCallback } from 'react';
import { aiService } from '../services/api';

/**
 * useAgentStream — reusable SSE streaming hook for all Thinkaction agent modes.
 *
 * Fixes applied:
 *  - BUG 1: SSE parser fix is in api.js; this hook adds a fallback for 'message' events
 *            that carry JSON-wrapped tokens (graceful degradation if backend sends generic events)
 *  - BUG 2: `mode: role` is always included in the stream payload so classify_question
 *            receives the correct agent mode
 *  - BUG 3: Analyze mode short-input guard — queries under 10 chars get a local
 *            clarification message; no backend call is made
 *
 * @param {string} role - Agent role key: 'GENERAL', 'CODE_RESEARCHER', 'RESEARCH', 'PLAN', 'ANALYZE'
 * @param {object} activeConversation
 * @param {function} setActiveConversation
 * @param {function} fetchConversations
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
      const res = await aiService.getMessages(id);
      const msgs = res.data.content || res.data || [];
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.metadata?.evidence) setActiveSources(lastMsg.metadata.evidence);
    } catch {
      setError('Failed to load conversation history.');
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
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let wasNewConversation = !convId; // track if we created a new conv this request

    try {
      if (!convId) {
        const convRes = await aiService.createConversation({ role });
        convId = convRes.data.id;
        currentConvIdRef.current = convId;
        // Architecture A: use onConversationCreated to update URL; fall back to setActiveConversation
        if (onConversationCreated) {
          onConversationCreated(convRes.data, content); // pass content for optimistic title
        } else {
          setActiveConversation(convRes.data);
          if (fetchConversations) fetchConversations();
        }
        
        // Kick off background LLM title generation (don't await it so we don't block the stream)
        aiService.generateConversationTitle(convId, { prompt: content })
          .then(() => {
            if (fetchConversations) fetchConversations();
          })
          .catch(console.error);
      }

      streamBufferRef.current = '';
      lastRenderedLengthRef.current = 0;

      // Start a fast typewriter loop to drain the buffer smoothly
      const startTypewriter = () => {
        if (rafRef.current) return;
        const updateLoop = () => {
          if (lastRenderedLengthRef.current < streamBufferRef.current.length) {
            const remaining = streamBufferRef.current.length - lastRenderedLengthRef.current;
            // Adaptive speed: process more characters if falling behind, but at least 2 chars per frame (60fps)
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

      // BUG 2 FIX — always send `mode` so the backend classify_question gets the right agent
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
            // Backend sends named 'token' events with plain text or JSON-wrapped text
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
              // Plain text token (non-JSON) — use directly
              streamBufferRef.current += dataStr;
            }
          } else if (eventName === 'message') {
            startTypewriter();
            // BUG 1 FALLBACK — graceful handling of generic 'message' events
            try {
              const node = JSON.parse(dataStr);
              const chunk = node.content || node.text || node.token;
              if (chunk) {
                streamBufferRef.current += chunk;
              } else if (typeof node === 'string') {
                streamBufferRef.current += node;
              }
            } catch {
              // Not JSON — treat as raw text
              if (dataStr && dataStr !== '{}') {
                streamBufferRef.current += dataStr;
              }
            }
          } else if (eventName === 'source') {
            try {
              const src = JSON.parse(dataStr);
              // Filter localhost sources on the frontend as a final safety net
              if (src.url && (src.url.includes('localhost') || src.url.includes('127.0.0.1'))) return;
              setActiveSources(prev => [...prev, src]);
              setMessages(prev => prev.map(m =>
                m.id === asstMsgId ? { ...m, sources: [...(m.sources || []), src] } : m
              ));
            } catch { /* ignore malformed source events */ }
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
          // 'start', 'status', 'done' events are informational — no action needed
        },
        controller.signal
      );

      // Stream finished — finalize the assistant message
      cancelAnimationFrame(rafRef.current);
      setMessages(prev => prev.map(m =>
        m.id === asstMsgId
          ? { ...m, streaming: false, content: streamBufferRef.current }
          : m
      ));

      // Refresh sidebar to show updated conversation title (backend sets it from first message)
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
