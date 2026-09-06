'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Paperclip,
  Compass, 
  ChevronDown, 
  Mic, 
  X, 
  ArrowUp, 
  Square, 
  Image as ImageIcon, 
  FileText,
  Sparkles,
  Check
} from 'lucide-react';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

interface ChatInputCapsuleProps {
  input: string;
  setInput: (val: string) => void;
  onSubmit: (promptOverride?: string, files?: AttachedFile[]) => void;
  placeholder?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: { id: string; name: string; desc?: string }[];
  mode?: 'chat' | 'learn' | 'draw';
  researchMode?: boolean;
  setResearchMode?: (val: boolean) => void;
}

export function ChatInputCapsule({
  input,
  setInput,
  onSubmit,
  placeholder = 'What would you like to build or ask?',
  isStreaming = false,
  onStop,
  selectedModel,
  setSelectedModel,
  models,
  mode = 'chat',
  researchMode,
  setResearchMode,
}: ChatInputCapsuleProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [localResearchMode, setLocalResearchMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  const activeResearch = researchMode !== undefined ? researchMode : localResearchMode;
  const toggleResearch = () => {
    if (setResearchMode) {
      setResearchMode(!activeResearch);
    } else {
      setLocalResearchMode(!localResearchMode);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modelMenuRef.current && !modelMenuRef.current.contains(target)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      // Strictly accept images and documents like PDF, DOC, TXT
      const isImage = file.type.startsWith('image/');
      const isDoc = file.type === 'application/pdf' || 
                    file.name.endsWith('.pdf') || 
                    file.name.endsWith('.doc') || 
                    file.name.endsWith('.docx') || 
                    file.name.endsWith('.txt');
      
      if (!isImage && !isDoc) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: file.type || (isImage ? 'image/png' : 'application/pdf'),
            size: file.size,
            dataUrl: event.target?.result as string,
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSubmit(input, attachments);
    setAttachments([]);
  };

  const currentModelObj = models.find(m => m.id === selectedModel);
  const currentModelName = currentModelObj ? currentModelObj.name.split(' (')[0] : 'Gemini Free 3.7 Flash';

  return (
    <div className="relative w-full max-w-3xl mx-auto bg-white border border-neutral-200/85 rounded-[26px] p-3.5 sm:p-4 shadow-lg shadow-neutral-900/5 text-left transition-all duration-200">
      
      {/* Hidden File Input strictly accepting images and files like PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Attachment Previews Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2.5 mb-2 border-b border-neutral-100">
          {attachments.map(file => (
            <div 
              key={file.id} 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-100/90 border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs animate-in fade-in"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon size={13} className="text-orange-500 shrink-0" />
              ) : (
                <FileText size={13} className="text-blue-500 shrink-0" />
              )}
              <span className="max-w-[150px] truncate text-[11px]">{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter(f => f.id !== file.id))}
                className="text-neutral-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                title="Remove file"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Text Area */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="w-full bg-transparent border-none text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 outline-none resize-none leading-relaxed font-sans pr-8"
      />

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-neutral-100">
        
        {/* Left Side: [File Upload Button] + [Research Mode Button] - Hidden in draw mode */}
        {mode !== 'draw' && (
        <div className="flex items-center gap-2">
          {/* File Upload Button (Images + PDFs) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach images or documents (PDF, DOC, TXT)"
            className="h-8.5 px-2.5 sm:px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Paperclip size={14} className="text-neutral-600" />
            <span className="text-[11px] hidden sm:inline">Attach</span>
            {attachments.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Research Mode Button */}
          <button
            type="button"
            onClick={toggleResearch}
            title={activeResearch ? "Research Mode Active (Deep Web & Technical Analysis)" : "Enable Research Mode"}
            className={`h-8.5 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeResearch 
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' 
                : 'bg-white border-neutral-200/80 hover:bg-neutral-50 text-neutral-700'
            }`}
          >
            <Compass size={14} className={activeResearch ? "text-blue-600" : "text-neutral-500"} />
            <span className="text-[11px] font-medium hidden sm:inline">Research</span>
            {activeResearch && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>}
          </button>
        </div>
        )}

        {/* Right Side: [Models Dropdown] + [Mic/Clear] + [Send Button] */}
        <div className="flex items-center gap-2">
          
          {/* 3-Models Dropdown */}
          <div className="relative" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-xs font-semibold text-neutral-800 transition cursor-pointer"
            >
              <span className="text-[11px] truncate max-w-[120px]">{currentModelName}</span>
              <ChevronDown size={12} className="text-neutral-400" />
            </button>

            {modelMenuOpen && (
              <div className="absolute right-0 bottom-11 z-50 w-64 p-1.5 bg-white/98 backdrop-blur-xl border border-neutral-200/90 rounded-2xl shadow-xl space-y-1 text-left animate-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  Select Engine ({models.length} Flagship Models)
                </div>
                {models.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedModel(m.id);
                      setModelMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-left transition flex items-center justify-between ${
                      selectedModel === m.id
                        ? 'bg-orange-50 text-orange-950 font-bold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs">{m.name}</span>
                      {m.desc && <span className="text-[10px] text-neutral-400 font-normal font-sans">{m.desc}</span>}
                    </div>
                    {selectedModel === m.id && <Check size={14} className="text-orange-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice / Clear */}
          {input.length > 0 ? (
            <button
              type="button"
              onClick={() => setInput('')}
              title="Clear text"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="button"
              title="Voice Input"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            >
              <Mic size={15} />
            </button>
          )}

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop Generating"
              className="w-8.5 h-8.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Square size={13} fill="#b91c1c" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() && attachments.length === 0}
              title="Send Prompt"
              className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs ${
                input.trim() || attachments.length > 0
                  ? 'bg-neutral-950 hover:bg-neutral-800 text-white'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={16} strokeWidth={2.4} />
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
