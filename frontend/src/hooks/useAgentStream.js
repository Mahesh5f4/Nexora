import { useState, useRef, useCallback } from 'react';
import { aiService } from '../services/api';
import { IS_PREVIEW_MODE, generateAdaptivePreviewResponse } from '../config/previewConfig';

export function cleanResponseText(text) {
  if (!text) return '';
  const { content } = parseThinkingAndContent(text);
  return content;
}

export function parseThinkingAndContent(text) {
  if (!text) return { thinking: '', content: '' };

  let thinking = '';
  let content = text;

  // Case 1: Unclosed <think> tag during active stream
  if (/^<think>/i.test(content) && !/<\/think>/i.test(content)) {
    thinking = content.replace(/^<think>/i, '').trim();
    return { thinking, content: '' };
  }

  // Case 2: Closed <think>...</think> tag(s)
  if (/<think>[\s\S]*?<\/think>/i.test(content)) {
    const matches = Array.from(content.matchAll(/<think>([\s\S]*?)<\/think>/gi));
    thinking = matches.map(m => m[1].trim()).filter(Boolean).join('\n\n');
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trimStart();
  }

  // Case 3: Prose thinking block (e.g. "Here's a thinking process:", "Analyze User Input:", etc.)
  if (/^(?:Here'?s a thinking process|Thinking Process|Analyze User Input|Draft Content \(mental\))/i.test(content)) {
    const draftMatch = content.match(/\n(?:Draft|Final Response|Response):\s*["']?([\s\S]*)$/i);
    if (draftMatch) {
      const thinkPart = content.substring(0, draftMatch.index).trim();
      thinking = (thinking ? thinking + '\n\n' : '') + thinkPart;
      content = draftMatch[1].replace(/["']$/, '').trim();
    } else {
      const paragraphs = content.split('\n\n');
      const thinkBlocks = [];
      const contentBlocks = [];
      let inThinking = true;

      for (const p of paragraphs) {
        const trimmed = p.trim();
        const isThinkHeader = /^(?:Here'?s a thinking process|Thinking Process|Analyze|Identify|Determine|Consider|Check|Structure|Draft -|Step \d+:|Key Elements:)[^\n]*:/i.test(trimmed);
        
        if (inThinking && isThinkHeader) {
          thinkBlocks.push(trimmed);
        } else if (inThinking && thinkBlocks.length > 0 && /^(?:User says|Context:|Need to|Should |Start:|Bridge:|Roadmap|Ask |Keep |Check constraints:)/i.test(trimmed)) {
          thinkBlocks.push(trimmed);
        } else {
          inThinking = false;
          contentBlocks.push(p);
        }
      }

      if (thinkBlocks.length > 0) {
        thinking = (thinking ? thinking + '\n\n' : '') + thinkBlocks.join('\n\n');
        content = contentBlocks.join('\n\n').trimStart();
      }
    }
  }

  // Strip Chinese boilerplate if any
  content = content.replace(/我是一个有帮助的[\s\S]*?(?=\n\n|\Z)/g, '').trimStart();

  return { thinking, content };
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
  const streamThinkingRef = useRef('');
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
      const parsedMsgs = msgs.map(m => {
        if (m.sender === 'ASSISTANT' && m.content) {
          const { thinking, content } = parseThinkingAndContent(m.content);
          return { ...m, content, thinking: m.thinking || thinking };
        }
        return m;
      });
      setMessages(parsedMsgs);
      const lastMsg = parsedMsgs[parsedMsgs.length - 1];
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

    let convId = activeConversation?.id || currentConvIdRef.current;
    const userMsgId = `user-${Date.now()}`;
    const asstMsgId = `asst-${Date.now()}`;

    setMessages(prev => [
      ...prev.map(m => m.streaming ? { ...m, streaming: false } : m),
      { id: userMsgId, sender: 'USER', content: content.trim(), createdAt: new Date().toISOString() },
      { id: asstMsgId, sender: 'ASSISTANT', content: '', thinking: '', activities: [], streaming: true, sources: [], metadata: null }
    ]);
    setIsLoading(true);
    isLoadingRef.current = true;
    setError(null);
    setActiveSources([]);

    // ─── PREVIEW SIMULATION MODE ──────────────────────────────────────────────
    if (IS_PREVIEW_MODE) {
      const mockResult = generateAdaptivePreviewResponse(role, content.trim(), options);
      const fullText = mockResult.content;
      let charIndex = 0;

      const typeInterval = setInterval(() => {
        charIndex += Math.floor(Math.random() * 8) + 4;
        if (charIndex >= fullText.length) {
          clearInterval(typeInterval);
          const { thinking, content: cleanText } = parseThinkingAndContent(fullText);
          setMessages(prev => {
            const updated = prev.map(m =>
              m.id === asstMsgId
                ? {
                    ...m,
                    content: cleanText,
                    thinking,
                    streaming: false,
                    sources: mockResult.sources || [],
                    metadata: mockResult.metadata || null
                  }
                : m
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
          const { thinking, content: cleanText } = parseThinkingAndContent(currentSlice);
          setMessages(prev => prev.map(m =>
            m.id === asstMsgId ? { ...m, content: cleanText, thinking } : m
          ));
        }
      }, 16);

      return;
    }

    // ─── LIVE BACKEND API STREAMING (IS_PREVIEW_MODE = false) ─────────────────
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const wasNewConversation = !convId;

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
      streamThinkingRef.current = '';

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
          if (eventName === 'activity') {
            try {
              const actNode = JSON.parse(dataStr);
              if (actNode && actNode.stage) {
                setMessages(prev => prev.map(m => {
                  if (m.id !== asstMsgId) return m;
                  const currentActivities = m.activities || [];
                  const existingIndex = currentActivities.findIndex(
                    a => (actNode.id && a.id === actNode.id) || (a.stage === actNode.stage && a.status === 'running')
                  );
                  let updatedActivities;
                  if (existingIndex >= 0) {
                    updatedActivities = [...currentActivities];
                    updatedActivities[existingIndex] = { ...updatedActivities[existingIndex], ...actNode };
                  } else {
                    updatedActivities = [...currentActivities, actNode];
                  }
                  return { ...m, activities: updatedActivities };
                }));
              }
            } catch { /* ignore */ }
          } else if (eventName === 'thinking') {
            try {
              const node = JSON.parse(dataStr);
              const chunk = node.content || node.text || node.token || '';
              if (chunk) {
                streamThinkingRef.current += chunk;
                setMessages(prev => prev.map(m =>
                  m.id === asstMsgId ? { ...m, thinking: streamThinkingRef.current } : m
                ));
              }
            } catch {
              streamThinkingRef.current += dataStr;
              setMessages(prev => prev.map(m =>
                m.id === asstMsgId ? { ...m, thinking: streamThinkingRef.current } : m
              ));
            }
          } else if (eventName === 'token' || eventName === 'message') {
            try {
              const node = JSON.parse(dataStr);
              const chunk = node.content || node.text || node.token || (typeof node === 'string' ? node : '');
              if (chunk) {
                streamBufferRef.current += chunk;
                const { thinking, content: cleanText } = parseThinkingAndContent(streamBufferRef.current);
                if (thinking && thinking !== streamThinkingRef.current) {
                  streamThinkingRef.current = thinking;
                }
                setMessages(prev => prev.map(m =>
                  m.id === asstMsgId ? { ...m, content: cleanText, thinking: streamThinkingRef.current, metadata: node.metadata || m.metadata } : m
                ));
              }
            } catch {
              if (dataStr && dataStr !== '{}') {
                streamBufferRef.current += dataStr;
                const { thinking, content: cleanText } = parseThinkingAndContent(streamBufferRef.current);
                if (thinking && thinking !== streamThinkingRef.current) {
                  streamThinkingRef.current = thinking;
                }
                setMessages(prev => prev.map(m =>
                  m.id === asstMsgId ? { ...m, content: cleanText, thinking: streamThinkingRef.current } : m
                ));
              }
            }
          } else if (eventName === 'source') {
            try {
              const src = JSON.parse(dataStr);
              if (!src || src.source_type === 'user_memory') return;
              if (src.title && src.title.toLowerCase().includes('user profile memory')) return;
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
              setMessages(prev => prev.map(m => {
                if (m.id !== asstMsgId) return m;
                const acts = (m.activities || []).map(a => a.status === 'running' ? { ...a, status: 'failed' } : a);
                return { ...m, activities: acts };
              }));
            } catch {
              setError(dataStr || 'Unknown stream error.');
            }
          }
        },
        controller.signal
      );

      const { thinking: finalThinking, content: finalCleanContent } = parseThinkingAndContent(streamBufferRef.current);
      const activeThinking = finalThinking || streamThinkingRef.current;
      setMessages(prev => prev.map(m => {
        if (m.id !== asstMsgId) return m;
        const acts = (m.activities || []).map(a => a.status === 'running' ? { ...a, status: 'completed' } : a);
        return { ...m, streaming: false, content: finalCleanContent, thinking: activeThinking, activities: acts };
      }));

      if (wasNewConversation && fetchConversations) {
        fetchConversations();
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
        setError('AI service is temporarily unavailable. Please try again.');
        setMessages(prev => prev.map(m => {
          if (m.id !== asstMsgId) return m;
          const acts = (m.activities || []).map(a => a.status === 'running' ? { ...a, status: 'failed' } : a);
          return { ...m, streaming: false, content: streamBufferRef.current || '*Response failed. Please retry.*', activities: acts };
        }));
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
    setMessages(prev => {
      const msgs = [...prev];
      const last = msgs[msgs.length - 1];
      if (last?.streaming) {
        last.streaming = false;
        if (last.activities) {
          last.activities = last.activities.map(a => a.status === 'running' ? { ...a, status: 'cancelled' } : a);
        }
      }
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
