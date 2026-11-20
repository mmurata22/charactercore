import { uid } from './format';

/**
 * Character maps (in the character book).
 *   relationships — lines between characters with a hand-typed label ("brother", "neighbor").
 *   feelings      — one-way arrows from one character to another with an emotion; each emotion
 *                   has a colour, kept in the map's legend so the same feeling is always the same colour.
 *
 * map = { id, kind, name, nodes:[{charId,x,y}], links:[{id,from,to,label,color}], emotions:[{label,color}] }
 * Positions are in a 1000 × 640 drawing space.
 */
export const MAP_W = 1000;
export const MAP_H = 640;

export const MAP_KINDS = {
  relationships: { label: 'Relationship map', short: 'Relationships', blurb: 'Lines between characters, labelled with how they’re related.' },
  feelings: { label: 'Feelings map', short: 'Feelings', blurb: 'One-way arrows showing how one character feels about another, colour-coded by feeling.' },
};

export const RELATIONSHIP_SUGGESTIONS = [
  'brother', 'sister', 'sibling', 'parent', 'child', 'cousin', 'partner', 'spouse', 'ex', 'friend',
  'best friend', 'neighbor', 'roommate', 'coworker', 'boss', 'mentor', 'rival', 'stranger',
];

export const DEFAULT_EMOTIONS = [
  { label: 'likes', color: '#1f8a4c' },
  { label: 'dislikes', color: '#dc2626' },
  { label: 'crushes on', color: '#c2337a' },
  { label: 'doesn’t know', color: '#78716c' },
  { label: 'loves', color: '#e0677a' },
  { label: 'trusts', color: '#2457d6' },
  { label: 'fears', color: '#7a3fc4' },
  { label: 'envies', color: '#d97706' },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

export function newMap(kind, name) {
  return {
    id: uid() + uid(),
    kind,
    name: name || MAP_KINDS[kind].label,
    nodes: [],
    links: [],
    emotions: kind === 'feelings' ? DEFAULT_EMOTIONS.map((e) => ({ ...e })) : [],
  };
}

/** Clean untrusted maps; drops characters that no longer exist and links to them. */
export function normalizeMaps(maps, charIds) {
  if (!Array.isArray(maps)) return [];
  return maps
    .filter((m) => m && m.id && MAP_KINDS[m.kind])
    .map((m) => {
      const nodes = (Array.isArray(m.nodes) ? m.nodes : [])
        .filter((n) => n && charIds.has(n.charId))
        .map((n) => ({ charId: n.charId, x: clamp(+n.x || MAP_W / 2, 40, MAP_W - 40), y: clamp(+n.y || MAP_H / 2, 40, MAP_H - 50) }));
      const ids = new Set(nodes.map((n) => n.charId));
      const links = (Array.isArray(m.links) ? m.links : [])
        .filter((l) => l && ids.has(l.from) && ids.has(l.to) && l.from !== l.to)
        .map((l) => ({ id: l.id || uid(), from: l.from, to: l.to, label: String(l.label ?? ''), color: isColor(l.color) ? l.color : '' }));
      const emotions =
        m.kind === 'feelings'
          ? (Array.isArray(m.emotions) ? m.emotions : DEFAULT_EMOTIONS)
              .filter((e) => e && e.label)
              .map((e) => ({ label: String(e.label), color: isColor(e.color) ? e.color : '#78716c' }))
          : [];
      return { id: m.id, kind: m.kind, name: String(m.name || MAP_KINDS[m.kind].label), nodes, links, emotions };
    });
}

/** Where to drop the next character added to a map: around an ellipse (8 per ring), then an inner ring. */
export function nextNodePosition(count) {
  const ring = Math.floor(count / 8);
  const slot = count % 8;
  const angle = -Math.PI / 2 + (slot / 8) * Math.PI * 2 + ring * 0.39;
  const scale = Math.max(0.3, 1 - ring * 0.42);
  return {
    x: clamp(MAP_W / 2 + 360 * scale * Math.cos(angle), 70, MAP_W - 70),
    y: clamp(MAP_H / 2 - 10 + 220 * scale * Math.sin(angle), 60, MAP_H - 80),
  };
}

export const emotionColor = (map, label) =>
  map.emotions.find((e) => e.label.toLowerCase() === label.toLowerCase())?.color ?? '#78716c';

/** Colour a link is drawn in. */
export const linkColor = (map, link) => (map.kind === 'feelings' ? emotionColor(map, link.label) : link.color || '');
