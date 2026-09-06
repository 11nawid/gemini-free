'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Square, 
  RotateCcw, 
  X, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Check, 
  User,
  ChevronDown,
  Brain,
  ChevronRight,
  Flame
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  timestamp: string;
}

const DEFAULT_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini Free 3.7 Flash', desc: 'Ultra Fast & Creative' },
  { id: 'gemini-3.5-flash-thinking', name: 'Gemini Free Deep Reasoning', desc: 'Extended Thinking & Logic' },
  { id: 'gemini-3.1-pro', name: 'Gemini Free Pro Studio', desc: 'Production Architecture & Code' },
];

const QUICK_PROMPTS = [
  "🔥 Design a scalable Firebase Firestore schema with TypeScript",
  "⚡ Write a Next.js 15 Server-Sent Events API route",
  "🛡️ Create secure Firebase Security Rules for user roles",
  "🎨 Build a modern responsive Tailwind CSS component"
];

function ThoughtAccordion({ reasoning, isLive }: { reasoning: string; isLive?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: '10px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 145, 0, 0.25)',
        background: 'rgba(38, 22, 10, 0.6)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          background: 'transparent',
          border: 'none',
          color: '#ffa726',
          fontSize: '11.5px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Brain size={14} color="#ff9100" />
        <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>Thought Process</span>
        {isLive && (
          <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', marginLeft: '4px' }}>
            <span className="typing-dot" style={{ width: '4px', height: '4px', background: '#ff9100' }} />
            <span className="typing-dot" style={{ width: '4px', height: '4px', background: '#ff9100' }} />
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ffb74d', fontWeight: 400 }}>
          {reasoning.length} chars
          <ChevronRight size={13} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255, 145, 0, 0.15)',
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#ffe0b2',
            maxHeight: '260px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'rgba(0, 0, 0, 0.3)',
            fontFamily: 'monospace',
          }}
        >
          {reasoning}
        </div>
      )}
    </div>
  );
}

interface ChatPanelProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
  initialPrompt?: string;
}

export default function ChatPanel({ externalOpen, onExternalClose, initialPrompt }: ChatPanelProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      setIsOpen(true);
      setIsMinimized(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [initialPrompt]);

  // Load chat history & fetch live models
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gemini-free:history');
      if (saved) {
        setMessages(JSON.parse(saved));
      }
      const savedModel = localStorage.getItem('gemini-free:model');
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch {}

    // Fetch live models from /api/v1/models
    fetch('/api/v1/models')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((m: any) => {
            let label = m.id;
            if (m.id.includes('flash-thinking')) label = 'Gemini Free Thinking (Deep Reasoning)';
            else if (m.id.includes('3.6-flash')) label = 'Gemini Free Flash (Fast & Capable)';
            else if (m.id.includes('3.1-pro')) label = 'Gemini Free Pro (Architecture & Code)';
            else if (m.id.includes('flash-lite')) label = 'Gemini Free Lite (Ultra Fast)';
            return { id: m.id, name: label };
          });
          setAvailableModels(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem('gemini-free:history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('gemini-free:model', modelId);
    } catch {}
  };

  const handleClearHistory = () => {
    if (confirm('Clear current conversation?')) {
      setMessages([]);
      try {
        localStorage.removeItem('gemini-free:history');
      } catch {}
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const promptToSend = promptOverride || input;
    if (!promptToSend.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...newMessages, assistantPlaceholder]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) errMsg = errJson.error.message;
        } catch {}
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error('No response stream received');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedReasoning = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (delta.reasoning_content || delta.reasoning) {
                accumulatedReasoning += (delta.reasoning_content || delta.reasoning);
              }
              if (delta.content) {
                accumulatedContent += delta.content;
              }

              setMessages(prev => 
                prev.map(m => m.id === assistantMsgId ? {
                  ...m,
                  content: accumulatedContent,
                  reasoning: accumulatedReasoning || undefined
                } : m)
              );
            }
          } catch {
            // ignore partial json
          }
        }
      }

      if (!accumulatedContent && !accumulatedReasoning) {
        setMessages(prev => 
          prev.map(m => m.id === assistantMsgId ? { ...m, content: 'No response content was generated.' } : m)
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => 
          prev.map(m => m.id === assistantMsgId ? { ...m, content: `⚠️ Error: ${err.message || String(err)}` } : m)
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // If panel is closed, render NOTHING (no bottom-right floating button)
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="animate-panel-in"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        width: isMinimized ? '320px' : isExpanded ? '760px' : '460px',
        height: isMinimized ? '56px' : '660px',
        maxHeight: 'calc(100vh - 48px)',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: 'rgba(18, 20, 26, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 145, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.22s ease, height 0.22s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff5722 0%, #ff9100 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255, 145, 0, 0.4)',
            }}
          >
            <Flame size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
              Gemini Free
              {selectedModel.includes('thinking') && (
                <span style={{ fontSize: '10px', background: 'rgba(255, 145, 0, 0.2)', color: '#ffb74d', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(255, 145, 0, 0.3)' }}>
                  Reasoning
                </span>
              )}
            </div>
            {!isMinimized && (
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                Full-Stack Workspace Engine
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isMinimized && (
            <>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                    padding: '4px 24px 4px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: isExpanded ? '230px' : '150px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#18181b', color: '#fff' }}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} color="#a1a1aa" style={{ position: 'absolute', right: '7px', pointerEvents: 'none' }} />
              </div>

              <button
                onClick={handleClearHistory}
                title="Clear history"
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
              >
                <RotateCcw size={15} />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse width" : "Expand width"}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Restore" : "Minimize"}
            style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
          >
            <Minimize2 size={15} />
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onExternalClose?.();
            }}
            title="Close workspace"
            style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Empty State */}
            {messages.length === 0 && (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '24px 12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'rgba(255, 145, 0, 0.12)',
                    border: '1px solid rgba(255, 145, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <Flame size={26} color="#ff9100" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>
                  Gemini Free Workspace
                </h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', maxWidth: '300px', marginBottom: '18px', lineHeight: 1.5 }}>
                  Your conversational assistant for full-stack code, Firebase architectures, and interactive brainstorming.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(undefined, prompt.replace(/^[^\s]+\s/, ''))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        color: '#e4e4e7',
                        fontSize: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 145, 0, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 145, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages List */}
            {messages.map((msg) => {
              const isCurrentActive = isStreaming && msg.id === messages[messages.length - 1].id;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      maxWidth: '90%',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: msg.role === 'user' ? '#ea580c' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {msg.role === 'user' ? <User size={14} color="#fff" /> : <Flame size={14} color="#ff9100" />}
                    </div>

                    {/* Message Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      {/* Thoughts Accordion (if reasoning was present) */}
                      {msg.role === 'assistant' && msg.reasoning && (
                        <ThoughtAccordion reasoning={msg.reasoning} isLive={isCurrentActive && !msg.content} />
                      )}

                      <div
                        style={{
                          background: msg.role === 'user' 
                            ? 'linear-gradient(135deg, #ff5722 0%, #ff9100 100%)' 
                            : 'rgba(28, 32, 42, 0.9)',
                          border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: '10px 14px',
                          color: '#f4f4f5',
                          fontSize: '13.5px',
                          lineHeight: '1.55',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          position: 'relative',
                        }}
                      >
                        {msg.content ? (
                          <>
                            {msg.content}
                            {isCurrentActive && <span className="streaming-caret" style={{ background: '#ff9100' }} />}
                          </>
                        ) : isCurrentActive ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', color: '#a1a1aa', fontSize: '12px' }}>
                            {msg.reasoning ? (
                              <span>Generating code & response...</span>
                            ) : (
                              <>
                                <span style={{ color: '#ffb74d' }}>Gemini Free Thinking</span>
                                <span className="typing-dot" style={{ background: '#ff9100' }} />
                                <span className="typing-dot" style={{ background: '#ff9100' }} />
                                <span className="typing-dot" style={{ background: '#ff9100' }} />
                              </>
                            )}
                          </div>
                        ) : null}

                        {msg.role === 'assistant' && msg.content && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Copy"
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: 'none',
                              color: '#a1a1aa',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                          >
                            {copiedId === msg.id ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '10px',
                      color: '#71717a',
                      marginTop: '3px',
                      padding: msg.role === 'user' ? '0 34px 0 0' : '0 0 0 34px',
                    }}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  background: 'rgba(24, 27, 34, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  padding: '8px 10px',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Gemini Free anything... (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#f4f4f5',
                    fontSize: '13.5px',
                    lineHeight: '1.4',
                    resize: 'none',
                    outline: 'none',
                    maxHeight: '120px',
                    fontFamily: 'inherit',
                  }}
                />

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    title="Stop generating"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Square size={14} fill="#f87171" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: input.trim() 
                        ? 'linear-gradient(135deg, #ff5722 0%, #ff9100 100%)' 
                        : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      color: input.trim() ? '#fff' : '#71717a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: input.trim() ? 'pointer' : 'default',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#71717a',
                  padding: '0 4px',
                }}
              >
                <span>Gemini Free Workspace</span>
                <span>Native Streaming Active</span>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
