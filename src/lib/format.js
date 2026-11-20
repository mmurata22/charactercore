export const uid = () => Math.random().toString(36).slice(2, 9);

/** Seconds → "m:ss.s", or an en dash when unset. */
export const fmt = (t) =>
  t == null || isNaN(t) ? '–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Lighten a character colour so it reads on the dark monitor / film strip. */
export const tint = (color, pct) => `color-mix(in srgb,${color} ${pct}%,white)`;

/** "Mara O'Neil" → "mara-o-neil"; safe for file names. */
export const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, ' ').trim().replace(/[\s_-]+/g, '-').slice(0, 40) || 'untitled';

/** Local timestamp like "2026-11-19_14-32-07". */
export const fileStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

export const formatWhen = (at) =>
  new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });

export const formatTime = (at) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function timeAgo(at, now = Date.now()) {
  const s = Math.round((now - at) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return plural(h, 'hour') + ' ago';
  return plural(Math.round(h / 24), 'day') + ' ago';
}

export const isVideoFile = (f) =>
  f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|ogv)$/i.test(f.name);
