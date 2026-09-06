// ── Knowledge Atlas — cool cartographic world ──
export const MAP_W = 3200;
export const MAP_H = 2000;

export interface MapNode { id: string; x: number; y: number; r: number; color: string; cluster: string; label?: string; topic: string; }
export interface MapEdge { a: string; b: string; }

type Land = { d: string; cx: number; cy: number; name: string };

export const MAP_LANDS: Land[] = [
  { name: 'Aurora',   cx: 360, cy: 380, d: `M 260 520 C 180 420 220 280 340 220 C 480 160 620 240 580 380 C 560 520 420 620 300 580 C 220 560 200 600 260 520 Z` },
  { name: 'Cerulia',  cx: 980, cy: 320, d: `M 820 340 C 780 260 860 180 980 200 C 1100 210 1180 320 1090 420 C 1020 520 880 540 800 460 C 740 400 760 360 820 340 Z` },
  { name: 'Veridia',  cx: 1480, cy: 520, d: `M 1320 620 C 1240 520 1300 360 1440 320 C 1580 300 1720 400 1680 560 C 1640 700 1480 760 1340 700 C 1220 660 1240 620 1320 620 Z` },
  { name: 'Nimbus',   cx: 2160, cy: 280, d: `M 2020 280 C 1940 200 2060 120 2200 140 C 2340 160 2420 300 2300 400 C 2180 500 2000 480 1940 380 C 1900 320 1960 280 2020 280 Z` },
  { name: 'Solaire',  cx: 2560, cy: 600, d: `M 2440 720 C 2320 640 2380 520 2520 480 C 2660 460 2800 560 2720 700 C 2640 820 2420 860 2280 780 C 2200 720 2320 680 2440 720 Z` },
  { name: 'Brume',    cx: 700, cy: 920, d: `M 600 1020 C 520 940 580 820 700 800 C 820 790 900 900 840 1020 C 780 1120 620 1140 560 1040 Z` },
  { name: 'Khepri',   cx: 1820, cy: 1020, d: `M 1680 1100 C 1580 1020 1640 900 1780 880 C 1920 870 2040 980 1960 1120 C 1880 1220 1680 1220 1600 1120 Z` },
  { name: 'Astrae',   cx: 2790, cy: 1040, d: `M 2680 1120 C 2600 1040 2680 920 2820 920 C 2940 940 3000 1060 2900 1160 C 2800 1240 2620 1220 2580 1120 Z` },
];

// Back-compat for older imports
export const MAP_LAND_PATHS = MAP_LANDS.map(l => l.d);

// meandering rivers (lie inside their island)
export const MAP_RIVERS: string[] = [
  `M 320 340 C 340 360 360 400 355 440 C 350 480 370 520 400 545`,
  `M 420 250 C 440 290 420 320 460 360 C 490 400 520 380 560 410`,
  `M 980 260 C 1000 300 980 340 1020 380 L 1050 430`,
  `M 1420 380 C 1450 420 1440 480 1480 520 C 1520 560 1560 540 1620 580`,
  `M 1500 420 C 1530 440 1550 500 1580 540`,
  `M 2140 180 C 2160 220 2140 300 2180 340 L 2210 380`,
  `M 2520 540 C 2550 580 2540 640 2570 680`,
  `M 680 840 C 700 880 690 940 720 980`,
  `M 1740 920 C 1770 960 1760 1020 1790 1070`,
  `M 2780 960 C 2800 1000 2820 1040 2850 1080`,
];

// tiny mountain ridges & forest speckles (rendered as symbols)
export const MAP_PEAKS: { x: number; y: number; s: number }[] = [
  { x: 380, y: 300, s: 1 }, { x: 400, y: 320, s: 0.9 }, { x: 420, y: 295, s: 0.85 },
  { x: 1000, y: 320, s: 0.9 }, { x: 1020, y: 350, s: 0.8 },
  { x: 1460, y: 420, s: 1 }, { x: 1490, y: 460, s: 0.9 }, { x: 1520, y: 430, s: 0.85 }, { x: 1560, y: 470, s: 0.75 },
  { x: 2170, y: 220, s: 0.85 }, { x: 2190, y: 260, s: 0.8 },
  { x: 2560, y: 540, s: 0.9 }, { x: 2590, y: 570, s: 0.8 },
  { x: 700, y: 860, s: 0.8 }, { x: 1800, y: 940, s: 0.9 },
];

const PALETTE: { key: string; color: string }[] = [
  { key: 'red',     color: '#c93a2e' },
  { key: 'salmon',  color: '#e07a5a' },
  { key: 'orange',  color: '#e67e22' },
  { key: 'magenta', color: '#c2528a' },
  { key: 'purple',  color: '#8a4fbf' },
  { key: 'lilac',   color: '#7a78d6' },
  { key: 'sky',     color: '#55b6e6' },
  { key: 'blue',    color: '#2b6cb0' },
  { key: 'navy',    color: '#1a365d' },
  { key: 'green',   color: '#2f9d4a' },
  { key: 'teal',    color: '#14919b' },
  { key: 'grey',    color: '#6b7280' },
];

const HUB_LABELS = ['Aeroplane','Engineer','Doctor',"Newton's Laws",'Velocity','Matter','Gravity','Atom','Cell','Volcano','Robot','Star'];

const EASY_TOPICS: string[] = [
  'Aeroplane','Engineer','Doctor',"Newton's Laws",'Velocity','Matter','Gravity','Atom','Molecule','Cell','DNA','Vaccine','Virus','Photosynthesis','Electricity','Magnetism','Light','Sound','Energy','Force','Pressure','Friction','Inertia','Momentum','Volcano','Earthquake','Climate','Ocean','Star','Planet','Black Hole','Galaxy','Moon','Water','Air','Metal','Computer','Internet','Robot','Bridge','Building','Car','Train',
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMap(seed = Math.floor(Math.random() * 1e9)): { nodes: MapNode[]; edges: MapEdge[] } {
  const rnd = mulberry32(seed);
  const nodes: MapNode[] = [];
  const N = 148;
  const hubCount = 12;
  const mx = 120, my = 90;
  for (let i = 0; i < N; i++) {
    const pal = PALETTE[i % PALETTE.length];
    const r = 3 + rnd() * 5.2 + (i < hubCount ? 3.2 : 0);
    const x = mx + rnd() * (MAP_W - mx * 2);
    const y = my + rnd() * (MAP_H - my * 2);
    const isHub = i < hubCount;
    const topic = isHub ? HUB_LABELS[i % HUB_LABELS.length] : EASY_TOPICS[Math.floor(rnd()*EASY_TOPICS.length)];
    nodes.push({
      id: isHub ? `hub-${i}` : `n-${i}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.round(r * 10) / 10,
      color: pal.color,
      cluster: pal.key,
      label: isHub ? HUB_LABELS[i % HUB_LABELS.length] : undefined,
      topic,
    });
  }
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        const minD = a.r + b.r + 14;
        if (d < minD && d > 0.001) {
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x += nx * push; a.y += ny * push;
          b.x -= nx * push; b.y -= ny * push;
          a.x = Math.max(mx, Math.min(MAP_W - mx, a.x));
          a.y = Math.max(my, Math.min(MAP_H - my, a.y));
          b.x = Math.max(mx, Math.min(MAP_W - mx, b.x));
          b.y = Math.max(my, Math.min(MAP_H - my, b.y));
        }
      }
    }
  }
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (a: string, b: string) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ a, b });
  };
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const nearest = nodes
      .map((b, j) => ({ j, b, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(o => o.j !== i && o.d < 320)
      .sort((u, v) => u.d - v.d)
      .slice(0, rnd() < 0.55 ? 1 : rnd() < 0.85 ? 2 : 3);
    for (const n of nearest) if (rnd() < 0.88) addEdge(a.id, n.b.id);
  }
  for (let i = 0; i < hubCount; i++) {
    const h = nodes[i];
    const cands = nodes.filter(n => n.id !== h.id).sort((u, v) => Math.hypot(h.x - u.x, h.y - u.y) - Math.hypot(h.x - v.x, h.y - v.y));
    let k = 0;
    for (const c of cands) { if (k >= 4) break; if (!seen.has(h.id < c.id ? `${h.id}|${c.id}` : `${c.id}|${h.id}`)) { addEdge(h.id, c.id); k++; } }
  }
  return { nodes, edges };
}

export const MAP_DEFAULT = buildMap(1337);
