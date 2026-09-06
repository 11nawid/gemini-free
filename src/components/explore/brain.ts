// ── Brain constellation data (light background like the reference image) ──
export const BRAIN_W = 860;
export const BRAIN_H = 520;
// faint brain outline path (side view, left=frontal) — only for subtle fill
export const BRAIN_PATH =
  'M 88 265 C 58 238 44 198 66 152 C 88 102 142 72 202 68 C 248 42 312 48 358 92 C 402 62 468 78 498 118 C 544 94 602 104 628 152 C 656 184 652 244 612 286 C 638 312 628 362 586 386 C 542 410 486 408 442 378 C 412 398 362 402 318 384 C 268 404 218 392 182 358 C 132 352 86 312 88 265 Z';

export interface BrainNode {
  id: string;
  x: number; y: number;
  r: number;
  color: string;
  cluster: string;
  label?: string; // only hubs have labels
}

export interface BrainEdge { a: string; b: string; }

type Cluster = { key: string; cx: number; cy: number; color: string; hubs: { id: string; label: string; x:number; y:number; r:number }[]; leafCount: number; spread: number };

// clusters positioned to match the reference image distribution
const CLUSTERS: Cluster[] = [
  { key: 'red',   cx: 150, cy: 208, color: '#c93a2e', hubs: [{ id:'front-hub', label:'Perception', x:156, y:212, r:9 }], leafCount: 14, spread: 62 },
  { key: 'salmon',cx: 220, cy: 268, color: '#e07a5a', hubs: [{ id:'salmon-hub', label:'Memory', x:224, y:272, r:7 }], leafCount: 12, spread: 52 },
  { key: 'orange',cx: 262, cy: 168, color: '#e67e22', hubs: [{ id:'learn-hub', label:'Learning', x:268, y:172, r:10 }], leafCount: 10, spread: 48 },
  { key: 'magenta',cx: 318, cy: 262, color: '#c2528a', hubs: [{ id:'emotion-hub', label:'Emotion', x:322, y:268, r:8 }], leafCount: 13, spread: 58 },
  { key: 'purple',cx: 368, cy: 146, color: '#8a4fbf', hubs: [{ id:'language-hub', label:'Language', x:372, y:152, r:8 }], leafCount: 11, spread: 52 },
  { key: 'lilac', cx: 422, cy: 202, color: '#7a78d6', hubs: [{ id:'reason-hub', label:'Reasoning', x:428, y:208, r:9 }], leafCount: 10, spread: 50 },
  { key: 'sky',   cx: 498, cy: 148, color: '#55b6e6', hubs: [{ id:'vision-hub', label:'Vision', x:504, y:152, r:9 }], leafCount: 14, spread: 60 },
  { key: 'blue',  cx: 518, cy: 272, color: '#2b6cb0', hubs: [{ id:'control-hub', label:'Control', x:522, y:278, r:10 }], leafCount: 16, spread: 66 },
  { key: 'navy',  cx: 518, cy: 388, color: '#1a365d', hubs: [{ id:'action-hub', label:'Action', x:524, y:394, r:7 }], leafCount: 9, spread: 46 },
  { key: 'green', cx: 652, cy: 222, color: '#2f9d4a', hubs: [{ id:'adapt-hub', label:'Adaptation', x:658, y:226, r:10 }], leafCount: 18, spread: 68 },
  { key: 'grey',  cx: 442, cy: 392, color: '#6b7280', hubs: [{ id:'body-hub', label:'Body', x:446, y:398, r:6 }], leafCount: 8, spread: 42 },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildBrain(seed = 42): { nodes: BrainNode[]; edges: BrainEdge[] } {
  const rnd = mulberry32(seed);
  const nodes: BrainNode[] = [];
  const edges: BrainEdge[] = [];

  for (const c of CLUSTERS) {
    for (const h of c.hubs) {
      nodes.push({ id: h.id, x: h.x, y: h.y, r: h.r, color: c.color, cluster: c.key, label: h.label });
    }
  }

  // leaves
  for (const c of CLUSTERS) {
    const hubId = c.hubs[0].id;
    for (let i = 0; i < c.leafCount; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = (0.22 + rnd() * 0.78) * c.spread;
      // starburst for green cluster like reference ( tighter radial )
      const isStarburst = c.key === 'green';
      const r = isStarburst ? (rnd() < 0.55 ? 3 + rnd()*2 : 5 + rnd()*2.5) : (rnd() < 0.6 ? 3 + rnd()*1.8 : 4.5 + rnd()*2.2);
      const x = c.cx + Math.cos(ang) * rad + (rnd()-0.5)*6;
      const y = c.cy + Math.sin(ang) * rad + (rnd()-0.5)*6;
      const id = `${c.key}-n${i}`;
      nodes.push({ id, x: Math.round(x*10)/10, y: Math.round(y*10)/10, r: Math.round(r*10)/10, color: c.color, cluster: c.key });
      edges.push({ a: hubId, b: id });
      // occasionally link leaf-leaf inside same cluster
      if (rnd() < 0.18 && i > 0) {
        const prev = `${c.key}-n${Math.floor(rnd()*i)}`;
        edges.push({ a: id, b: prev });
      }
    }
  }

  // inter-hub backbone (mirrors image's faint long connections)
  const hubIds = CLUSTERS.map(c => c.hubs[0].id);
  const backbone: [string,string][] = [
    ['front-hub','salmon-hub'], ['salmon-hub','emotion-hub'], ['emotion-hub','reason-hub'],
    ['reason-hub','vision-hub'], ['vision-hub','control-hub'], ['control-hub','adapt-hub'],
    ['learn-hub','emotion-hub'], ['learn-hub','language-hub'], ['language-hub','reason-hub'],
    ['control-hub','body-hub'], ['control-hub','action-hub'], ['adapt-hub','control-hub'],
    ['front-hub','learn-hub'], ['emotion-hub','control-hub'],
  ];
  for (const [a,b] of backbone) edges.push({ a, b });

  // a few long grey cross edges for realism
  const crossPairs: [string,string][] = [
    ['front-hub','reason-hub'], ['salmon-hub','vision-hub'], ['language-hub','adapt-hub'],
  ];
  for (const [a,b] of crossPairs) if (rnd() < 0.7) edges.push({ a,b });

  return { nodes, edges };
}

export const BRAIN = buildBrain(1337);
