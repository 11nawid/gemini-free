'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RealPenArtboardProps {
  svgContent: string;
  isStreaming: boolean;
  aspectRatio: '1:1' | '16:9' | '4:3' | '9:16';
  drawStyle?: 'realistic' | 'sketch' | 'ink';
  penCount?: number;
}

interface PenPoint {
  x: number; // percentage of sheet (0 to 100)
  y: number; // percentage of sheet (0 to 100)
}

interface ActivePen {
  id: number;
  pos: PenPoint;
  angle: number;
  isLifted: boolean;
  barrelColor: string;
  accentColor: string;
  inkGlow: string;
  visible: boolean;
}

// 4 Distinct, elegant artist pen styles
const PEN_STYLES = [
  { barrelColor: '#18181b', accentColor: '#f59e0b', inkGlow: '#f59e0b' }, // Obsidian & Gold
  { barrelColor: '#1e293b', accentColor: '#38bdf8', inkGlow: '#0284c7' }, // Midnight & Azure
  { barrelColor: '#450a0a', accentColor: '#f43f5e', inkGlow: '#e11d48' }, // Crimson & Rose
  { barrelColor: '#064e3b', accentColor: '#34d399', inkGlow: '#10b981' }, // Forest & Emerald
];

export const RealPenArtboard: React.FC<RealPenArtboardProps> = ({
  svgContent,
  isStreaming,
  aspectRatio,
  penCount = 2,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pens, setPens] = useState<ActivePen[]>([]);
  const isCancelledRef = useRef<boolean>(false);
  const animFramesRef = useRef<(number | null)[]>([]);

  useEffect(() => {
    // Cancel any ongoing drawing loop on content change or unmount
    isCancelledRef.current = true;
    animFramesRef.current.forEach(id => {
      if (id) cancelAnimationFrame(id);
    });
    animFramesRef.current = [];

    if (!svgContent) {
      setPens([]);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    // Reset cancellation flag for fresh drawing session
    isCancelledRef.current = false;

    // Parse viewBox for exact coordinate-to-percent mapping
    let minX = 0, minY = 0, vbWidth = 1600, vbHeight = 900;
    if (svgEl.viewBox && svgEl.viewBox.baseVal) {
      minX = svgEl.viewBox.baseVal.x;
      minY = svgEl.viewBox.baseVal.y;
      vbWidth = svgEl.viewBox.baseVal.width || 1600;
      vbHeight = svgEl.viewBox.baseVal.height || 900;
    } else {
      const vbAttr = svgEl.getAttribute('viewBox');
      if (vbAttr) {
        const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          [minX, minY, vbWidth, vbHeight] = parts;
        }
      }
    }

    const toPercent = (pt: { x: number; y: number }): PenPoint => ({
      x: Math.max(0, Math.min(100, ((pt.x - minX) / vbWidth) * 100)),
      y: Math.max(0, Math.min(100, ((pt.y - minY) / vbHeight) * 100)),
    });

    // Find all drawable visual geometry elements (exclude defs, clipPath)
    const drawableElements = Array.from(
      svgEl.querySelectorAll<SVGGeometryElement>('path, line, polyline, polygon, circle, ellipse, rect')
    ).filter(el => !el.closest('defs') && !el.closest('clipPath'));

    if (drawableElements.length === 0) {
      setPens([]);
      return;
    }

    // Initialize every element: keep stroke ready for progressive tracing
    drawableElements.forEach(el => {
      let len = 350;
      try {
        if (typeof el.getTotalLength === 'function') {
          len = el.getTotalLength() || 350;
        }
      } catch {
        len = 350;
      }
      
      const origFill = el.getAttribute('fill') || el.style.fill || '';
      const origStroke = el.getAttribute('stroke') || el.style.stroke || '';
      const origStrokeWidth = el.getAttribute('stroke-width') || el.style.strokeWidth || '';

      el.setAttribute('data-len', `${len}`);
      el.setAttribute('data-orig-fill', origFill);
      el.setAttribute('data-orig-stroke', origStroke);
      el.setAttribute('data-orig-strokewidth', origStrokeWidth);

      // If element has no stroke, provide a sketch stroke so the pen has a visible line to draw
      if (!origStroke || origStroke === 'none') {
        const sketchColor = origFill && origFill !== 'none' ? origFill : '#262626';
        el.style.stroke = sketchColor;
        el.style.strokeWidth = '1.5px';
      }

      el.removeAttribute('data-drawn');
      el.removeAttribute('data-drawing');
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      el.style.fillOpacity = '0';
      el.style.opacity = '0';
      el.style.transition = 'none';
    });

    // Number of active pens (clamped between 1 and min(penCount, 4, elements.length))
    const activeCount = Math.max(1, Math.min(penCount, 4, drawableElements.length));

    // Initialize pens
    const initialPens: ActivePen[] = [];
    for (let i = 0; i < activeCount; i++) {
      const style = PEN_STYLES[i % PEN_STYLES.length];
      initialPens.push({
        id: i,
        pos: { x: 50, y: 50 },
        angle: -25 + (i * 10),
        isLifted: true,
        barrelColor: style.barrelColor,
        accentColor: style.accentColor,
        inkGlow: style.inkGlow,
        visible: true,
      });
    }
    setPens(initialPens);

    // Shared thread-safe task queue
    const queue = Array.from({ length: drawableElements.length }, (_, idx) => idx);
    let activeWorkers = activeCount;

    // Worker function for a single pen
    const runPenWorker = (penId: number) => {
      if (isCancelledRef.current) return;

      if (queue.length === 0) {
        // This pen has finished its work: lift up and finish
        activeWorkers--;
        setPens(prev => prev.map(p => p.id === penId ? { ...p, isLifted: true } : p));
        if (activeWorkers <= 0) {
          // All pens finished: GUARANTEE EVERY ELEMENT IS 100% VISIBLE & BLOOMED
          drawableElements.forEach(el => {
            el.setAttribute('data-drawn', 'true');
            el.style.transition = 'fill-opacity 0.4s ease-out, opacity 0.3s ease-out';
            el.style.opacity = '1';
            el.style.fillOpacity = '1';
            el.style.strokeDashoffset = '0';

            const origStroke = el.getAttribute('data-orig-stroke');
            const origStrokeWidth = el.getAttribute('data-orig-strokewidth');
            if (origStroke === 'none') {
              el.style.stroke = 'none';
              el.style.strokeWidth = origStrokeWidth || '0';
            }
          });

          // Lift pens and fade out gracefully
          setTimeout(() => {
            if (!isCancelledRef.current) {
              setPens(prev => prev.map(p => ({ ...p, visible: false })));
            }
          }, 350);
        }
        return;
      }

      const elementIndex = queue.shift()!;
      const el = drawableElements[elementIndex];
      if (!el) {
        runPenWorker(penId);
        return;
      }

      const len = parseFloat(el.getAttribute('data-len') || '350');

      let startPt = { x: minX + vbWidth / 2, y: minY + vbHeight / 2 };
      try {
        if (typeof el.getPointAtLength === 'function') {
          startPt = el.getPointAtLength(0);
        }
      } catch {}

      const startPct = toPercent(startPt);

      // 1. Lift pen and glide to the start of this stroke
      setPens(prev => prev.map(p => p.id === penId ? {
        ...p,
        pos: startPct,
        isLifted: true,
      } : p));

      // 80ms travel time through the air
      setTimeout(() => {
        if (isCancelledRef.current) return;

        // 2. Touch pen down on paper & reveal this specific path under nib
        el.setAttribute('data-drawing', 'true');
        el.style.opacity = '1';

        setPens(prev => prev.map(p => p.id === penId ? { ...p, isLifted: false } : p));

        // Speed scaled inversely by pen count
        const baseSpeed = Math.max(120, Math.min(420, len * 0.45));
        const duration = baseSpeed / Math.sqrt(activeCount);
        const startTime = performance.now();

        const tracePath = (currentTime: number) => {
          if (isCancelledRef.current) return;
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          // Eased drawing motion
          const eased = 1 - Math.pow(1 - progress, 2);
          const currentLen = len * eased;

          // Reveal stroke directly under pen nib
          el.style.strokeDashoffset = `${len - currentLen}`;

          try {
            if (typeof el.getPointAtLength === 'function') {
              const currentPt = el.getPointAtLength(currentLen);
              const currentPct = toPercent(currentPt);

              let currentAngle = -25;
              if (currentLen > 4) {
                const prevPt = el.getPointAtLength(Math.max(0, currentLen - 4));
                const dx = currentPt.x - prevPt.x;
                const dy = currentPt.y - prevPt.y;
                if (Math.hypot(dx, dy) > 0.5) {
                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  currentAngle = Math.max(-42, Math.min(8, angleDeg - 36));
                }
              }

              setPens(prev => prev.map(p => p.id === penId ? {
                ...p,
                pos: currentPct,
                angle: currentAngle,
              } : p));
            }
          } catch {}

          if (progress < 1) {
            animFramesRef.current[penId] = requestAnimationFrame(tracePath);
          } else {
            // Stroke complete: GUARANTEE OPACITY IS 1 and bloom fill
            el.removeAttribute('data-drawing');
            el.setAttribute('data-drawn', 'true');
            el.style.strokeDashoffset = '0';
            el.style.opacity = '1';
            el.style.transition = 'fill-opacity 0.3s ease-out';
            el.style.fillOpacity = '1';

            // Next task for this pen
            runPenWorker(penId);
          }
        };

        animFramesRef.current[penId] = requestAnimationFrame(tracePath);
      }, 80);
    };

    // Launch concurrent pen workers
    for (let i = 0; i < activeCount; i++) {
      setTimeout(() => {
        if (!isCancelledRef.current) {
          runPenWorker(i);
        }
      }, i * 30);
    }

    return () => {
      isCancelledRef.current = true;
      animFramesRef.current.forEach(id => {
        if (id) cancelAnimationFrame(id);
      });
      animFramesRef.current = [];
    };
  }, [svgContent, penCount, aspectRatio]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none real-pen-canvas">
      {/* SVG Canvas Host */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain pointer-events-none transition-all"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Active Concurrent Drawing Pens Tracking Directly on Lines */}
      {pens.map(pen => {
        if (!pen.visible) return null;

        return (
          <div
            key={pen.id}
            style={{
              left: `${pen.pos.x}%`,
              top: `${pen.pos.y}%`,
              transform: pen.isLifted
                ? `translate(-6px, -62px) scale(1.06) rotate(${pen.angle}deg)`
                : `translate(-6px, -56px) scale(1) rotate(${pen.angle}deg)`,
              transformOrigin: '6px 56px',
              transition: pen.isLifted
                ? 'left 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.1s ease-out'
                : 'transform 0.04s ease-out',
            }}
            className="absolute pointer-events-none z-40 select-none filter drop-shadow-xl"
          >
            {/* Custom Artist Fountain Stylus */}
            <svg width="60" height="60" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Dynamic contact shadow */}
              <ellipse
                cx="14"
                cy={pen.isLifted ? 56 : 53}
                rx={pen.isLifted ? 9 : 7}
                ry={pen.isLifted ? 4 : 2.5}
                fill="rgba(0,0,0,0.35)"
                filter={`blur(${pen.isLifted ? '4px' : '1.5px'})`}
                opacity={pen.isLifted ? 0.3 : 0.7}
                className="transition-all duration-75"
              />

              {/* Pen Barrel with Theme Color */}
              <path d="M12 50 L48 14 L53 19 L17 55 Z" fill={pen.barrelColor} stroke="#44403c" strokeWidth="0.75" />
              <path d="M14 52 L49 17" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.25" />

              {/* Metallic Accent Band */}
              <path d="M47 13 L50 10 L55 15 L52 18 Z" fill={pen.accentColor} stroke="#d97706" strokeWidth="0.4" />

              {/* Grip Section */}
              <path d="M10 52 L16 46 L19 49 L13 55 Z" fill="#3f3f46" stroke="#52525b" strokeWidth="0.5" />

              {/* Fine Iridium Nib pointing at (6, 56) */}
              <polygon points="10,52 6,56 13,55" fill="#f4f4f5" stroke="#71717a" strokeWidth="0.5" />
              <polygon points="9,53 7.2,55.2 11.5,54.2" fill={pen.accentColor} />
              <line x1="6" y1="56" x2="9.5" y2="53.5" stroke="#18181b" strokeWidth="0.8" strokeLinecap="round" />
            </svg>

            {/* Ink Micro-particle Glowing at Contact Point (Only when touching paper) */}
            {!pen.isLifted && (
              <div
                style={{
                  left: '6px',
                  top: '56px',
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute flex items-center justify-center pointer-events-none"
              >
                <span 
                  style={{ backgroundColor: pen.inkGlow }}
                  className="w-2.5 h-2.5 rounded-full opacity-80 blur-[1px] animate-ping" 
                />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 shadow-xs" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
