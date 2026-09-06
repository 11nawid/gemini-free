'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';

const HARDCODED_EMAIL = 'admin@geminifree.dev';
const HARDCODED_PASSWORD = 'gemini123';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    if (email !== HARDCODED_EMAIL || password !== HARDCODED_PASSWORD) {
      setError('Invalid credentials');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      try {
        document.cookie = "gemini_free_auth=true; path=/; max-age=2592000; SameSite=Lax";
        localStorage.setItem(
          'gemini-free:user',
          JSON.stringify({
            name: 'Gemini Free User',
            email: email,
            authenticated: true,
            provider: 'email',
            loggedInAt: new Date().toISOString(),
          })
        );
      } catch {}
      router.push('/chat');
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-neutral-900 font-sans select-none overflow-x-hidden">
      
      {/* LEFT HALF: Atmospheric Background */}
      <div 
        className="relative w-full lg:w-1/2 min-h-[420px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-14 bg-neutral-900 text-white overflow-hidden bg-cover bg-center grayscale contrast-125"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.65)), url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop')`
        }}
      >
        {/* Top-Left Glassmorphic Pill Button */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/85 hover:bg-white text-neutral-900 text-[11px] font-bold tracking-widest uppercase backdrop-blur-md shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>GEMINI FREE</span>
          </Link>
        </div>

        {/* Centered Big Headline */}
        <div className="relative z-10 my-auto py-12 text-left">
          <div className="w-10 h-[3px] bg-white mb-6"></div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[1.05] text-white drop-shadow-md">
            WELCOME BACK!
          </h1>
          
          <p className="mt-4 text-xs sm:text-sm font-mono tracking-widest uppercase text-white/70 max-w-md leading-relaxed">
            THE FULL-STACK AI WORKSPACE FOR MODERN DEVELOPERS.
          </p>
        </div>

        {/* Bottom-Left Monospace Spaced Watermark */}
        <div className="relative z-10 text-[10px] tracking-[0.35em] text-white/50 uppercase font-mono">
          G E M I N I &nbsp;&nbsp; F R E E
        </div>
      </div>

      {/* RIGHT HALF: Clean Editorial Sign In Form */}
      <div className="w-full lg:w-1/2 min-h-[500px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-16 lg:p-20 bg-white">
        
        <div className="hidden lg:block"></div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto text-left my-auto py-8">
          
          {/* Main "SIGN IN" Heading */}
          <div className="mb-10">
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tighter uppercase leading-none font-sans">
              SIGN IN
            </h2>
            <div className="w-10 h-[2px] bg-neutral-950 mt-3"></div>
          </div>

          {/* Hint Text */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[11px] text-amber-800 font-medium">
              Use this email / password to sign in. No registration required.
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('admin@geminifree.dev');
                setEmail('admin@geminifree.dev');
              }}
              className="text-[10px] text-amber-600 mt-1 font-mono cursor-pointer hover:text-amber-800 hover:underline text-left w-full"
            >
              Email: admin@geminifree.dev
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('gemini123');
                setPassword('gemini123');
              }}
              className="text-[10px] text-amber-600 font-mono cursor-pointer hover:text-amber-800 hover:underline text-left w-full"
            >
              Password: gemini123
            </button>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-widest text-neutral-500 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="admin@geminifree.dev"
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 text-sm font-mono focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-[10px] uppercase font-mono tracking-widest text-neutral-500 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 text-sm font-mono focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-between cursor-pointer group"
          >
            <span>{loading ? 'SIGNING IN...' : 'SIGN IN'}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Security Badge */}
          <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
            <span className="flex items-center gap-1.5 text-neutral-600 font-semibold">
              <ShieldCheck size={14} className="text-emerald-600" />
              SECURE OFFLINE AUTHENTICATION
            </span>
          </div>

        </div>

        {/* Bottom Footer Copyright */}
        <div className="text-left text-[10px] text-neutral-400 font-mono tracking-wider pt-6 border-t border-neutral-100">
          © 2026 GEMINI FREE
        </div>

      </div>

    </div>
  );
}
