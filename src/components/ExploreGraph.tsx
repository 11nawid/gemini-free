'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { MAP_W, MAP_H, MAP_LANDS, MAP_RIVERS, MAP_PEAKS, MAP_DEFAULT, buildMap, type MapNode } from './explore/map';
import { TOPIC_POOL } from './explore/topics';
import { X, ChevronLeft, ChevronRight, Loader2, Shuffle, Navigation, Sparkles } from 'lucide-react';

interface ExploreGraphProps {
  input: string;
  setInput: (val: string) => void;
  onSubmit: (prompt?: string) => void;
}

function pickRandomTopic(exclude: string | null): string {
  const pool = exclude ? TOPIC_POOL.filter(t => t !== exclude) : TOPIC_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
function splitPages(raw: string): string[] {
  if (!raw) return [];
  const parts = raw.split(/---\s*PAGE\s*\d+\s*---/i);
  if (parts.length <= 3) {
    const byHeading = raw.split(/(?=^#{1,3}\s*Page\s*\d)/im);
    if (byHeading.length >= 3) return byHeading.map(s => s.trim()).filter(Boolean).slice(0, 22);
    return [raw.trim()];
  }
  return parts.map(s => s.trim()).filter(Boolean);
}
function escapeHtml(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderMath(expr: string, display: boolean): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode: display, strict: false });
  } catch {
    return `<code class="font-mono text-[13px]">${escapeHtml(expr)}</code>`;
  }
}

function mdToHtml(md: string): string {
  const codeBlocks: string[] = [];
  let h = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, __, code) => {
    const idx = codeBlocks.length;
    const esc = escapeHtml(code);
    codeBlocks.push(`<pre class="my-6 rounded-xl bg-white border border-neutral-200 p-4 overflow-x-auto shadow-sm"><code class="text-[12px] font-mono leading-6 text-neutral-900 whitespace-pre">${esc}</code></pre>`);
    return `__CODEBLOCK_${idx}__`;
  });
  // also catch indented ASCII diagrams that look like code but without fences (e.g. "[ Dead Giant Star ] --->")
  h = h.replace(/^(\s*\[ Dead[\s\S]*?)(?=\n\n|$)/gm, (m) => {
    const idx = codeBlocks.length;
    const esc = escapeHtml(m.trim());
    codeBlocks.push(`<pre class="my-6 rounded-xl bg-white border border-neutral-200 p-4 overflow-x-auto shadow-sm"><code class="text-[12px] font-mono leading-6 text-neutral-900 whitespace-pre">${esc}</code></pre>`);
    return `__CODEBLOCK_${idx}__`;
  });

  const mathBlocks: string[] = [];
  h = h.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(`<div class="my-6 flex justify-center"><div class="max-w-full overflow-x-auto py-2">${renderMath(expr.trim(), true)}</div></div>`);
    return `__MATHBLOCK_${idx}__`;
  });
  h = h.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(`<div class="my-6 flex justify-center"><div class="max-w-full overflow-x-auto py-2">${renderMath(expr.trim(), true)}</div></div>`);
    return `__MATHBLOCK_${idx}__`;
  });
  const inlineMaths: string[] = [];
  h = h.replace(/\\\((.*?)\\\)/g, (_, expr) => {
    const idx = inlineMaths.length;
    inlineMaths.push(renderMath(expr, false));
    return `__INLINEMATH_${idx}__`;
  });
  h = h.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\\)\$(?!\$)/g, (_, expr) => {
    if (expr.includes('__CODEBLOCK') || expr.length > 140) return `$${expr}$`;
    const idx = inlineMaths.length;
    inlineMaths.push(renderMath(expr.trim(), false));
    return `__INLINEMATH_${idx}__`;
  });

  h = escapeHtml(h);

  // robust tables: header line with |, next line with ---, then rows with |
  {
    const lines = h.split('\n');
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const cur = lines[i];
      const nxt = lines[i + 1] || '';
      const isHeader = cur.includes('|') && nxt.includes('---') && nxt.includes('|');
      const isHeaderNoLead = cur.includes('|') && nxt.trim().startsWith('|') === false && nxt.includes('---');
      // also handle header without leading | but with pipes
      const headerLike = cur.includes('|') && nxt.includes('---');
      if (headerLike && cur.split('|').filter(Boolean).length >= 2) {
        const headerCells = cur.split('|').map(s=>s.trim()).filter(Boolean);
        if (headerCells.length >= 2 && nxt.includes('---')) {
          i += 2; // skip header + separator
          const rows: string[][] = [];
          while (i < lines.length && lines[i].includes('|')) {
            const cells = lines[i].split('|').map(s=>s.trim()).filter(Boolean);
            if (!cells.length) { i++; break; }
            rows.push(cells);
            i++;
            if (i < lines.length && lines[i].trim() === '') { i++; break; }
          }
          let table = `<div class="my-6 overflow-x-auto"><table class="w-full text-[13px] border-collapse"><thead><tr class="border-b border-neutral-300">${headerCells.map(c=>`<th class="py-2 pr-4 text-left font-semibold text-neutral-900 text-[12px] tracking-wide uppercase">${c}</th>`).join('')}</tr></thead><tbody>`;
          rows.forEach(r=>{ table += `<tr class="border-b border-neutral-100 last:border-0">${r.map(c=>`<td class="py-2.5 pr-4 text-neutral-700 align-top">${c}</td>`).join('')}</tr>`; });
          table += `</tbody></table></div>`;
          out.push(table);
          continue;
        }
      }
      out.push(cur);
      i++;
    }
    h = out.join('\n');
  }

  h = h
    .replace(/^> (.+)$/gm, '<blockquote class="my-5 pl-4 border-l-2 border-neutral-300 text-[14px] leading-6 text-neutral-600 italic">$1</blockquote>')
    .replace(/^\s*---+\s*$/gm, '<hr class="my-8 border-neutral-200" />')
    .replace(/^###\s+(.+)$/gm, '<h3 class="text-[12px] font-semibold tracking-widest uppercase text-neutral-500 mt-8 mb-3">$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2 class="text-[17px] font-serif font-bold tracking-tight text-neutral-900 mt-8 mb-3">$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1 class="text-[22px] font-serif font-bold tracking-tight text-neutral-900 mt-8 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-neutral-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-neutral-100 rounded text-[12px] font-mono text-neutral-800">$1</code>')
    .replace(/^\s*-\s+(.+)$/gm, '<li class="ml-5 list-disc marker:text-neutral-400 pl-1 leading-7 text-[14px]">$1</li>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="ml-5 list-decimal marker:text-neutral-400 pl-1 leading-7 text-[14px]">$1</li>');

  h = h.split(/\n{2,}/).map(block => {
    const t = block.trim(); if (!t) return '';
    if (/^<h[1-3]|^<li|^<ul|^<ol|^<blockquote|^<div class="my-6 flex justify-center|^<div class="my-6 overflow-x-auto|^<pre|^<hr/.test(t)) return t;
    if (t.startsWith('__CODEBLOCK') || t.startsWith('__MATHBLOCK') || t.startsWith('__INLINEMATH')) return t;
    return `<p class="leading-7 text-[14px] text-neutral-700 mt-4">${t.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
  h = h.replace(/(?:<li[\s\S]*?<\/li>\n?)+/g, m => `<ul class="my-4 space-y-1">${m}</ul>`);
  h = h.replace(/__CODEBLOCK_(\d+)__/g, (_, i) => codeBlocks[Number(i)] || '');
  h = h.replace(/__MATHBLOCK_(\d+)__/g, (_, i) => mathBlocks[Number(i)] || '');
  h = h.replace(/__INLINEMATH_(\d+)__/g, (_, i) => inlineMaths[Number(i)] || '');
  return h;
}

const COVER_STYLE_GUIDE = `
You are a senior book-cover art director. Styles from the reference collage:
- Layered hills/waves: 3-4 stacked undulating bands in mustard #f59e0b, terracotta #e07a5a, deep teal #0f766e, navy #0f172a on cream #fffaf0.
- Mosaic grid: 30-40% geometric tiles (quarter-circles, dots, stripes) in warm mustard + teal + coral, white space.
- Editorial serif "Nature": huge serif title, small caps author, circular abstract gradient placeholder, sage + peach.
- Diagonal split: bold diagonal slash white/orange, duotone landscape.
- Dark premium: navy with electric orange + cyan shards.
- Botanical: watercolor tree on aged cream, serif gold-foil title.
- Modular retro: coral + navy stacked blocks on off-white.
Pick ONE style that fits the topic. Include: Title (topic), subtitle, author "Gemini Free", footer "Gemini Free Press · Atlas Edition · 2026". ViewBox 0 0 400 600, rx=18, legible type. Output ONLY raw <svg>...</svg>.
`.trim();

function hasVisualCover(page1: string): boolean { return /<svg[\s\S]*<\/svg>/i.test(page1); }
function extractSvg(text: string): string | null { const m = text.match(/<svg[\s\S]*?<\/svg>/i); return m ? m[0] : null; }

function CoverView({ topic, svg, status, onRetry }: { topic: string; svg: string | null; status: 'idle'|'checking'|'generating'|'done'|'fallback'; onRetry: ()=>void }) {
  if (svg) {
    return (
      <div>
        <div className="rounded-xl overflow-hidden bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>AI cover · collage style</span>
          <button onClick={onRetry} className="text-neutral-700 hover:text-neutral-900 underline">Regenerate</button>
        </div>
      </div>
    );
  }
  if (status === 'generating' || status === 'checking') {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-neutral-600">Designing cover…</p>
        <p className="text-xs text-neutral-400 mt-1">AI is drawing the SVG in mosaic / hills style</p>
      </div>
    );
  }
  // fallback minimal cover — no boxes, just type
  return (
    <div className="py-10">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase text-neutral-500">Gemini Free Press</div>
        <h1 className="mt-4 font-serif text-[32px] font-bold leading-none tracking-tight text-neutral-900">{topic}</h1>
        <div className="mt-3 h-px w-12 bg-neutral-300 mx-auto" />
        <p className="mt-4 text-sm leading-6 text-neutral-600 max-w-[32ch] mx-auto">An Atlas field guide — first principles to frontier questions.</p>
        <p className="mt-8 text-xs tracking-wide uppercase text-neutral-500">Gemini Free</p>
        <p className="mt-1 text-[11px] text-neutral-400">Atlas Edition · 2026</p>
        {status==='fallback' && <button onClick={onRetry} className="mt-4 text-xs underline text-neutral-600">Retry AI cover</button>}
      </div>
    </div>
  );
}

function ContentsView({ pages, onJump }: { pages: string[]; onJump: (i:number)=>void }) {
  const items = pages.slice(2).map((p, idx) => {
    const m = p.match(/^#{1,3}\s+(.+)$/m) || p.match(/^(.+)\n/);
    const title = (m ? m[1] : `Chapter ${idx+1}`).replace(/[#*`]/g,'').trim().slice(0,70);
    return { title, pageNo: idx+3 };
  });
  if (!items.length) return <p className="text-sm text-neutral-500">Contents will appear as pages stream in…</p>;
  return (
    <div>
      <h2 className="font-serif text-lg font-bold text-neutral-900">Contents</h2>
      <div className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
        <button onClick={()=>onJump(0)} className="w-full flex justify-between py-2.5 text-left hover:bg-neutral-50 -mx-2 px-2"><span className="text-sm text-neutral-900">Cover</span><span className="text-xs text-neutral-400 font-mono">1</span></button>
        <button onClick={()=>onJump(1)} className="w-full flex justify-between py-2.5 text-left hover:bg-neutral-50 -mx-2 px-2"><span className="text-sm text-neutral-900">Contents</span><span className="text-xs text-neutral-400 font-mono">2</span></button>
        {items.map((it,i)=> (
          <button key={i} onClick={()=>onJump(i+2)} className="w-full flex justify-between py-2.5 text-left hover:bg-neutral-50 -mx-2 px-2 group">
            <span className="text-sm text-neutral-700 group-hover:text-neutral-900 truncate pr-4">{it.title}</span>
            <span className="text-xs text-neutral-400 font-mono shrink-0">{it.pageNo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExploreGraph({ input: _input, setInput, onSubmit: _onSubmit }: ExploreGraphProps) {
  void _input; void setInput; void _onSubmit;
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const [mapData, setMapData] = useState(() => MAP_DEFAULT);
  useEffect(() => { setMapData(buildMap(Math.floor(Math.random() * 1e9))); }, []);
  const { nodes, edges } = mapData;
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<{ id: string; topic: string } | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [raw, setRaw] = useState('');
  const [page, setPage] = useState(0);
  const pages = useMemo(() => splitPages(raw), [raw]);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastPickRef = useRef<string | null>(null);
  const [coverSvg, setCoverSvg] = useState<string | null>(null);
  const [coverStatus, setCoverStatus] = useState<'idle'|'checking'|'generating'|'done'|'fallback'>('idle');
  const coverAbortRef = useRef<AbortController | null>(null);

  const applyTransform = useCallback(() => {
    const el = worldRef.current; if (!el) return;
    const wrap = (v:number, m:number) => { while (v > m) v -= m; while (v < -m) v += m; return v; };
    panRef.current.x = wrap(panRef.current.x, MAP_W);
    panRef.current.y = wrap(panRef.current.y, MAP_H);
    el.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${scaleRef.current})`;
  }, []);
  useEffect(() => {
    const el = viewportRef.current; if (!el) return;
    const fit = () => {
      const pad = 24;
      const sx = (el.clientWidth - pad * 2) / MAP_W;
      const sy = (el.clientHeight - pad * 2) / MAP_H;
      const s = Math.min(sx, sy, 1);
      scaleRef.current = s;
      panRef.current = { x: (el.clientWidth - MAP_W * s) / 2, y: (el.clientHeight - MAP_H * s) / 2 };
      applyTransform();
    };
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyTransform]);

  const stopGeneration = useCallback(() => { abortRef.current?.abort(); coverAbortRef.current?.abort(); abortRef.current = null; coverAbortRef.current = null; setGenerating(false); setCoverStatus(s=>s==='generating'?'idle':s); }, []);

  const runCoverPipeline = useCallback(async (theTopic: string, page1Text: string) => {
    const existing = extractSvg(page1Text || '');
    if (existing) { setCoverSvg(existing); setCoverStatus('done'); return; }
    setCoverStatus('checking'); await new Promise(r=>setTimeout(r, 220));
    if (hasVisualCover(page1Text)) { setCoverStatus('done'); return; }
    setCoverStatus('generating'); coverAbortRef.current?.abort(); const ac = new AbortController(); coverAbortRef.current = ac;
    try {
      const subtitle = (page1Text.split('\n').find(l=>l.trim().length>20) || '').slice(0,120);
      const prompt = `Create a book cover SVG strictly about the EXACT topic "${theTopic}" — no other topic. \n\n${COVER_STYLE_GUIDE}\n\nTopic (must be exact title on cover): "${theTopic}"\nSubtitle (must be about "${theTopic}" only): "${subtitle}"\nCover must be 100% about "${theTopic}" — every visual element, title, subtitle, and decoration must relate to "${theTopic}". Pick ONE style, output ONLY <svg viewBox="0 0 400 600">...</svg>.`;
      const res = await fetch('/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gemini-3.1-pro', messages: [{ role: 'user', content: prompt }], stream: false, temperature: 0.85 }), signal: ac.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); const text: string = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      const svg = extractSvg(text);
      if (svg && svg.length > 300) { const fixed = svg.includes('viewBox') ? svg : svg.replace('<svg', '<svg viewBox="0 0 400 600"'); setCoverSvg(fixed); setCoverStatus('done'); } else throw new Error('No SVG');
    } catch (e:any) { if (e?.name !== 'AbortError') setCoverStatus('fallback'); }
  }, []);

  const startBook = useCallback(async (chosenTopic: string) => {
    abortRef.current?.abort(); coverAbortRef.current?.abort();
    setTopic(chosenTopic); lastPickRef.current = chosenTopic; setRaw(''); setCoverSvg(null); setCoverStatus('idle'); setPage(0); setOpen(true); setGenerating(true);
    let acc = '';
    try {
      const prompt =
        `You are the Gemini Free Atlas press. Write a complete 20-page illustrated book on the EXACT topic: "${chosenTopic}".\n\n` +
        `TOPIC RULE — CRITICAL: Stay strictly on "${chosenTopic}" on EVERY page, including cover, contents, and all chapters. Do not mention any other topic. Every example, analogy, table, formula, and chapter title must be directly about "${chosenTopic}". If topic is "Aeroplane", every word is about Aeroplane only. Title, subtitle, blurb, and all 18 chapter titles must contain or clearly relate to "${chosenTopic}".\n\n` +
        `LANGUAGE RULE — VERY IMPORTANT: Write in super simple, easy English. Short sentences. Common everyday words only. Imagine explaining to a bright 12-year-old. If you must use a hard word, explain it right away in brackets in simple words. No academic tone, no jargon, no complex grammar. Warm, friendly, clear, with daily-life analogies (water, bikes, kitchen, playground). Keep formulas but explain them in plain words right after.\n\n` +
        `STRICT FORMAT — exactly 20 pages, each delimited on its own line as:\n--- PAGE 1 ---\n... up to --- PAGE 20 ---\n` +
        `PAGE 1 — COVER TEXT ONLY (no SVG): Title must be "${chosenTopic}" exactly, subtitle (one line) about "${chosenTopic}", author line "Gemini Free", 2-sentence blurb about "${chosenTopic}" in easy English. No other topic.\n` +
        `PAGE 2 — CONTENTS: Table of contents listing pages 3-20 as "03 — Title" one per line, every title must be about "${chosenTopic}" and contain the word "${chosenTopic}" or clearly refer to it, in easy English.\n` +
        `PAGES 3-20 — 18 chapters, each 280-380 words, all strictly about "${chosenTopic}", rich markdown with headings, bullets, one code block, one table, math ($inline$ or $$block$$) overall where relevant to "${chosenTopic}". One "Try this" per 3 pages, all about "${chosenTopic}". All in easy English. Start immediately with --- PAGE 1 ---.\n`;
      const ac = new AbortController(); abortRef.current = ac;
      const res = await fetch('/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gemini-3.7-flash', messages: [{ role: 'user', content: prompt }], stream: true, temperature: 0.88 }), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || ''; for (const line of lines) { const t = line.trim(); if (!t.startsWith('data:')) continue; const payload = t.slice(5).trim(); if (payload === '[DONE]') break; try { const j = JSON.parse(payload); const d = j.choices?.[0]?.delta?.content; if (d) { acc += d; if (!ac.signal.aborted) setRaw(acc); } } catch {} } }
    } catch (e:any) { if (e?.name !== 'AbortError') setRaw(prev => prev || `Could not generate the book for “${chosenTopic}”.`); }
    finally { if (!abortRef.current?.signal.aborted) setGenerating(false); const firstPage = splitPages(acc)[0] || ''; runCoverPipeline(chosenTopic, firstPage); }
  }, [runCoverPipeline]);

  const openRandom = useCallback(() => { if (open || shuffling) return; const t = pickRandomTopic(lastPickRef.current); startBook(t); }, [startBook, open, shuffling]);
  const retryCover = useCallback(() => { if (topic) runCoverPipeline(topic, pages[0] || topic); }, [topic, pages, runCoverPipeline]);
  const handleShuffle = useCallback(() => {
    if (shuffling || open) return;
    setShuffling(true);
    // full-screen SVG animation covers page for ~1.6s, then reshuffle
    setTimeout(() => {
      setMapData(buildMap(Math.floor(Math.random() * 1e9)));
      setTimeout(() => setShuffling(false), 200);
    }, 1400);
  }, [shuffling, open]);
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (open || shuffling) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const dx = Math.abs(e.clientX - dragStart.current.mx), dy = Math.abs(e.clientY - dragStart.current.my);
    if (dx > 6 || dy > 6) return; openRandom();
  }, [open, shuffling, openRandom]);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (open || shuffling) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true); dragStart.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
  }, [open, shuffling]);
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { panRef.current.x = dragStart.current.px + (e.clientX - dragStart.current.mx); panRef.current.y = dragStart.current.py + (e.clientY - dragStart.current.my); applyTransform(); });
    };
    const onUp = () => { cancelAnimationFrame(raf); setDragging(false); };
    window.addEventListener('mousemove', onMove, { passive: true }); window.addEventListener('mouseup', onUp);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, applyTransform]);
  const onWheel = useCallback((e: React.WheelEvent) => { if (open || shuffling) return; e.preventDefault(); const factor = e.deltaY > 0 ? 0.94 : 1.06; scaleRef.current = Math.min(2.4, Math.max(0.35, scaleRef.current * factor)); applyTransform(); }, [applyTransform, open, shuffling]);
  const handleNodeClick = useCallback((n: MapNode, e: React.MouseEvent) => {
    if (open || shuffling) return;
    e.stopPropagation();
    const exactTopic: string = (n as any).topic || n.label || n.cluster;
    setChoosing({ id: n.id, topic: exactTopic });
    setHoverId(null);
    setTimeout(() => { setChoosing(null); startBook(exactTopic); }, 850);
  }, [startBook, open, shuffling]);
  const currentHtml = useMemo(() => {
    if (page === 0 || page === 1) return '';
    const src = pages[page] ?? '';
    if (!src) return generating ? '<p class="text-sm text-neutral-500">Writing…</p>' : '';
    return mdToHtml(src);
  }, [pages, page, generating]);
  const tiles = useMemo(() => { const out: { ox:number; oy:number; key:string }[] = []; for (let tx=-1; tx<=1; tx++) for (let ty=-1; ty<=1; ty++) out.push({ ox: tx*MAP_W, oy: ty*MAP_H, key: `${tx},${ty}` }); return out; }, []);

  return (
    <div className="w-full h-full flex min-h-0 bg-[#0a0f1c] overflow-hidden relative">
      <div className="flex-1 min-w-0 relative overflow-hidden bg-[#0b1320]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 90% at 30% 18%, #162a44 0%, #0f1e33 38%, #0a1424 72%, #070d1a 100%)' }} />
        <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: `repeating-radial-gradient(ellipse at 30% 20%, transparent 0 68px, rgba(120,170,220,0.14) 68px 69px)` }} />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.38) 100%)' }} />
        <div className="absolute inset-[10px] pointer-events-none rounded-[18px] border border-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_40px_rgba(0,0,0,0.25)]" />
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />
        <div ref={viewportRef} className="absolute inset-0 select-none touch-none" onMouseDown={onMouseDown} onClick={handleCanvasClick} onWheel={onWheel} style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
          <div ref={worldRef} className="absolute top-0 left-0 will-change-transform" style={{ transform: `translate3d(0,0,0) scale(1)`, transformOrigin: '0 0' }}>
            {tiles.map(({ ox, oy, key }) => (
              <svg key={key} width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute overflow-visible" style={{ left: ox, top: oy }}>
                <defs>
                  <pattern id={`ocean-${key}`} width="160" height="160" patternUnits="userSpaceOnUse"><path d="M 0 80 Q 40 70 80 80 T 160 80" fill="none" stroke="rgba(140,175,210,0.09)" strokeWidth="0.7"/><path d="M 0 120 Q 50 110 100 120 T 160 118" fill="none" stroke="rgba(140,175,210,0.06)" strokeWidth="0.6"/></pattern>
                  <filter id={`landShadow-${key}`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity="0.20"/></filter>
                  <filter id={`glow-${key}`}><feGaussianBlur stdDeviation="5" result="b"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0"/></filter>
                  <pattern id={`hatch-${key}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 5 H10" stroke="rgba(60,40,20,0.04)" strokeWidth="0.8"/></pattern>
                  <radialGradient id={`landGrad-${key}`} cx="35%" cy="25%" r="85%"><stop offset="0%" stopColor="#fffaf0"/><stop offset="55%" stopColor="#fdf6e3"/><stop offset="100%" stopColor="#f1e6c8"/></radialGradient>
                </defs>
                <rect width={MAP_W} height={MAP_H} fill={`url(#ocean-${key})`} />
                <rect width={MAP_W} height={MAP_H} fill="none" stroke="rgba(160,195,230,0.10)" strokeWidth={0.7} />
                {Array.from({ length: 7 }).map((_, i) => (<line key={`h-${i}`} x1={0} x2={MAP_W} y1={(MAP_H/8)*(i+1)} y2={(MAP_H/8)*(i+1)} stroke="rgba(160,195,230,0.10)" strokeWidth={0.7} strokeDasharray="12 16"/>))}
                {Array.from({ length: 9 }).map((_, i) => (<line key={`v-${i}`} x1={(MAP_W/10)*(i+1)} x2={(MAP_W/10)*(i+1)} y1={0} y2={MAP_H} stroke="rgba(160,195,230,0.08)" strokeWidth={0.7} strokeDasharray="12 16"/>))}
                {Array.from({ length: 8 }).map((_, i) => (<text key={`lat-${i}`} x={12} y={(MAP_H/8)*(i+1)-6} fontSize={7} fontWeight={700} letterSpacing={0.8} fill="rgba(180,210,240,0.45)" fontFamily="monospace">{String(60 - i*15).padStart(2,'0')}° N</text>))}
                {MAP_LANDS.map((land, idx) => (
                  <g key={idx} filter={`url(#landShadow-${key})`}>
                    <path d={land.d} fill={`url(#landGrad-${key})`} stroke="#e8dcc3" strokeWidth={1.4}/>
                    <path d={land.d} fill={`url(#hatch-${key})`} opacity={0.9}/>
                    <g opacity={0.32}>
                      <g transform={`translate(${land.cx},${land.cy}) scale(0.82) translate(${-land.cx},${-land.cy})`}><path d={land.d} fill="none" stroke="#c9b896" strokeWidth={0.7} strokeDasharray="5 7"/></g>
                      <g transform={`translate(${land.cx},${land.cy}) scale(0.62) translate(${-land.cx},${-land.cy})`}><path d={land.d} fill="none" stroke="#c9b896" strokeWidth={0.6} strokeDasharray="4 8"/></g>
                      <g transform={`translate(${land.cx},${land.cy}) scale(0.42) translate(${-land.cx},${-land.cy})`}><path d={land.d} fill="none" stroke="#c9b896" strokeWidth={0.5} strokeDasharray="3 9"/></g>
                    </g>
                    <text x={land.cx} y={land.cy} textAnchor="middle" fontSize={10} fontWeight={900} letterSpacing={1.4} fill="#5a4630" opacity={0.55} style={{ paintOrder:'stroke', stroke:'#fff7e8', strokeWidth:3, strokeLinejoin:'round' }}>{land.name.toUpperCase()}</text>
                    <g opacity={0.45}><text x={land.cx} y={land.cy+11} textAnchor="middle" fontSize={6.5} fontWeight={700} letterSpacing={1} fill="#8a7355">TERRA INCOGNITA</text></g>
                  </g>
                ))}
                {MAP_RIVERS.map((d,i)=> (<g key={`riv-${i}`}><path d={d} fill="none" stroke="#7eb8d8" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} filter={`url(#glow-${key})`}/><path d={d} fill="none" stroke="#a8d4f0" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" opacity={0.95}/><path d={d} fill="none" stroke="white" strokeWidth={0.35} strokeLinecap="round" opacity={0.65}/></g>))}
                {MAP_PEAKS.map((p,i)=> (<g key={`pk-${i}`} opacity={0.85} transform={`translate(${p.x},${p.y}) scale(${p.s})`}><path d="M -10 6 L 0 -9 L 10 6 Z" fill="#5a4630" stroke="#3c2814" strokeWidth={0.6}/><path d="M -10 6 L 0 -9 L 4 -1 L -2 6 Z" fill="white" opacity={0.92}/><path d="M -10 6 L -2 6 L 0 -1 Z" fill="#a89070" opacity={0.9}/></g>))}
                {key==='0,0' && (<g opacity={0.22} fill="none" stroke="#8fb4d8" strokeWidth={0.9} strokeDasharray="7 9" strokeLinecap="round"><path d="M 320 520 C 560 420 820 360 1050 430"/><path d="M 1090 420 C 1280 520 1480 560 1680 560"/><path d="M 1680 560 C 1900 500 2140 380 2320 420"/><path d="M 2320 420 C 2460 540 2560 640 2720 700"/></g>)}
                {key==='0,0' && (<g transform={`translate(${MAP_W-130},138)`}><circle r={48} fill="rgba(255,252,240,0.94)" stroke="#d9c9a6" strokeWidth={1.2}/><circle r={44} fill="none" stroke="#e8dcc3" strokeWidth={0.7} strokeDasharray="2 3"/><g stroke="#1a130b" strokeWidth={1.1} strokeLinecap="round"><path d="M 0 -38 L 2.5 -10 L 0 -7 L -2.5 -10 Z" fill="#c0392b" stroke="#7f1d1d"/><path d="M 0 38 L 2.5 10 L 0 7 L -2.5 10 Z" fill="none" stroke="#3c2814"/><path d="M -38 0 L -10 2.5 L -7 0 L -10 -2.5 Z" fill="none" stroke="#3c2814"/><path d="M 38 0 L 10 2.5 L 7 0 L 10 -2.5 Z" fill="none" stroke="#3c2814"/></g><text x={0} y={-54} textAnchor="middle" fontSize={8.5} fontWeight={900} letterSpacing={1.4} fill="#3c2814">N</text><circle r={1.6} fill="#1a130b"/></g>)}
                {key==='0,0' && (<g transform={`translate(42, ${MAP_H-38})`}><rect x={0} y={0} width={150} height={22} rx={11} fill="rgba(255,252,240,0.92)" stroke="#d9c9a6" strokeWidth={1}/><g transform="translate(10,11)"><rect x={0} y={-3} width={60} height={6} fill="#1a130b"/><rect x={60} y={-3} width={60} height={6} fill="white" stroke="#1a130b" strokeWidth={0.6}/><text x={60} y={10} textAnchor="middle" fontSize={6.5} fontWeight={800} letterSpacing={0.7} fill="#3c2814">500 LEAGUES</text></g></g>)}
                {edges.map((ed,i)=>{ const a=nodes.find(n=>n.id===ed.a), b=nodes.find(n=>n.id===ed.b); if(!a||!b) return null; const isHub=Boolean(a.label&&b.label); return <line key={`${ed.a}-${ed.b}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isHub?'rgba(255,255,255,0.16)':'rgba(200,220,240,0.10)'} strokeWidth={isHub?1.15:0.7} strokeLinecap="round"/>; })}
                {nodes.map(n=>{ const hovered=hoverId===n.id; const isHub=Boolean(n.label); const isChoosing = choosing?.id===n.id; return (
                  <g key={n.id} onMouseEnter={()=>setHoverId(n.id)} onMouseLeave={()=>setHoverId(v=>v===n.id?null:v)}>
                    <circle cx={n.x} cy={n.y} r={n.r+10} fill={n.color} opacity={isChoosing?0.32: hovered?0.22:0.14} style={{ filter:'blur(7px)' }} className={isChoosing ? 'animate-pulse' : ''}/>
                    {isChoosing && <circle cx={n.x} cy={n.y} r={n.r+18} fill="none" stroke={n.color} strokeWidth={1.2} opacity={0.9} className="animate-ping" />}
                    <circle cx={n.x} cy={n.y} r={isChoosing ? n.r+3.5 : hovered?n.r+2.4:n.r} fill={n.color} stroke="white" strokeWidth={isHub?1.7:1.05} style={{ cursor:'pointer', filter: isChoosing ? 'brightness(1.2) drop-shadow(0 4px 16px rgba(0,0,0,0.45))' : hovered ? 'brightness(1.12) drop-shadow(0 2px 10px rgba(0,0,0,0.35))' : 'drop-shadow(0 1px 6px rgba(0,0,0,0.28))', transition:'r 180ms' }} onClick={(e:any)=>handleNodeClick(n,e)}/>
                    <circle cx={n.x - n.r*0.28} cy={n.y - n.r*0.32} r={Math.max(1,n.r*0.28)} fill="white" opacity={0.92}/>
                    {isHub && (<text x={n.x} y={n.y - n.r - 13} textAnchor="middle" fontSize={9} fontWeight={900} letterSpacing={0.6} fill="#fff7e8" style={{ paintOrder:'stroke', stroke:'rgba(10,15,28,0.85)', strokeWidth:4, strokeLinejoin:'round', pointerEvents:'none' }}>{n.label!.toUpperCase()}</text>)}
                  </g>
                ); })}
              </svg>
            ))}
            {hoverId && !choosing && (()=>{ const n=nodes.find(x=>x.id===hoverId); if(!n) return null; return (<div className="absolute pointer-events-none -translate-x-1/2 bg-[#0f172a] text-[#e0f0ff] text-[11px] font-bold px-3 py-1.5 rounded-full shadow-xl border border-white/10 whitespace-nowrap z-10 flex items-center gap-1.5" style={{ left: n.x, top: n.y + n.r + 16 }}><span className="w-2 h-2 rounded-full" style={{ background:n.color }}/>{(n as any).topic || n.label || n.cluster}</div>);})()}
          </div>
          {choosing && (
            <div className="absolute inset-0 bg-[#0a0f1c]/45 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 border border-neutral-200 animate-in fade-in zoom-in duration-300">
                <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center animate-pulse"><Sparkles size={16} className="text-amber-400"/></div>
                <div>
                  <div className="text-[10px] tracking-[0.14em] uppercase text-neutral-500 font-semibold">Choosing idea</div>
                  <div className="font-serif font-bold text-neutral-900 text-[15px] leading-tight">{choosing.topic}</div>
                  <div className="text-xs text-neutral-500">Opening your book…</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${open ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={handleShuffle} disabled={open || shuffling} className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] text-xs font-semibold px-4 py-2 rounded-full hover:bg-slate-100 disabled:opacity-40"><Navigation size={14} className="rotate-45"/> Reshuffle</button>
          <div className="w-px h-6 bg-white/15"/>
          <button onClick={openRandom} disabled={!!open} className="inline-flex items-center gap-1.5 bg-gradient-to-br from-amber-400 to-orange-500 text-[#1a130b] text-xs font-bold px-5 py-2 rounded-full hover:from-amber-300 hover:to-orange-400 disabled:opacity-40"><Sparkles size={14}/> Surprise me</button>
        </div>
        {open && !choosing && !shuffling && (
          <div className="absolute inset-0 bg-[#0a0f1c]/30 backdrop-blur-[0.5px] z-10 flex items-start justify-center pt-6 pointer-events-none">
            <div className="bg-white rounded-full px-4 py-2 text-xs font-medium text-neutral-800 shadow-lg border border-neutral-200">Map paused — close book to explore</div>
          </div>
        )}
      </div>

      <aside className={`shrink-0 bg-white flex flex-col overflow-hidden mt-[64px] h-[calc(100%-64px)] border-l border-neutral-200 ${open ? 'w-[min(520px,48vw)] sm:w-[480px]' : 'w-0 border-l-0'} max-sm:absolute max-sm:inset-y-0 max-sm:right-0 max-sm:w-[100%] max-sm:mt-0 max-sm:h-full ${open ? 'max-sm:translate-x-0' : 'max-sm:translate-x-full'}`}>
        <div className={`h-full flex flex-col min-w-[340px] ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-neutral-100">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-[18px] font-bold leading-5 text-neutral-900 line-clamp-2 flex-1">{topic ?? 'Atlas'}</h2>
              <button onClick={()=>{ stopGeneration(); setOpen(false); }} className="shrink-0 -mr-1 w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16}/></button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <span>{page+1} / 20</span>
              {generating && <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/> streaming</span>}
              {coverStatus==='generating' && <span>· cover…</span>}
            </div>
            <div className="mt-3 h-px bg-neutral-100"><div className="h-px bg-neutral-900 transition-all" style={{ width: `${((page+1)/20)*100}%` }}/></div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            {!topic ? (
              <div className="py-16 text-center">
                <div className="text-sm font-medium text-neutral-900">Click the map for a book</div>
                <p className="mt-1 text-sm text-neutral-500">Any pin or sea — 20 pages, streamed live.</p>
                <button onClick={openRandom} className="mt-4 text-sm underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900">Surprise me</button>
              </div>
            ) : page===0 ? (
              <CoverView topic={topic} svg={coverSvg} status={coverStatus} onRetry={retryCover} />
            ) : page===1 ? (
              <ContentsView pages={pages} onJump={setPage} />
            ) : !pages[page] ? (
              generating ? <div className="text-sm text-neutral-500 animate-pulse">Writing page {page+1}…</div> : <div className="text-sm text-neutral-500">Waiting for page {page+1}…</div>
            ) : (
              <article className="max-w-none">
                <div className="text-[11px] tracking-widest uppercase text-neutral-400 mb-2">Page {page+1}</div>
                <div className="prose prose-neutral prose-sm max-w-none prose-p:leading-7 prose-p:text-neutral-700 prose-headings:font-serif prose-headings:font-bold prose-a:text-neutral-900 prose-code:text-xs prose-pre:my-4" dangerouslySetInnerHTML={{ __html: currentHtml || '<p class="text-neutral-500">Writing…</p>' }} />
                <div className="mt-8 text-[11px] text-neutral-400 border-t border-neutral-100 pt-3 flex justify-between"><span>p. {page+1} / 20</span><span>Gemini Free Atlas · 2026</span></div>
              </article>
            )}
          </div>

          <div className="shrink-0 border-t border-neutral-100 px-4 py-3 flex items-center justify-between">
            <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="text-sm px-3 py-1.5 rounded-full hover:bg-neutral-100 disabled:opacity-30 flex items-center gap-1"><ChevronLeft size={14}/> Prev</button>
            <span className="text-xs text-neutral-500 font-mono">{page+1} / 20</span>
            <button disabled={page>=19} onClick={()=>setPage(p=>Math.min(19,p+1))} className="text-sm font-medium px-4 py-1.5 rounded-full bg-neutral-900 text-white disabled:opacity-30 hover:bg-black flex items-center gap-1">Next <ChevronRight size={14}/></button>
          </div>
        </div>
      </aside>
      {!open && !shuffling && (<button onClick={openRandom} className="sm:hidden absolute bottom-20 right-4 bg-[#0f172a] text-white rounded-full p-3 shadow-xl border border-white/10"><Shuffle size={16}/></button>)}
      {shuffling && (
        <div className="fixed inset-0 z-[100] bg-[#070d1a]/92 backdrop-blur-[6px] flex items-center justify-center p-6">
          <div className="w-full max-w-[420px] text-center">
            <svg width="360" height="220" viewBox="0 0 360 220" className="mx-auto overflow-visible">
              <rect x="12" y="12" width="336" height="196" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2"/>
              {/* faint grid */}
              <g opacity="0.14" stroke="rgba(180,210,240,0.35)" strokeWidth="0.7" strokeDasharray="6 8">
                <line x1="12" y1="65" x2="348" y2="65"/><line x1="12" y1="110" x2="348" y2="110"/><line x1="12" y1="155" x2="348" y2="155"/>
                <line x1="90" y1="12" x2="90" y2="208"/><line x1="180" y1="12" x2="180" y2="208"/><line x1="270" y1="12" x2="270" y2="208"/>
              </g>
              {/* shuffling pins — SVG animated, full-screen cover */}
              <g>
                <circle r="9" fill="#f59e0b" stroke="white" strokeWidth="1.2">
                  <animate attributeName="cx" values="80;260;140;200;80" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                  <animate attributeName="cy" values="60;60;170;110;60" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                </circle>
                <circle r="7" fill="#0ea5e9" stroke="white" strokeWidth="1">
                  <animate attributeName="cx" values="260;80;200;140;260" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                  <animate attributeName="cy" values="170;170;60;110;170" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                </circle>
                <circle r="8" fill="#c93a2e" stroke="white" strokeWidth="1.1">
                  <animate attributeName="cx" values="180;100;260;180;180" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                  <animate attributeName="cy" values="110;150;90;170;110" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
                </circle>
                <circle r="6" fill="#2f9d4a" stroke="white" strokeWidth="1">
                  <animate attributeName="cx" values="140;200;80;260;140" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="cy" values="90;150;150;90;90" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <circle r="6.5" fill="#8a4fbf" stroke="white" strokeWidth="1">
                  <animate attributeName="cx" values="200;140;220;100;200" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="cy" values="150;60;120;60;150" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <circle r="7.5" fill="#e07a5a" stroke="white" strokeWidth="1">
                  <animate attributeName="cx" values="100;180;140;260;100" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="cy" values="150;90;60;170;150" dur="1.5s" repeatCount="indefinite"/>
                </circle>
              </g>
              {/* connecting trails */}
              <g fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 6" opacity="0.7">
                <line x1="80" y1="60" x2="260" y2="170"><animate attributeName="x1" values="80;260;140;200;80" dur="1.5s" repeatCount="indefinite"/><animate attributeName="y1" values="60;60;170;110;60" dur="1.5s" repeatCount="indefinite"/><animate attributeName="x2" values="260;80;200;140;260" dur="1.5s" repeatCount="indefinite"/><animate attributeName="y2" values="170;170;60;110;170" dur="1.5s" repeatCount="indefinite"/></line>
              </g>
              {/* center pulse */}
              <g opacity="0.9">
                <circle cx="180" cy="110" r="14" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9">
                  <animate attributeName="r" values="14;28;14" dur="1.1s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="1.1s" repeatCount="indefinite"/>
                </circle>
                <circle cx="180" cy="110" r="6" fill="white"><animate attributeName="r" values="6;7.5;6" dur="0.9s" repeatCount="indefinite"/></circle>
              </g>
            </svg>
            <div className="mt-4 font-serif text-[20px] font-bold tracking-tight text-white">Shuffling Atlas</div>
            <div className="mt-1 text-sm text-white/60">Scattering ideas across the endless sea…</div>
            <div className="mt-4 mx-auto h-1 w-24 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-white animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ animation: 'shimmer 1.2s ease-in-out infinite' }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
