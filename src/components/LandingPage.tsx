'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, ArrowRight, ShieldCheck, Zap, Layers } from 'lucide-react';
import { AgentShowcaseSection } from './AgentShowcaseSection';

interface LandingPageProps {
  onOpenStudio: (initialPrompt?: string) => void;
}

const TECH_LOGOS = [
  {
    id: 'firebase',
    name: 'Firebase',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20" viewBox="0 0 256 351">
        <path fill="#FFC107" d="M0 282.898L103.031 87.279l34.904-65.431c1.799-3.378 6.655-3.32 8.375.1l29.458 58.425L256 282.898l-118.331 66.438c-5.884 3.3-13.087 3.3-18.971 0L0 282.898z"/>
        <path fill="#FFA000" d="M137.935 21.848c1.799-3.378 6.655-3.32 8.375.1l29.458 58.425-72.737 6.906 34.904-65.431z"/>
        <path fill="#FF6F00" d="M0 282.898L103.031 87.279l72.737 6.906L256 282.898l-118.331 66.438c-5.884 3.3-13.087 3.3-18.971 0L0 282.898z"/>
      </svg>
    )
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 text-black" viewBox="0 0 180 180" fill="currentColor">
        <circle cx="90" cy="90" r="90" fill="currentColor"/>
        <path fill="#FFF" d="M149.508 157.52L69.141 54H54v72h14.4V72.587l68.22 88.082a90.15 90.15 0 0012.888-3.149zM113.4 54h14.4v54h-14.4z"/>
      </svg>
    )
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#3178c6] fill-current" viewBox="0 0 24 24">
        <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-1.209-.563 5.03 5.03 0 00-1.393-.195c-.58 0-1.022.12-1.326.362-.303.242-.455.572-.455.99 0 .285.075.523.225.714.15.191.366.353.649.486.282.133.626.257 1.031.373.535.15 1.054.333 1.558.548.504.215.93.492 1.28.831.35.339.613.75.79 1.233.177.483.266 1.05.266 1.701 0 1.01-.223 1.849-.668 2.518-.445.669-1.066 1.171-1.862 1.506a7.868 7.868 0 01-2.736.502c-.732 0-1.458-.066-2.178-.198a9.42 9.42 0 01-1.956-.563v-2.624c.732.42 1.488.742 2.268.966.78.224 1.536.336 2.268.336.632 0 1.112-.119 1.44-.357.328-.238.492-.58.492-1.026 0-.315-.084-.576-.252-.783a2.533 2.533 0 00-.702-.546 8.528 8.528 0 00-1.08-.41 12.3 12.3 0 01-1.524-.523c-.488-.21-.908-.48-1.26-.81a3.02 3.02 0 01-.762-1.209c-.168-.465-.252-1.002-.252-1.611 0-.96.223-1.764.67-2.41.446-.646 1.066-1.134 1.86-1.464.793-.33 1.722-.495 2.786-.495zm-8.87 2.285v10.84h-2.97V12.035H3.606v-2.285h9.458v2.285z"/>
      </svg>
    )
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#38bdf8] fill-current" viewBox="0 0 24 24">
        <path d="M12 6c-3.314 0-5.463 1.657-6.447 4.971 1.326-1.325 2.873-1.822 4.643-1.492.83.155 1.423.754 2.08 1.417C13.33 11.96 14.6 13.25 18.447 13.25c3.314 0 5.463-1.657 6.447-4.971-1.326 1.325-2.873 1.822-4.643 1.492-.83-.155-1.423-.754-2.08-1.417C17.117 7.29 15.847 6 12 6zM5.553 12c-3.314 0-5.463 1.657-6.447 4.971 1.326-1.325 2.873-1.822 4.643-1.492.83.155 1.423.754 2.08 1.417 1.054 1.064 2.324 2.354 6.17 2.354 3.314 0 5.463-1.657 6.447-4.971-1.326 1.325-2.873 1.822-4.643 1.492-.83-.155-1.423-.754-2.08-1.417C10.67 13.29 9.4 12 5.553 12z"/>
      </svg>
    )
  },
  {
    id: 'python',
    name: 'Python',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20" viewBox="0 0 24 24">
        <path fill="#387eb8" d="M11.87 1.05c-3.8 0-3.56 1.65-3.56 1.65l.01 1.71h3.61v.52H6.87s-2.4.27-2.4 3.55c0 3.28 2.1 3.16 2.1 3.16h1.26v-1.77s-.07-2.12 2.1-2.12h3.61s2.03.02 2.03-1.95V3.8c0-1.97-1.91-2.75-3.7-2.75zm-1.83 1.13a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z"/>
        <path fill="#ffe052" d="M12.13 22.95c3.8 0 3.56-1.65 3.56-1.65l-.01-1.71h-3.61v-.52h5.06s2.4-.27 2.4-3.55c0-3.28-2.1-3.16-2.1-3.16h-1.26v1.77s.07 2.12-2.1 2.12h-3.61s-2.03-.02-2.03 1.95v2.01c0 1.97 1.91 2.75 3.7 2.75zm1.83-1.13a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4z"/>
      </svg>
    )
  },
  {
    id: 'react',
    name: 'React',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 stroke-current fill-none animate-spin" style={{ animationDuration: '8s' }} viewBox="-11.5 -10.23174 23 20.46348">
        <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
        <g stroke="#61dafb" strokeWidth="1">
          <ellipse rx="11" ry="4.2"/>
          <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
          <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
        </g>
      </svg>
    )
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap',
    icon: (
      <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#7952b3] fill-current" viewBox="0 0 24 24">
        <path d="M19.1 0H4.9C2.2 0 0 2.2 0 4.9v14.2C0 21.8 2.2 24 4.9 24h14.2c2.7 0 4.9-2.2 4.9-4.9V4.9C24 2.2 21.8 0 19.1 0zM15.4 17.5c-1.1.7-2.6 1.1-4.4 1.1H6.7V5.4h4.5c1.5 0 2.8.4 3.7 1 .9.7 1.4 1.6 1.4 2.8 0 1-.4 1.8-1.1 2.4-.7.6-1.6.9-2.7 1.1v.1c1.3.1 2.3.6 3 1.3.7.7 1.1 1.7 1.1 2.9 0 1.3-.5 2.4-1.2 3.5zm-5.7-9.5H8.3v3.4h1.4c.8 0 1.5-.2 2-.5.5-.4.7-.9.7-1.5 0-.7-.2-1.2-.7-1.5-.5-.4-1.2-.5-2-.5zm.4 5.3H8.3v3.8h1.8c.9 0 1.6-.2 2.1-.6.5-.4.8-1 .8-1.7 0-.7-.3-1.3-.8-1.6-.5-.4-1.2-.5-2.1-.5z"/>
      </svg>
    )
  }
];

function TechLogoAnimator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TECH_LOGOS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const current = TECH_LOGOS[index];

  return (
    <span className="inline-flex items-center justify-center align-middle mx-1.5 sm:mx-3 my-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ y: 16, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="inline-flex items-center justify-center"
          title={current.name}
        >
          {current.icon}
        </motion.div>
      </AnimatePresence>
    </span>
  );
}

export function LandingPage({ onOpenStudio }: LandingPageProps) {
  const scrollToAgentSection = () => {
    const el = document.getElementById('agent-showcase-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafaf9] text-neutral-900 font-sans relative overflow-x-hidden overflow-y-auto snap-y snap-mandatory scroll-smooth">
      
      {/* SECTION 1: Full-screen Hero Section */}
      <section className="w-full min-h-screen flex flex-col justify-between relative snap-start">
        {/* Subtle warm ambient lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-400/10 blur-[150px] pointer-events-none -z-0"></div>

        {/* Top Navigation Bar */}
        <header className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
            {/* Logo with Firebase Flame */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 25L13.5 4.5L18 13.5L25 25C24.5 27.5 20.5 29 16 29C11.5 29 7.5 27.5 7 25Z" fill="url(#fireGradientLight)" />
                  <path d="M12.5 14L16 4.5L19.5 14L22.5 23C21 24.5 18.5 25.5 16 25.5C13.5 25.5 11 24.5 9.5 23L12.5 14Z" fill="#FFA000" />
                  <path d="M14.5 17L16 13L17.5 17L19 21C18 22 17 22.5 16 22.5C15 22.5 14 22 13 21L14.5 17Z" fill="#FFCA28" />
                  <defs>
                    <linearGradient id="fireGradientLight" x1="16" y1="4.5" x2="16" y2="29" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FF5722" />
                      <stop offset="0.5" stopColor="#FFA000" />
                      <stop offset="1" stopColor="#FFCA28" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-xl font-bold text-neutral-900 tracking-tight">
                Gemini <span className="font-semibold text-neutral-600">Free</span>
              </span>
            </button>
          </div>

          {/* Studio Quick Access */}
          <div>
            <button
              onClick={() => onOpenStudio()}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs transition cursor-pointer"
            >
              Enter Gemini Free
            </button>
          </div>
        </header>

        {/* Hero Body Centered in Viewport */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto py-12">
          
          {/* Giant Headline */}
          <div className="mb-6 space-y-2">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-neutral-900 tracking-tight leading-[1.08] flex items-center justify-center flex-wrap gap-x-3 gap-y-1">
              <span>The full</span>
              <TechLogoAnimator />
              <span>stack</span>
            </h1>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-neutral-900 tracking-tight leading-[1.08]">
              AI workspace
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed font-normal mb-10">
            Gemini Free is a self-hosted AI workspace with three modes — Chat, Learn, and Draw — plus a local OpenAI-compatible API. Pair-program with the AI, explore data models, sketch diagrams, and keep everything on your machine.
          </p>

          {/* Primary CTA Button */}
          <div>
            <button
              id="btn-open-firebase-builder"
              onClick={() => onOpenStudio()}
              className="group relative inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#ff9100] hover:bg-[#ffa726] active:bg-[#f57c00] text-black font-bold text-base sm:text-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Open Gemini Free</span>
            </button>
          </div>

        </main>

        {/* Bottom Scroll Arrow Indicator */}
        <div className="relative z-10 pb-8 flex justify-center">
          <button
            onClick={scrollToAgentSection}
            className="flex flex-col items-center gap-1 text-xs text-neutral-400 hover:text-neutral-800 transition cursor-pointer animate-bounce"
          >
            <span>Scroll to learn about Gemini Free</span>
            <ArrowRight className="w-4 h-4 rotate-90" />
          </button>
        </div>
      </section>

      {/* SECTION 2: Full-screen About Our Agent Section */}
      <div id="agent-showcase-section" className="w-full min-h-screen flex flex-col justify-between snap-start">
        <AgentShowcaseSection onOpenStudio={onOpenStudio} />

        {/* Rich Landing Page Footer in High-Fashion Qoves-Inspired Aesthetic */}
        <footer className="relative z-10 w-full py-16 px-6 sm:px-12 bg-[#faf6f0] border-t border-[#ebdcd0] text-neutral-600 text-xs shrink-0 select-none">
          <div className="max-w-6xl mx-auto">

            {/* Giant Outline Brand Typography */}
            <div className="pt-8 text-center select-none overflow-hidden">
              <h1 className="text-[12vw] font-black tracking-tighter text-[#eae2d5] uppercase leading-none select-none transition-all duration-300">
                GEMINI FREE
              </h1>
            </div>

            {/* Bottom Copyright & status */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400 font-mono text-[10px]">
              <div>
                © 2026 GEMINI FREE INC. • ALL RIGHTS RESERVED
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>INTELLIGENCE ENGINE ACTIVE</span>
              </div>
            </div>

          </div>
        </footer>
      </div>
    </div>
  );
}
