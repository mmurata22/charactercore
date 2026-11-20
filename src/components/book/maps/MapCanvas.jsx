import { useRef } from 'react';
import { MAP_H, MAP_W, linkColor } from '../../../lib/maps';

const R = 40; // node radius
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Readable text colour on top of a character colour. */
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#111' : '#fff';
}

/**
 * Curve geometry for every link. Links between the same two characters fan out so they never
 * overlap (e.g. A→B "likes" and B→A "doesn't know" become two separate arcs).
 */
function layoutLinks(map, pos) {
  const groups = new Map();
  for (const l of map.links) {
    const key = [l.from, l.to].sort().join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const out = [];
  for (const [key, list] of groups) {
    const [lo, hi] = key.split('|');
    const P = pos.get(lo);
    const Q = pos.get(hi);
    if (!P || !Q) continue;
    const dx = Q.x - P.x;
    const dy = Q.y - P.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d; // normal, consistent for the pair
    const ny = dx / d;
    const spread = map.kind === 'feelings' ? 46 : 40;
    list.forEach((l, i) => {
      const offset = (i - (list.length - 1) / 2) * spread; // a lone link is straight
      const A = pos.get(l.from);
      const B = pos.get(l.to);
      const C = { x: (A.x + B.x) / 2 + nx * offset, y: (A.y + B.y) / 2 + ny * offset };
      const towards = (from, to, by) => {
        const vx = to.x - from.x;
        const vy = to.y - from.y;
        const vl = Math.hypot(vx, vy) || 1;
        return { x: from.x + (vx / vl) * by, y: from.y + (vy / vl) * by };
      };
      const start = towards(A, C, R + 2);
      const end = towards(B, C, R + (map.kind === 'feelings' ? 9 : 2));
      const mid = { x: 0.25 * start.x + 0.5 * C.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * C.y + 0.25 * end.y };
      out.push({ link: l, d: `M${start.x},${start.y} Q${C.x},${C.y} ${end.x},${end.y}`, mid });
    });
  }
  return out;
}

export default function MapCanvas({ map, charOf, selectedNodes, selectedLink, onMoveNode, onNodeClick, onLinkClick, onBackgroundClick }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const pos = new Map(map.nodes.map((n) => [n.charId, n]));
  const links = layoutLinks(map, pos);
  const colors = [...new Set(links.map(({ link }) => linkColor(map, link) || 'var(--mute)'))];
  const markerId = (c) => `arrow-${map.id}-${colors.indexOf(c)}`;

  const toSvg = (e) => {
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
  };

  function down(e, node) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toSvg(e);
    drag.current = { id: node.charId, dx: node.x - p.x, dy: node.y - p.y, sx: e.clientX, sy: e.clientY, moved: false };
  }
  function move(e) {
    const g = drag.current;
    if (!g) return;
    if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 4) g.moved = true;
    if (!g.moved) return;
    const p = toSvg(e);
    onMoveNode(g.id, Math.min(MAP_W - R - 4, Math.max(R + 4, p.x + g.dx)), Math.min(MAP_H - R - 24, Math.max(R + 4, p.y + g.dy)));
  }
  function up() {
    const g = drag.current;
    drag.current = null;
    if (g && !g.moved) onNodeClick(g.id);
  }

  return (
    <svg
      ref={svgRef}
      className="map-svg"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="img"
      aria-label={`${map.name}: ${map.nodes.length} characters, ${map.links.length} connections`}
      onPointerDown={onBackgroundClick}
    >
      <defs>
        {colors.map((c) => (
          <marker key={c} id={markerId(c)} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>

      {links.map(({ link, d, mid }) => {
        const c = linkColor(map, link) || 'var(--mute)';
        const sel = selectedLink === link.id;
        return (
          <g key={link.id} className={sel ? 'map-link sel' : 'map-link'} onPointerDown={(e) => { e.stopPropagation(); onLinkClick(link.id); }}>
            <path d={d} className="map-hit" />
            <path d={d} fill="none" stroke={c} strokeWidth={sel ? 5 : 3}
              markerEnd={map.kind === 'feelings' ? `url(#${markerId(c)})` : undefined} />
            {link.label && (
              <text x={mid.x} y={mid.y} className="map-label" fill={map.kind === 'feelings' ? c : 'var(--ink)'}>{link.label}</text>
            )}
          </g>
        );
      })}

      {map.nodes.map((n) => {
        const c = charOf(n.charId);
        const sel = selectedNodes.includes(n.charId);
        return (
          <g key={n.charId} className={sel ? 'map-node sel' : 'map-node'} transform={`translate(${n.x},${n.y})`}
            onPointerDown={(e) => down(e, n)} onPointerMove={move} onPointerUp={up}>
            {sel && <circle r={R + 6} className="map-ring" />}
            <circle r={R} fill={c.color} />
            <text className="map-initials" fill={inkOn(c.color)} dy="0.35em">{initials(c.name)}</text>
            <text className="map-name" y={R + 24}>{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
