import React from 'react';
import { motion } from 'motion/react';

interface AgentShowcaseSectionProps {
  onOpenStudio: (prompt?: string) => void;
}

export function AgentShowcaseSection({ onOpenStudio }: AgentShowcaseSectionProps) {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 overflow-hidden bg-[#faf6f0] border-t border-[#f0e6d6] select-none">
      
      {/* Decorative Yellow Curling Ribbon Vectors on Left & Right matching uploaded image */}
      <div className="absolute top-12 left-4 sm:left-12 w-32 sm:w-52 h-[450px] pointer-events-none opacity-90 z-0">
        <svg viewBox="0 0 160 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#f6cb77]">
          <path
            d="M -10,30 C 90,70 140,140 70,200 C 10,250 20,320 90,340 C 160,360 120,410 40,420"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="absolute top-16 right-4 sm:right-12 w-32 sm:w-52 h-[450px] pointer-events-none opacity-90 z-0">
        <svg viewBox="0 0 160 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#f6cb77]">
          <path
            d="M 170,20 C 70,60 30,130 80,190 C 140,250 130,320 70,350 C 10,380 40,420 130,430"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center text-center my-auto py-8">
        
        {/* Playful Cursive Script: "about our chatbot's" */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-1"
        >
          <span 
            className="text-2xl sm:text-3xl font-bold text-[#e06287] tracking-wide" 
            style={{ fontFamily: '"Comic Sans MS", "Caveat", "Brush Script MT", cursive' }}
          >
            about Gemini Free's
          </span>
        </motion.div>

        {/* Main Graphic Title: "superpowers" styled EXACTLY like PORTFOLIO in Image 1 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative inline-flex items-center justify-center select-none mb-4"
        >
          {/* Sparkle Stars around typography matching image 1 */}
          <div className="absolute -top-5 -left-6 text-[#f6cb77] animate-pulse">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>
          <div className="absolute -top-3 left-1/3 text-[#f6cb77]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>
          <div className="absolute -bottom-4 left-1/4 text-[#f6cb77]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>
          <div className="absolute -top-2 right-1/4 text-[#f6cb77]">
            <span className="w-3.5 h-3.5 rounded-full bg-[#f6cb77] inline-block shadow-xs"></span>
          </div>
          <div className="absolute -bottom-3 -right-6 text-[#f6cb77] animate-pulse">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
          </div>

          {/* Stylized Typography for "superpowers" */}
          <div className="flex items-center text-5xl sm:text-7xl md:text-8xl font-black tracking-tight drop-shadow-xs">
            {/* s */}
            <span className="text-[#d9537e]">s</span>
            {/* u */}
            <span className="text-[#d9537e] relative mx-0.5">
              u
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#f6cb77] text-xs pointer-events-none">✦</span>
            </span>
            {/* p in olive green */}
            <span className="text-[#769352] transform rotate-3 mx-0.5">p</span>
            {/* e */}
            <span className="text-[#d9537e] mx-0.5">e</span>
            {/* r */}
            <span className="text-[#d9537e] mx-0.5">r</span>
            {/* p */}
            <span className="text-[#d9537e] mx-0.5">p</span>
            {/* o in olive green */}
            <span className="text-[#769352] transform -rotate-3 mx-0.5">o</span>
            {/* w */}
            <span className="text-[#d9537e] mx-0.5">w</span>
            {/* e */}
            <span className="text-[#d9537e] mx-0.5">e</span>
            {/* r in soft ribbon loop */}
            <span className="text-[#f4a7c6] font-serif italic mx-0.5 transform -rotate-3">r</span>
            {/* s */}
            <span className="text-[#d9537e]">s</span>
          </div>
        </motion.div>

        {/* Clear Subtitle Explaining the Chatbot */}
        <p className="max-w-2xl text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed mb-8 sm:mb-12">
          Powered by DeepMind and Gemini, Gemini Free delivers conversational answers, live code generation, Firestore guides, and creative problem solving.
        </p>

        {/* Multiple Non-Clickable Feature Transform Boxes in Image 2 Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl text-left">
          
          {/* Feature 1: Visual Craft */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="relative inline-block select-none pointer-events-none"
          >
            <div className="relative p-6 sm:p-8 border-2 border-dashed border-neutral-900 bg-white/80 rounded-xs transform -rotate-2 shadow-xs">
              <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-[#f4a7c6] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#f4a7c6] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#f4a7c6] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#f4a7c6] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>

              <div className="text-center space-y-0 leading-none">
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans">
                  chat
                </div>
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans -mt-1 sm:-mt-2">
                  mode
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-[10px] text-neutral-500 font-serif italic mb-1 uppercase tracking-wider">
                  conversational AI workspace
                </div>
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#fce7f3] border border-[#f4a7c6] text-[#d9537e] text-xs font-semibold tracking-wide">
                  full-stack code, firebase & brainstorming help
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 2: Code Engine */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative inline-block select-none pointer-events-none"
          >
            <div className="relative p-6 sm:p-8 border-2 border-dashed border-neutral-900 bg-white/80 rounded-xs transform rotate-1 shadow-xs">
              <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-[#a7f3d0] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#a7f3d0] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#a7f3d0] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#a7f3d0] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>

              <div className="text-center space-y-0 leading-none">
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans">
                  learn
                </div>
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans -mt-1 sm:-mt-2">
                  mode
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-[10px] text-neutral-500 font-serif italic mb-1 uppercase tracking-wider">
                  guided systems exploration
                </div>
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] text-xs font-semibold tracking-wide">
                  database & architecture walkthroughs
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 3: Deep Reason */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative inline-block select-none pointer-events-none"
          >
            <div className="relative p-6 sm:p-8 border-2 border-dashed border-neutral-900 bg-white/80 rounded-xs transform -rotate-1 shadow-xs">
              <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-[#fde68a] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#fde68a] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#fde68a] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#fde68a] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>

              <div className="text-center space-y-0 leading-none">
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans">
                  draw
                </div>
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans -mt-1 sm:-mt-2">
                  mode
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-[10px] text-neutral-500 font-serif italic mb-1 uppercase tracking-wider">
                  diagramming & artboard canvas
                </div>
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#d97706] text-xs font-semibold tracking-wide">
                  sketch, whiteboard & visualize any idea
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 4: Live Sync */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="relative inline-block select-none pointer-events-none"
          >
            <div className="relative p-6 sm:p-8 border-2 border-dashed border-neutral-900 bg-white/80 rounded-xs transform rotate-2 shadow-xs">
              <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-[#bae6fd] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#bae6fd] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#bae6fd] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#bae6fd] border-2 border-neutral-900 shadow-xs"></div>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-neutral-900"></div>

              <div className="text-center space-y-0 leading-none">
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans">
                  local
                </div>
                <div className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase font-sans -mt-1 sm:-mt-2">
                  AI API
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-[10px] text-neutral-500 font-serif italic mb-1 uppercase tracking-wider">
                  openai-compatible server built in
                </div>
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#f0f9ff] border border-[#bae6fd] text-[#0284c7] text-xs font-semibold tracking-wide">
                  chat completions, models & streaming
                </div>
              </div>
            </div>
          </motion.div>

        </div>

      </div>

    </section>
  );
}
