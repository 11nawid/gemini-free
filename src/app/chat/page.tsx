'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatInputCapsule, type AttachedFile } from '@/components/ChatInputCapsule';
import { ExploreGraph } from '@/components/ExploreGraph';
import { RealPenArtboard } from '@/components/RealPenArtboard';
import { cleanAssistantText } from '@/lib/clean';
import { 
  Flame, 
  Plus, 
  Settings, 
  Layers, 
  Sparkles, 
  Paperclip, 
  Send, 
  Mic, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  ArrowUp,
  Compass, 
  PenTool, 
  MessageSquare, 
  SlidersHorizontal, 
  LogOut, 
  RotateCcw, 
  Square, 
  Copy, 
  Check, 
  Brain, 
  Terminal, 
  Database, 
  Code2, 
  ShieldCheck, 
  Cpu, 
  ExternalLink,
  X,
  Search,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Lock
} from 'lucide-react';

type Mode = 'chat' | 'learn' | 'draw';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  timestamp: string;
  mode?: Mode;
}

const MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini Free 3.7 Flash', desc: 'Ultra Fast & Creative' },
  { id: 'gemini-3.5-flash-thinking', name: 'Gemini Free Deep Reasoning', desc: 'Extended Thinking & Logic' },
  { id: 'gemini-3.1-pro', name: 'Gemini Free Pro Studio', desc: 'Production Architecture & Code' },
];

const CURL_EXAMPLE = `curl -X POST {BASE_URL}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\  # optional if no keys are set
  -d '{
    "model": "gemini-3.6-flash",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Write a React component in 5 lines." }
    ],
    "temperature": 0.7,
    "stream": false
  }'`;

const JS_EXAMPLE = `const res = await fetch("{BASE_URL}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // "Authorization": "Bearer YOUR_API_KEY", // optional if no keys set
  },
  body: JSON.stringify({
    model: "gemini-3.6-flash",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Write a React component in 5 lines." },
    ],
    temperature: 0.7,
    stream: false,
  }),
});

const data = await res.json();
console.log(data.choices[0].message.content);`;

export default function ChatPage() {
  const router = useRouter();

  // Mode state
  const [activeMode, setActiveMode] = useState<Mode>('chat');

  // Dropdowns & click outside refs
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedSettingsKey, setCopiedSettingsKey] = useState<string | null>(null);
  // API model catalog (loaded from the local backend when settings opens)
  const [apiModels, setApiModels] = useState<{ id: string; description?: string; owned_by?: string }[]>([]);

  const copySettings = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSettingsKey(key);
    setTimeout(() => setCopiedSettingsKey(null), 2000);
  };

  // Handle clicking outside any dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(target)) {
        setHistoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chat conversation state (separate conversation per mode so sending in one
  // tab never mixes into another tab).
  const [messagesByMode, setMessagesByMode] = useState<Record<Mode, Message[]>>({
    chat: [],
    learn: [],
    draw: [],
  });
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState(false);

  const messages = messagesByMode[activeMode];

  // Update the messages for a specific mode (not just the active one). This
  // guarantees async streaming updates always land in the mode the user sent
  // in, even if they switch tabs mid-stream.
  const updateMessagesFor = (mode: Mode, updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesByMode(prev => {
      const current = prev[mode];
      const next = typeof updater === 'function' ? (updater as (p: Message[]) => Message[])(current) : updater;
      return { ...prev, [mode]: next };
    });
  };

  // Drawing Mode Artboard Studio State
  const [drawAspectRatio, setDrawAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16'>('16:9');
  const [drawStyle, setDrawStyle] = useState<'realistic' | 'sketch' | 'ink'>('realistic');
  const [penCount, setPenCount] = useState<number>(2);
  const [currentDrawingSvg, setCurrentDrawingSvg] = useState<string>('');
  const drawMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Drawing Canvas Pan & Zoom State (Isolated to drawing sheet, never zooms browser page)
  const [drawZoom, setDrawZoom] = useState(100);
  const [drawPan, setDrawPan] = useState({ x: 0, y: 0 });
  const [isDrawPanning, setIsDrawPanning] = useState(false);
  const [drawPanStart, setDrawPanStart] = useState({ x: 0, y: 0 });
  const drawCanvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Native non-passive wheel listener on window for Draw mode to 100% prevent browser zoom and zoom ONLY the sheet
  useEffect(() => {
    if (activeMode !== 'draw') return;

    const handleWheel = (e: WheelEvent) => {
      // 100% prevent browser page zoom (Ctrl+Wheel, pinch-zoom, and mouse wheel)
      e.preventDefault();
      e.stopPropagation();

      // Zoom ONLY the drawing sheet
      const delta = e.deltaY > 0 ? -8 : 8;
      const step = e.ctrlKey ? delta * 1.5 : delta;
      setDrawZoom(prev => Math.min(300, Math.max(30, Math.round(prev + step))));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeMode]);

  // Window-level mouse move and mouse up listeners for smooth canvas dragging/panning
  useEffect(() => {
    if (!isDrawPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      setDrawPan({
        x: e.clientX - drawPanStart.x,
        y: e.clientY - drawPanStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDrawPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDrawPanning, drawPanStart]);

  // Block browser zoom keyboard shortcuts in draw mode and zoom sheet instead
  useEffect(() => {
    if (activeMode !== 'draw') return;

    const handleKeyDownZoom = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setDrawZoom(prev => Math.min(300, prev + 15));
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setDrawZoom(prev => Math.max(30, prev - 15));
        } else if (e.key === '0') {
          e.preventDefault();
          setDrawZoom(100);
          setDrawPan({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownZoom);
    return () => window.removeEventListener('keydown', handleKeyDownZoom);
  }, [activeMode]);

  const handleDrawMouseDown = (e: React.MouseEvent) => {
    // Only exclude UI controls (buttons, inputs, aside panels), allow dragging on canvas and the sheet!
    if ((e.target as HTMLElement).closest('button, input, textarea, aside, header')) return;
    setIsDrawPanning(true);
    setDrawPanStart({ x: e.clientX - drawPan.x, y: e.clientY - drawPan.y });
  };

  const handleResetDrawView = () => {
    setDrawZoom(100);
    setDrawPan({ x: 0, y: 0 });
  };

  // Settings
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('You are Gemini Free, an expert full-stack AI engineer.');

  // User
  const [user, setUser] = useState({ name: 'Gemini Free User', email: '', quota: 74 });
  
  // Thread ID for database storage (per mode)
  const [threadIds, setThreadIds] = useState<Record<Mode, string | null>>({
    chat: null,
    learn: null,
    draw: null,
  });
  const threadId = threadIds[activeMode];
  
  // Thread history for dropdown
  const [threadHistory, setThreadHistory] = useState<{ id: string; title: string | null; mode: Mode }[]>([]);

  // Per-mode draft inputs so switching tabs never disturbs your unsent text
  const [inputs, setInputs] = useState<Record<Mode, string>>({
    chat: '',
    learn: '',
    draw: '',
  });
  const input = inputs[activeMode];
  const setInput = (val: string) => setInputs(prev => ({ ...prev, [activeMode]: val }));

  // Snapshot of already-saved message content per thread (used by autosave)
  const savedSnapshotRef = useRef<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Messenger-Style Scroll: Always pin chat view to the bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom immediately when switching to 'chat' mode
  useEffect(() => {
    if (activeMode === 'chat') {
      setTimeout(() => scrollToBottom('instant'), 50);
    }
  }, [activeMode]);

  // Load user & chats, instantly anchor to bottom like a messenger
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('gemini-free:user');
      if (savedUser) setUser(prev => ({ ...prev, ...JSON.parse(savedUser) }));
      
      // Load all thread IDs from localStorage
      const savedThreadIds = localStorage.getItem('gemini-free:thread-ids');
      if (savedThreadIds) {
        const parsed = JSON.parse(savedThreadIds);
        setThreadIds(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Load thread history for dropdown
  useEffect(() => {
    fetch(`/api/threads?mode=${activeMode}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setThreadHistory(data);
        }
      })
      .catch(() => {});
  }, [activeMode]);

  // Load chat engine models list from the local backend whenever settings opens
  useEffect(() => {
    if (!settingsOpen) return;
    let cancelled = false;
    fetch('/api/v1/models')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.data) setApiModels(data.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [settingsOpen]);

  // Load messages when thread ID or mode changes
  useEffect(() => {
    if (!threadId) {
      updateMessagesFor(activeMode, []);
      return;
    }
    
    fetch(`/api/threads/messages?thread_id=${threadId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          updateMessagesFor(activeMode, data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            reasoning: m.reasoning || undefined,
            timestamp: m.timestamp,
            mode: activeMode,
          })));
          setTimeout(() => scrollToBottom('instant'), 100);
        } else {
          updateMessagesFor(activeMode, []);
        }
      })
      .catch(() => {
        updateMessagesFor(activeMode, []);
      });
  }, [threadId, activeMode]);

  // Save chats (every non-empty message with upsert) and auto-scroll to bottom.
  // Messages are keyed by thread so switching tabs never disturbs saved history.
  useEffect(() => {
    try {
      // Save thread IDs to localStorage
      localStorage.setItem('gemini-free:thread-ids', JSON.stringify(threadIds));

      // Save to database if we have a thread ID
      if (threadId) {
        for (const m of messages) {
          const isAssistantInProgress = m.role === 'assistant' && isStreaming && m.id === messages[messages.length - 1]?.id;
          if (!m.content || isAssistantInProgress) continue;

          const key = `${threadId}:${m.id}`;
          if (savedSnapshotRef.current[key] === m.content) continue;

          fetch('/api/threads/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thread_id: threadId,
              id: m.id,
              role: m.role,
              content: m.content,
              reasoning: m.reasoning,
              timestamp: m.timestamp,
            }),
          })
            .then(res => {
              if (res.ok) savedSnapshotRef.current[key] = m.content;
            })
            .catch(() => {});
        }
      }
    } catch {}
    scrollToBottom(isStreaming ? 'instant' : 'smooth');
    if (activeMode === 'draw') {
      drawMessagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
    }
  }, [messages, isStreaming, activeMode, threadId]);

  // Auto-resize input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleNewChat = () => {
    // Create a new thread in the database
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newThreadId, title: 'New Chat', mode: activeMode }),
    }).catch(() => {});
    
    setThreadIds(prev => ({ ...prev, [activeMode]: newThreadId }));
    updateMessagesFor(activeMode, []);
    setInput('');
    if (activeMode === 'draw') {
      setCurrentDrawingSvg('');
      handleResetDrawView();
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await fetch(`/api/threads?id=${threadId}`, { method: 'DELETE' });
      setThreadHistory(prev => prev.filter(t => t.id !== threadId));
      if (threadIds[activeMode] === threadId) {
        setThreadIds(prev => ({ ...prev, [activeMode]: null }));
      }
    } catch {}
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

  const handleLogout = () => {
    try {
      document.cookie = "gemini_free_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      localStorage.removeItem('gemini-free:user');
    } catch {}
    router.push('/login');
  };

  const handleSubmit = async (promptOverride?: string, files?: AttachedFile[]) => {
    // Capture the mode this submission belongs to. Even if the user switches
    // tabs mid-stream, every message update stays in this mode only.
    const mode = activeMode;
    const promptToSend = promptOverride || input;
    if ((!promptToSend.trim() && (!files || files.length === 0)) || isStreaming) return;

    // Auto-create a persistent thread for this mode if one does not exist yet.
    // Without this, messages are never saved because there is no thread to attach to.
    let activeThreadId = threadIds[mode];
    if (!activeThreadId) {
      activeThreadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeThreadId, title: 'New Chat', mode }),
        });
      } catch {}
      setThreadIds(prev => ({ ...prev, [mode]: activeThreadId }));
    }

    let displayContent = promptToSend.trim();
    if (files && files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      displayContent = displayContent 
        ? `${displayContent}\n\n📎 Attached: ${fileNames}` 
        : `📎 Attached: ${fileNames}`;
    }

    const modeMessages = messagesByMode[mode];

    const userMsg: Message = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
      mode,
    };

    const updatedMessages = [...modeMessages, userMsg];
    updateMessagesFor(mode, updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Auto-title thread based on first user message
    if (modeMessages.length === 0) {
      const autoTitle = displayContent.slice(0, 50) + (displayContent.length > 50 ? '...' : '');
      fetch(`/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeThreadId, title: autoTitle, mode }),
      }).catch(() => {});
      setThreadHistory(prev => 
        prev.map(t => t.id === activeThreadId ? { ...t, title: autoTitle } : t)
      );
    }

    const assistantMsgId = `ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const placeholderMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      mode,
    };

    updateMessagesFor(mode, [...updatedMessages, placeholderMsg]);
    setIsStreaming(true);

    // If in draw mode, clear previous drawing immediately so pen never re-draws the old image
    if (mode === 'draw') {
      setCurrentDrawingSvg('');
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Find display name of currently selected model
      const currentModelObj = MODELS.find(m => m.id === selectedModel);
      const currentModelName = currentModelObj ? currentModelObj.name : selectedModel;

      // Mode-specific instructions
      let modeContext = '';
      if (activeMode === 'draw') {
        const styleInstruction = drawStyle === 'sketch'
          ? 'STYLE: Master Graphite Pencil Sketch. Use authentic hand-drawn sketch lines, fine pencil shading, realistic cross-hatching, organic contour lines, charcoal/graphite texture, and tonal depth.'
          : drawStyle === 'ink'
          ? 'STYLE: Master Fine Ink & Quill. Use intricate pen-and-ink linework, precision stippling, hatching, calligraphic strokes, and master engraving line art.'
          : 'STYLE: Realistic Master Digital Painting. Use 3D volumetric lighting, rich organic shading gradients, specular highlights, realistic anatomical proportions, intricate textures (skin, hair strands, fabric folds, metallic reflections), and atmospheric depth.';

        modeContext = `ACTIVE MODE: Draw (Fine Art Studio & Realistic Master Draughtsman).
You are a master fine artist and realistic digital painter renowned for museum-grade drawings.
CRITICAL ARTISTIC DIRECTIVES (EXTREMELY IMPORTANT):
1. NEVER OUTPUT FLAT ICONS, CARTOONS, OR BASIC CLIP-ART:
   - When asked to draw a person, portrait, car, animal, nature, or object, NEVER draw flat childish cartoons, generic icons, or simple solid geometric shapes.
2. CREATE HIGH-FIDELITY, REALISTIC, DETAILED DRAWINGS:
   - ${styleInstruction}
   - Draw with realistic depth, fine organic contour lines, realistic anatomical proportions, multi-layered shading gradients, soft ambient occlusion, directional lighting, realistic textures, and realistic cast shadows.
   - For a person: draw realistic facial proportions (eyes with irises and highlights, realistic nose contour, lips, hair strands with volume and light reflections, neck, collarbone, clothing drapery).
   - Use sophisticated SVG markup: realistic overlapping <path> lines, multi-stop radial and linear gradients for 3D volume, drop shadows, layered pencil strokes, cross-hatching patterns, and subtle background atmospheric shading.
3. The SVG viewBox MUST match the chosen sheet aspect ratio (${drawAspectRatio}):
   - For 1:1 -> viewBox="0 0 1000 1000"
   - For 16:9 -> viewBox="0 0 1600 900"
   - For 4:3 -> viewBox="0 0 1200 900"
   - For 9:16 -> viewBox="0 0 900 1600"
4. PERSISTENT DRAWING (CRITICAL): If there is already a drawing on the sheet (provided below), DO NOT wipe it or restart from scratch unless explicitly requested. Modify, refine, and add to the existing SVG vectors live.
5. In your response, give a brief friendly 1-line note and then output the full complete \`\`\`svg ... \`\`\` block.

Current Sheet Aspect Ratio: ${drawAspectRatio}
${currentDrawingSvg ? `Current Drawing SVG on Sheet:\n\`\`\`xml\n${currentDrawingSvg}\n\`\`\`` : 'The sheet is currently blank.'}`;
      } else if (activeMode === 'learn') {
        modeContext = `ACTIVE MODE: Learn (Database & Systems Exploration Mode).
Your role: Provide Firebase Firestore schemas, security rules, query indexing strategies, Cloud Functions architecture, and best practices.`;
      } else {
        modeContext = `ACTIVE MODE: Chat (Interactive Full-Stack AI Pair Programmer Mode).
Your role: Provide immediate, high-quality, practical coding solutions, debugging, and software architecture guidance.`;
      }

      let researchContext = '';
      if (researchMode) {
        researchContext = `\n[RESEARCH MODE: ACTIVE]: Conduct rigorous, exhaustive architectural and technical research. Cite trade-offs, performance nuances, edge cases, and best practices.`;
      }

      // Strict Identity Prompt: model engine is anonymous
      const strictSystemInstruction = `[CRITICAL IDENTITY & OPERATING DIRECTIVES]
1. IDENTITY: You are "Gemini Free", a state-of-the-art AI developer platform.
2. MODEL ENGINE: You are powered by the "${currentModelName}" engine. The model architecture and training origins are proprietary and anonymous. NEVER attribute the model to Google, OpenAI, Anthropic, or any third party.
3. FORBIDDEN NAMES: NEVER identify yourself as "Gemini", "Bard", or "Google".
   - If asked "Are you Claude, GPT, or Gemini?", answer directly: "I am Gemini Free, powered by Gemini Free's custom engine. I am not Claude, GPT, or Gemini."
4. ANSWER DIRECTLY WHAT IS ASKED (CRITICAL):
   - Be intelligent, concise, and direct. Always address the user's specific question or request directly without robotic monologues or reciting your credentials.
   - For simple greetings like "hey", "hello", or "hi", reply naturally and casually (e.g., "Hey! How can I help you today?"). Do NOT dump a bio or modes summary.
   - If asked a coding, UI design, or architecture question, provide the code and solution immediately without introductory preamble.
5. ${modeContext}${researchContext}
6. APPLICATION MODES KNOWLEDGE:
   - "Chat": Fast interactive programming chat with code streaming.
   - "Learn": Architecture explorer for Firestore collections, data models, and backend design.
   - "Draw": Visual diagramming, live vector sketching, and SVG artboard canvas.

User custom instruction: ${systemPrompt}`;

      // Build message payload supporting multimodal image files and draw mode vector framing
      const messagesForApi = updatedMessages.map((m, idx) => {
        let textContent = m.content;

        // If in draw mode and it's a user message, frame strictly as frontend SVG code generation
        if (activeMode === 'draw' && m.role === 'user') {
          // Extract the actual core subject by stripping all image/drawing action words that trigger Google's Imagen classifier
          const cleanSubject = m.content
            .replace(/\b(?:please\s+)?(?:draw|sketch|paint|illustrate|render|generate|create|make)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+)?/gi, '')
            .replace(/\b(?:draw|sketch|paint|illustrate)\b/gi, '')
            .trim() || m.content;

          const styleSpec = drawStyle === 'sketch'
            ? 'Hand-drawn graphite pencil sketch with organic cross-hatching, contour lines, tonal shading, and paper texture.'
            : drawStyle === 'ink'
            ? 'Intricate fine pen & ink quill line art with cross-hatching, stippling, and engraving aesthetics.'
            : 'Realistic digital painting with 3D volumetric shading, specular lighting, organic gradients, and detailed textures.';

          const viewBoxSpec = drawAspectRatio === '1:1' 
            ? '0 0 1000 1000' 
            : drawAspectRatio === '16:9' 
            ? '0 0 1600 900' 
            : drawAspectRatio === '4:3' 
            ? '0 0 1200 900' 
            : '0 0 900 1600';

          textContent = `[FRONTEND SVG CODE GENERATION TASK]:
Write the complete XML source code for a high-fidelity SVG illustration depicting: "${cleanSubject}".
DO NOT USE IMAGEN OR ANY IMAGE GENERATION TOOL. You are a frontend software engineer writing raw SVG XML markup code.
Requirements:
1. Output format: Provide a valid \`\`\`xml ... \`\`\` code block containing the <svg ...> markup.
2. Aspect ratio: viewBox="${viewBoxSpec}".
3. Style: ${styleSpec}
4. Use rich SVG elements: <defs>, <linearGradient>, <radialGradient>, <path>, <polygon>, <g>, and detailed shapes with depth.`;
        }

        if (idx === updatedMessages.length - 1 && files && files.length > 0) {
          const imageFiles = files.filter(f => f.dataUrl && f.type.startsWith('image/'));
          const docFiles = files.filter(f => !f.type.startsWith('image/'));
          
          if (imageFiles.length > 0) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: textContent },
                ...imageFiles.map(img => ({
                  type: 'image_url',
                  image_url: { url: img.dataUrl }
                })),
                ...docFiles.map(doc => ({
                  type: 'text',
                  text: `[Attached File: ${doc.name}]: ${doc.dataUrl?.slice(0, 1000) || ''}`
                }))
              ]
            };
          }
        }
        return { role: m.role, content: textContent };
      });

      const apiMessages = [
        { role: 'system', content: strictSystemInstruction },
        ...messagesForApi,
      ];

      const res = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeMode === 'draw' ? 'gemini-3.1-pro' : selectedModel,
          messages: apiMessages,
          stream: true,
          temperature,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accContent = '';
      let accReasoning = '';

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
                accReasoning += (delta.reasoning_content || delta.reasoning);
              }
              if (delta.content) {
                accContent += delta.content;
                
                // If in draw mode, extract and stream SVG vectors live to update sheet canvas
                if (activeMode === 'draw') {
                  const svgStartIndex = accContent.search(/<svg/i);
                  if (svgStartIndex !== -1) {
                    const rawSnippet = accContent.slice(svgStartIndex);
                    const svgEndIndex = rawSnippet.search(/<\/svg>/i);
                    if (svgEndIndex !== -1) {
                      // Complete SVG received
                      const completeSvg = rawSnippet.slice(0, svgEndIndex + 6).replace(/```(?:svg|xml)?/gi, '');
                      setCurrentDrawingSvg(completeSvg);
                    } else {
                      // Live stream to sheet: strip trailing half-finished tags and safely close with </svg>
                      const cleanSnippet = rawSnippet.replace(/```(?:svg|xml)?/gi, '').replace(/<[^>]*$/, '');
                      if (cleanSnippet.includes('<svg')) {
                        setCurrentDrawingSvg(cleanSnippet + '</svg>');
                      }
                    }
                  }
                }
              }

              // Scrub image generation refusal text if present, then run the
              // final cleanup pipeline (removes redundant branding repeats,
              // duplicated filler, extra blank lines, etc.).
              const displayClean = cleanAssistantText(
                accContent
                  .replace(/I can search for images, but can't create any for you at the moment[\s\S]*?(?:location yet\.|moment\.)/gi, '')
                  .replace(/I cannot (?:create|generate) images (?:at the moment|right now)[\s\S]*?(?:location yet\.|moment\.)/gi, '')
                  .trim()
              );

              const hasDrawing = Boolean(accContent.includes('<svg'));

              // Only draw mode should show the "Drawing vector artwork" status.
              // Normal chat/learn must never leak drawing-themed fallback text.
              let nextContent = displayClean;
              if (activeMode === 'draw' && !displayClean && !isStreaming) {
                nextContent = hasDrawing
                  ? `🎨 Created ${drawStyle} artwork on the sheet.`
                  : 'Drawing vector artwork...';
              }

              updateMessagesFor(mode, prev => 
                prev.map(m => m.id === assistantMsgId ? {
                  ...m,
                  content: nextContent,
                  reasoning: accReasoning || undefined,
                } : m)
              );
            }
          } catch {}
        }
      }

      // Post-stream verification for draw mode: Ensure complete SVG is set or auto-recover
      if (activeMode === 'draw') {
        const finalSvgMatch = accContent.match(/<svg[\s\S]*?<\/svg>/i);
        if (finalSvgMatch) {
          const finalSvg = finalSvgMatch[0].replace(/```(?:svg|xml)?/gi, '');
          setCurrentDrawingSvg(finalSvg);
          updateMessagesFor(mode, prev => 
            prev.map(m => m.id === assistantMsgId ? {
              ...m,
              content: `🎨 Created ${drawStyle} artwork for "${displayContent}" on the sheet.`
            } : m)
          );
        } else {
          // If no SVG was generated in stream, execute an immediate raw SVG code recovery
          try {
            const viewBoxSpec = drawAspectRatio === '1:1' 
              ? '0 0 1000 1000' 
              : drawAspectRatio === '16:9' 
              ? '0 0 1600 900' 
              : drawAspectRatio === '4:3' 
              ? '0 0 1200 900' 
              : '0 0 900 1600';

            const recoveryRes = await fetch('/api/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gemini-3.1-pro',
                messages: [
                  { role: 'system', content: 'You are an expert SVG coder. Output ONLY valid, complete <svg ...>...</svg> code with no explanation and no markdown fences.' },
                  { role: 'user', content: `Write full XML <svg viewBox="${viewBoxSpec}"> code for a detailed illustration of: ${displayContent}. Use gradients, paths, and rich shading.` }
                ],
                stream: false,
              })
            });

            if (recoveryRes.ok) {
              const recoveryData = await recoveryRes.json();
              const recText = recoveryData.choices?.[0]?.message?.content || '';
              const recMatch = recText.match(/<svg[\s\S]*?<\/svg>/i);
              if (recMatch) {
                const recSvg = recMatch[0].replace(/```(?:svg|xml)?/gi, '');
                setCurrentDrawingSvg(recSvg);
                updateMessagesFor(mode, prev => 
                  prev.map(m => m.id === assistantMsgId ? {
                    ...m,
                    content: `🎨 Created ${drawStyle} artwork for "${displayContent}" on the sheet.`
                  } : m)
                );
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateMessagesFor(mode, prev => 
          prev.map(m => m.id === assistantMsgId ? {
            ...m,
            content: `⚠️ Error: ${err.message || 'Stream disrupted'}`
          } : m)
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

  return (
    <div className="w-screen h-screen bg-[#fafaf9] text-neutral-900 font-sans flex flex-col overflow-hidden relative">
      
      {/* ============================================================ */}
      {/* TOP FLOATING CONTROLS: Left Pill + Center Mode */}
      {/* Covers ONLY content size (pointer-events-none on wrapper) */}
      {/* ============================================================ */}
      <header className="absolute top-4 left-0 right-0 z-40 px-4 sm:px-8 flex items-center justify-between pointer-events-none">
        
        {/* Top-Left Floating Pill Bar (Image 1 style) - covers ONLY its content size */}
        <div className="pointer-events-auto flex items-center gap-3 relative w-fit" ref={historyDropdownRef}>
          <div className="flex items-center p-1 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-full shadow-md">
            {/* Logo / History dropdown toggle */}
            <button
              onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
              title="Chat History"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                historyDropdownOpen ? 'bg-neutral-100 shadow-xs text-orange-600' : 'text-neutral-700 hover:text-neutral-900'
              }`}
            >
              <Flame size={18} fill={historyDropdownOpen ? "#ff9100" : "none"} />
            </button>

            {/* Plus Button: New Chat */}
            <button
              onClick={handleNewChat}
              title="New Session"
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer"
            >
              <Plus size={18} />
            </button>

            {/* Log Out Button */}
            <button
              onClick={handleLogout}
              title="Log out"
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          </div>

          <span className="hidden sm:inline-block text-xs font-bold tracking-tight text-neutral-800 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-200/60 shadow-2xs">
            Gemini <span className="text-neutral-400 font-normal">Free</span>
          </span>

          {/* macOS Style History Dropdown */}
          {historyDropdownOpen && (
            <div className="absolute left-0 top-12 z-50 w-72 p-2 bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-2xl shadow-xl animate-in fade-in-50 zoom-in-95 text-left">
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  {activeMode === 'chat' ? 'Chat' : activeMode === 'learn' ? 'Learn' : 'Draw'} History
                </span>
                <button 
                  onClick={() => { handleNewChat(); setHistoryDropdownOpen(false); }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New</span>
                </button>
              </div>

              <div className="py-1 space-y-0.5 max-h-60 overflow-y-auto">
                {threadHistory.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-neutral-400 font-mono">
                    No history yet. Start a new chat!
                  </div>
                ) : (
                  threadHistory.map((thread) => (
                    <div
                      key={thread.id}
                      className={`group relative flex items-center rounded-xl transition cursor-pointer ${
                        threadId === thread.id
                          ? 'bg-orange-50/70 border border-orange-200/50'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setThreadIds(prev => ({ ...prev, [activeMode]: thread.id }));
                          setHistoryDropdownOpen(false);
                        }}
                        className="flex-1 px-3 py-2 text-left text-xs flex items-center gap-2"
                      >
                        {activeMode === 'chat' && <MessageSquare size={14} className={threadId === thread.id ? 'text-orange-500' : 'text-neutral-400'} />}
                        {activeMode === 'learn' && <Database size={14} className={threadId === thread.id ? 'text-orange-500' : 'text-neutral-400'} />}
                        {activeMode === 'draw' && <PenTool size={14} className={threadId === thread.id ? 'text-orange-500' : 'text-neutral-400'} />}
                        <span className={`truncate ${threadId === thread.id ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
                          {thread.title || 'Untitled Chat'}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute right-2 p-1 rounded hover:bg-red-100 text-neutral-400 hover:text-red-500 transition-all"
                        title="Delete thread"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between px-3 py-1 text-[10px] text-neutral-400 font-mono">
                <span>{threadHistory.length} thread{threadHistory.length !== 1 ? 's' : ''}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Center Segmented Mode Bar (covers ONLY its content size) */}
        <div className="pointer-events-auto w-fit mx-auto flex items-center p-1 bg-white/95 backdrop-blur-md rounded-full border border-neutral-200/80 shadow-md">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'learn', label: 'Learn', icon: Compass },
            { id: 'draw', label: 'Draw', icon: PenTool },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id as Mode)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs scale-[1.02]'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-orange-500' : 'text-neutral-400'} />
                <span className={isActive ? 'inline font-extrabold text-white' : 'hidden sm:inline font-medium'}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer to keep center mode bar truly centered without profile pill */}
        <div className="pointer-events-none w-px h-px hidden sm:block" aria-hidden />
      </header>

      {/* ============================================================ */}
      {/* MAIN BODY: Dynamic Mode Canvas (100% full screen) */}
      {/* ============================================================ */}
      <main className={`w-full h-full flex-1 flex flex-col justify-between overflow-y-auto relative ${
        activeMode === 'draw' || activeMode === 'learn' ? 'p-0' : 'p-4 sm:p-8 pt-20 sm:pt-20'
      }`}>
            
            {/* ---------------------------------------------------- */}
            {/* MODE 1: CHAT */}
            {/* ---------------------------------------------------- */}
            {activeMode === 'chat' && (
              <div className="flex-1 flex flex-col justify-between max-w-3xl mx-auto w-full">
                
                {/* Empty State / Heading */}
                {messages.length === 0 ? (
                  <div className="my-auto text-center py-8">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 mb-8">
                      What can I help you build?
                    </h1>

                    {/* Floating Input Capsule matching exact design from image */}
                    <div className="mb-6">
                      <ChatInputCapsule
                        input={input}
                        setInput={setInput}
                        onSubmit={handleSubmit}
                        placeholder="Ask me anything..."
                        isStreaming={isStreaming}
                        onStop={handleStop}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        models={MODELS}
                        mode="chat"
                        researchMode={researchMode}
                        setResearchMode={setResearchMode}
                      />
                    </div>
                  </div>
                ) : (
                  /* Active Message Stream Thread */
                  <div className="flex-1 overflow-y-auto space-y-6 pb-28 text-left">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-400 uppercase font-mono">
                          <span>{msg.role === 'user' ? 'YOU' : 'GEMINI FREE'}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        {/* Thought Process Accordion */}
                        {msg.role === 'assistant' && msg.reasoning && (
                          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs font-mono text-purple-900">
                            <div className="font-bold flex items-center gap-1.5 mb-1 text-purple-700">
                              <Brain size={14} />
                              <span>Reasoning Process ({msg.reasoning.length} chars)</span>
                            </div>
                            <div className="text-[11px] whitespace-pre-wrap leading-relaxed opacity-90 max-h-40 overflow-y-auto">
                              {msg.reasoning}
                            </div>
                          </div>
                        )}

                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-neutral-900 text-white font-medium ml-auto max-w-[85%]'
                            : 'bg-white border border-neutral-200/90 text-neutral-800 shadow-xs mr-auto max-w-full'
                        }`}>
                          {msg.role === 'assistant' && !msg.content && isStreaming ? (
                            <div className="flex items-center gap-2.5 text-neutral-500 font-mono text-xs py-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                              <span className="animate-pulse font-semibold text-neutral-700">Thinking & formulating response...</span>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                          {msg.role === 'assistant' && msg.content && (
                            <div className="pt-2 mt-2 border-t border-neutral-100 flex justify-end">
                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="text-neutral-400 hover:text-neutral-800 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Floating Bottom Input Capsule when chatting */}
                {messages.length > 0 && (
                  <div className="sticky bottom-0 w-full pt-4 pb-2 bg-gradient-to-t from-white via-white/90 to-transparent">
                    <ChatInputCapsule
                      input={input}
                      setInput={setInput}
                      onSubmit={handleSubmit}
                      placeholder="Reply or ask follow-up..."
                      isStreaming={isStreaming}
                      onStop={handleStop}
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      models={MODELS}
                      mode="chat"
                      researchMode={researchMode}
                      setResearchMode={setResearchMode}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* MODE 2: LEARN */}
            {/* ---------------------------------------------------- */}
            {activeMode === 'learn' && (
              <div className="absolute inset-0 z-10 w-full h-full">
                <ExploreGraph
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                />
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* MODE 3: DRAW (Full Sheet Canvas, Movable/Zoomable, Right Controls Panel, Center Input) */}
            {/* ---------------------------------------------------- */}
            {activeMode === 'draw' && (
              <div 
                ref={drawCanvasContainerRef}
                onMouseDown={handleDrawMouseDown}
                className={`absolute inset-0 z-10 w-full h-full flex overflow-hidden bg-[#fafaf9] select-none ${
                  isDrawPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                
                {/* Right Floating Sidebar: Resolution Selector, Zoom Controls & AI Response Card */}
                <aside className="absolute top-20 right-4 sm:right-6 z-30 w-64 sm:w-72 bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-3xl p-3.5 sm:p-4 shadow-xl flex flex-col gap-3 pointer-events-auto">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Sheet Canvas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentDrawingSvg && (
                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                          <Lock size={10} className="text-orange-500" />
                          <span>Locked</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {drawAspectRatio}
                      </span>
                    </div>
                  </div>

                  {/* Start New Sheet Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDrawingSvg('');
                      handleResetDrawView();
                      setInput('');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99]"
                    title="Start a fresh new sheet canvas"
                  >
                    <Plus size={14} className="text-orange-400 stroke-[2.5]" />
                    <span>Start New Sheet</span>
                  </button>

                  {/* 4 Resolution Buttons (Locked when drawing is present on sheet) */}
                  <div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/80">
                      {[
                        { id: '1:1', label: '1:1' },
                        { id: '16:9', label: '16:9' },
                        { id: '4:3', label: '4:3' },
                        { id: '9:16', label: '9:16' },
                      ].map(btn => {
                        const isLocked = Boolean(currentDrawingSvg);
                        const isSelected = drawAspectRatio === btn.id;

                        return (
                          <button
                            key={btn.id}
                            type="button"
                            disabled={isLocked && !isSelected}
                            onClick={() => {
                              if (!isLocked) setDrawAspectRatio(btn.id as any);
                            }}
                            title={
                              isLocked 
                                ? "Resolution is locked while drawing is on sheet. Click Clear to start a new sheet." 
                                : `Set resolution to ${btn.label}`
                            }
                            className={`py-1.5 px-1 rounded-xl text-center font-mono text-xs transition ${
                              isSelected
                                ? 'bg-neutral-900 text-white font-bold shadow-xs cursor-default'
                                : isLocked
                                ? 'text-neutral-400 opacity-40 cursor-not-allowed'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80 cursor-pointer'
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Art Medium & Realistic Style Selector */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                      Medium & Style
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/80">
                      {[
                        { id: 'realistic', label: '🎨 Realistic' },
                        { id: 'sketch', label: '✏️ Pencil' },
                        { id: 'ink', label: '✒️ Ink Quill' },
                      ].map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setDrawStyle(style.id as any)}
                          className={`py-1.5 px-0.5 rounded-xl text-center text-[11px] font-medium transition cursor-pointer ${
                            drawStyle === style.id
                              ? 'bg-neutral-900 text-white font-bold shadow-xs'
                              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Drawing Pens Selector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                      <span>Drawing Pens</span>
                      <span className="text-neutral-700 font-semibold">{penCount} {penCount === 1 ? 'Pen' : 'Pens'}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/80">
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPenCount(num)}
                          className={`py-1.5 px-1 rounded-xl text-center font-mono text-xs transition cursor-pointer ${
                            penCount === num
                              ? 'bg-neutral-900 text-white font-bold shadow-xs'
                              : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
                          }`}
                        >
                          {num} {num === 1 ? 'Pen' : 'Pens'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Canvas Zoom & Pan Controls (Isolated to sheet, never zooms browser page) */}
                  <div className="flex items-center justify-between p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/80 text-neutral-600">
                    <button
                      type="button"
                      onClick={() => setDrawZoom(prev => Math.max(30, prev - 15))}
                      title="Zoom Out Sheet"
                      className="w-7 h-7 rounded-xl hover:bg-white flex items-center justify-center transition cursor-pointer text-xs"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDrawView}
                      title="Click to reset view (100% & Center)"
                      className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold text-neutral-800 hover:bg-white transition cursor-pointer"
                    >
                      {drawZoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawZoom(prev => Math.min(300, prev + 15))}
                      title="Zoom In Sheet"
                      className="w-7 h-7 rounded-xl hover:bg-white flex items-center justify-center transition cursor-pointer text-xs"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDrawView}
                      title="Reset Position & Zoom"
                      className="w-7 h-7 rounded-xl hover:bg-white flex items-center justify-center transition cursor-pointer text-xs"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>

                  {/* Compact AI Response Card (Only shows AI response, 3-4 lines max) */}
                  {(() => {
                    const latestAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.mode === 'draw');
                    const cleanContent = latestAiMsg 
                      ? latestAiMsg.content.replace(/```(?:svg|xml)[\s\S]*?```/gi, '').trim() 
                      : '';

                    return (
                      <div className="p-3 rounded-2xl bg-neutral-900 text-white shadow-sm border border-neutral-800 text-left transition-all">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Gemini Free Artist</span>
                          </div>
                          {currentDrawingSvg && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentDrawingSvg('');
                                handleResetDrawView();
                              }}
                              className="text-[10px] text-neutral-400 hover:text-orange-400 transition cursor-pointer font-mono"
                              title="Clear sheet and unlock resolution"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {isStreaming ? (
                          <div className="flex items-center gap-2 text-orange-400 font-mono text-xs py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                            <span className="animate-pulse">Drawing live with pen...</span>
                          </div>
                        ) : cleanContent ? (
                          <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed font-sans">
                            {cleanContent}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-400 italic line-clamp-2 leading-relaxed">
                            Ready to draw on the sheet canvas.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                </aside>

                {/* Canvas Workspace: Movable & Zoomable Sheet */}
                <section className="w-full h-full overflow-hidden flex flex-col items-center justify-center pt-20 sm:pt-24 pb-28 sm:pb-32 px-4 sm:px-12 relative bg-[#fafaf9]">
                  
                  {/* Subtle Canvas Dot Pattern */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.14) 1.2px, transparent 1.2px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Movable & Zoomable Artboard Sheet Wrapper */}
                  <div
                    style={{
                      transform: `translate(${drawPan.x}px, ${drawPan.y}px) scale(${drawZoom / 100})`,
                      transformOrigin: 'center center',
                      transition: isDrawPanning ? 'none' : 'transform 0.1s ease-out',
                    }}
                    className="flex items-center justify-center pointer-events-auto"
                  >
                    {/* Pure Paper Sheet Card (ONLY drawing, zero text overlays) */}
                    <div
                      style={{
                        aspectRatio: drawAspectRatio === '1:1' ? '1 / 1' : drawAspectRatio === '16:9' ? '16 / 9' : drawAspectRatio === '4:3' ? '4 / 3' : '9 / 16',
                        width: drawAspectRatio === '9:16' ? 'auto' : '100vw',
                        height: drawAspectRatio === '9:16' ? 'calc(100vh - 190px)' : 'auto',
                        maxWidth: drawAspectRatio === '9:16' ? '460px' : drawAspectRatio === '1:1' ? '740px' : '1100px',
                        maxHeight: 'calc(100vh - 190px)',
                      }}
                      className="relative bg-white rounded-3xl border border-neutral-200/90 shadow-2xl shadow-neutral-900/15 flex items-center justify-center overflow-hidden transition-all duration-300 select-none group"
                    >
                      {/* Realistic Pen Artboard: Real stroke tracing with physical pen tracking directly on active lines */}
                      {currentDrawingSvg ? (
                        <RealPenArtboard
                          svgContent={currentDrawingSvg}
                          isStreaming={isStreaming}
                          aspectRatio={drawAspectRatio}
                          drawStyle={drawStyle}
                          penCount={penCount}
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* Floating Center Chat Input Capsule (matching other pages) */}
                  <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30 pointer-events-auto">
                    <div className="flex items-center gap-2 p-2 bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-2xl shadow-xl">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                        placeholder="Describe what to draw..."
                        className="flex-1 px-3 py-2 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || isStreaming}
                        className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>

                </section>

              </div>
            )}

          </main>

        {/* ============================================================ */}
        {/* BOTTOM-LEFT BAR: Settings */}
        {/* ============================================================ */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 flex items-center gap-2">
          <div className="flex items-center p-1 bg-white/90 backdrop-blur-md border border-neutral-200 rounded-full shadow-md">
            <button
              onClick={() => setSettingsOpen(true)}
              title="Workspace Settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition cursor-pointer"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

      {/* ============================================================ */}
      {/* SETTINGS MODAL */}
      {/* ============================================================ */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full p-6 text-left shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 font-bold text-sm text-neutral-900">
                <Settings size={16} />
                <span>Workspace Settings</span>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-6 text-xs text-neutral-700">

              {/* -------------------- Engine preferences -------------------- */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono border-b border-neutral-100 pb-1">
                  Engine Preferences
                </div>

                <div>
                  <label className="block font-bold mb-1">Model Engine</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none cursor-pointer"
                  >
                    {MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Temperature ({temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">System Instructions</label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none resize-none font-sans"
                  />
                </div>
              </div>

              {/* -------------------- Local API Info -------------------- */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                  <Terminal size={12} /> Local API
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Base URL</div>
                      <div className="text-sm font-mono text-neutral-900 select-all">{typeof window !== 'undefined' ? window.location.origin : ''}</div>
                    </div>
                    <button
                      onClick={() => typeof window !== 'undefined' && copySettings('base', window.location.origin)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 font-semibold transition cursor-pointer"
                    >
                      {copiedSettingsKey === 'base' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedSettingsKey === 'base' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-2.5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Chat Completions</div>
                      <div className="text-xs font-mono text-neutral-800">POST /api/v1/chat/completions</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Models List</div>
                      <div className="text-xs font-mono text-neutral-800">GET /api/v1/models</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Health Check</div>
                      <div className="text-xs font-mono text-neutral-800">GET /api</div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-2.5 text-[11px] text-neutral-500 leading-relaxed">
                    Authentication is optional when no API keys are configured. If keys are set, pass them as a
                    <span className="font-mono text-neutral-700"> Authorization: Bearer &lt;key&gt;</span> header
                    or <span className="font-mono text-neutral-700">x-api-key</span>.
                  </div>
                </div>

                {/* Models catalog */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono mb-1.5">
                    Available Models ({apiModels.length || MODELS.length})
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {(apiModels.length
                      ? apiModels
                      : MODELS.map(m => ({ id: m.id, description: m.desc }))
                    ).map((mdl, i) => (
                      <div key={mdl.id} className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-2.5">
                        <Cpu size={14} className="text-orange-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-neutral-900 text-[11px] break-all">{mdl.id}</div>
                          {mdl.description && (
                            <div className="text-[10px] text-neutral-500 mt-0.5">{mdl.description}</div>
                          )}
                        </div>
                        {(apiModels.length === 0) && (
                          <button
                            onClick={() => copySettings(`model-${i}`, mdl.id)}
                            className="ml-auto shrink-0 text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
                            title="Copy model id"
                          >
                            {copiedSettingsKey === `model-${i}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* -------------------- Usage examples -------------------- */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                  <Code2 size={12} /> How to use the AI API
                </div>

                {/* curl */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-neutral-700 flex items-center gap-1"><Terminal size={12} /> cURL</span>
                    <button
                      onClick={() => copySettings('curl', CURL_EXAMPLE.replaceAll('{BASE_URL}', typeof window !== 'undefined' ? window.location.origin : ''))}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 font-semibold transition cursor-pointer"
                    >
                      {copiedSettingsKey === 'curl' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedSettingsKey === 'curl' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="rounded-xl bg-neutral-950 text-neutral-100 text-[10.5px] font-mono p-3.5 overflow-x-auto leading-relaxed whitespace-pre">{CURL_EXAMPLE.replaceAll('{BASE_URL}', typeof window !== 'undefined' ? window.location.origin : '')}</pre>
                </div>

                {/* JavaScript */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-neutral-700 flex items-center gap-1"><Code2 size={12} /> JavaScript (fetch)</span>
                    <button
                      onClick={() => copySettings('js', JS_EXAMPLE.replaceAll('{BASE_URL}', typeof window !== 'undefined' ? window.location.origin : ''))}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 font-semibold transition cursor-pointer"
                    >
                      {copiedSettingsKey === 'js' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedSettingsKey === 'js' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="rounded-xl bg-neutral-950 text-neutral-100 text-[10.5px] font-mono p-3.5 overflow-x-auto leading-relaxed whitespace-pre">{JS_EXAMPLE.replaceAll('{BASE_URL}', typeof window !== 'undefined' ? window.location.origin : '')}</pre>
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
