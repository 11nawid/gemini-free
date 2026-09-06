import { CONNECTIONS } from './topics';

export const CANVAS_W = 3200;
export const CANVAS_H = 2000;
export const CENTER = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
export const RING_RADII = [520, 720, 900, 1080];
const SPEEDS = [0.015, -0.018, 0.012, -0.010];

import { TopicNode } from './topics';
export interface PhysicsNode extends TopicNode { x: number; y: number; baseAngle: number; pinned: boolean; }

export function initNodes(topics: TopicNode[]): PhysicsNode[] {
  return topics.map(t => {
    const r = RING_RADII[t.ring - 1] ?? 500;
    const x = CENTER.x + Math.cos(t.angle) * r;
    const y = CENTER.y + Math.sin(t.angle) * r * 0.58;
    return { ...t, x, y, baseAngle: t.angle, pinned: false };
  });
}

export function tick(nodes: PhysicsNode[], time: number): PhysicsNode[] {
  const s = time * 0.001;
  return nodes.map(n => {
    if (n.pinned) return n;
    const r = RING_RADII[n.ring - 1] ?? 500;
    const sp = SPEEDS[n.ring - 1] ?? 0;
    const ang = n.baseAngle + sp * s;
    return {
      ...n,
      x: CENTER.x + Math.cos(ang) * r + Math.sin(s * 0.6 + n.baseAngle * 4) * 4,
      y: CENTER.y + Math.sin(ang) * r * 0.58 + Math.cos(s * 0.5 + n.baseAngle * 3) * 3,
    };
  });
}

export function pinNode(nodes: PhysicsNode[], id: string): PhysicsNode[] {
  return nodes.map(n => n.id === id ? { ...n, pinned: true } : n);
}
export function unpinNode(nodes: PhysicsNode[], id: string): PhysicsNode[] {
  return nodes.map(n => {
    if (n.id !== id) return n;
    const dx = n.x - CENTER.x;
    const dy = n.y - CENTER.y;
    const ang = Math.atan2(dy / 0.58, dx);
    const sp = SPEEDS[n.ring - 1] ?? 0;
    return { ...n, pinned: false, baseAngle: ang - sp * (Date.now() * 0.001) };
  });
}
export function moveNode(nodes: PhysicsNode[], id: string, x: number, y: number): PhysicsNode[] {
  return nodes.map(n => n.id === id ? { ...n, x, y } : n);
}
export function connectedTo(id: string): Set<string> {
  const s = new Set<string>();
  for (const [a, b] of CONNECTIONS) { if (a === id) s.add(b); if (b === id) s.add(a); }
  return s;
}
