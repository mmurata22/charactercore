import { uid } from './format';

/** Screenplay element types, in Tab-cycling order. */
export const ELEMENT_TYPES = [
  { key: 'scene', label: 'Scene heading', placeholder: 'INT. KITCHEN – NIGHT' },
  { key: 'action', label: 'Action', placeholder: 'What we see and hear.' },
  { key: 'character', label: 'Character', placeholder: 'CHARACTER' },
  { key: 'parenthetical', label: 'Parenthetical', placeholder: '(beat)' },
  { key: 'dialogue', label: 'Dialogue', placeholder: 'What they say.' },
  { key: 'transition', label: 'Transition', placeholder: 'CUT TO:' },
];
export const TYPE_KEYS = ELEMENT_TYPES.map((t) => t.key);
/**
 * 'section' elements are section dividers ("Act One"): they group the scenes after them in the
 * scene menu, print as a divider line and export as Fountain sections. They aren't part of any scene.
 */
const ALL_TYPES = [...TYPE_KEYS, 'section'];
export const typeInfo = (key) => ELEMENT_TYPES.find((t) => t.key === key) || ELEMENT_TYPES[1];

/** What Enter creates after each element type. */
const NEXT = {
  scene: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'action',
  transition: 'scene',
};
export const nextType = (t) => NEXT[t] || 'action';
export const cycleType = (t, dir) => {
  const i = TYPE_KEYS.indexOf(t);
  return TYPE_KEYS[(i + dir + TYPE_KEYS.length) % TYPE_KEYS.length];
};

export const newElement = (type = 'action', text = '') => ({ id: uid(), type, text });

/** What the project is; sets the cover page's credit line. */
export const FORMATS = [
  { key: 'feature', label: 'Feature film', credit: 'Written by' },
  { key: 'short', label: 'Short film', credit: 'Written by' },
  { key: 'tv', label: 'TV episode', credit: 'Written by' },
  { key: 'play', label: 'Stage play', credit: 'A play by' },
  { key: 'book', label: 'Book', credit: 'by' },
  { key: 'other', label: 'Other', credit: 'by' },
];
export const formatInfo = (key) => FORMATS.find((f) => f.key === key) || FORMATS[0];

/** Cover page fields besides title and author. */
export const COVER_FIELDS = ['format', 'subtitle', 'basedOn', 'draft', 'date', 'contact'];
const blankCover = () => ({ format: 'feature', subtitle: '', basedOn: '', draft: '', date: '', contact: '' });

/**
 * script = { title, author, cover: {...}, elements[] }
 * `title` is the whole project's title (the book or movie), shown on the cover page.
 */
export const blankScript = () => ({ title: '', author: '', cover: blankCover(), elements: [newElement('scene')] });

export function normalizeScript(s) {
  if (!s || !Array.isArray(s.elements)) return blankScript();
  let elements = s.elements
    .filter((e) => e && ALL_TYPES.includes(e.type))
    .map((e) => ({ id: e.id || uid(), type: e.type, text: String(e.text ?? '') }));
  // Earlier builds kept dividers in a side list anchored to a scene; turn them into section elements.
  if (Array.isArray(s.dividers) && s.dividers.length) {
    const before = new Map(s.dividers.filter((d) => d && d.sceneId).map((d) => [d.sceneId, d]));
    elements = elements.flatMap((e) => {
      const d = before.get(e.id);
      return d ? [{ id: d.id || uid(), type: 'section', text: String(d.name || 'Untitled section') }, e] : [e];
    });
  }
  const cover = blankCover();
  for (const k of COVER_FIELDS) if (typeof s.cover?.[k] === 'string') cover[k] = s.cover[k];
  return {
    title: String(s.title ?? ''),
    author: String(s.author ?? ''),
    cover,
    elements: elements.length ? elements : [newElement('scene')],
  };
}

export const isEmptyScript = (s) =>
  !s.title && !s.author && COVER_FIELDS.every((k) => k === 'format' || !s.cover[k]) && s.elements.every((e) => !e.text.trim());

/**
 * Split the element list into scenes: each starts at a scene heading and runs to the next.
 * Anything before the first heading becomes an "Opening" (e.g. FADE IN:).
 * Each: { key, heading (element|null), n (scene number|null), start, end } — indices into elements.
 */
export function splitScenes(elements) {
  const out = [];
  let n = 0;
  let cur = null;
  elements.forEach((e, i) => {
    if (e.type === 'section') {
      cur = null; // a section divider ends the scene before it
      return;
    }
    if (e.type === 'scene' || !cur) {
      const isScene = e.type === 'scene';
      cur = { key: e.id, heading: isScene ? e : null, n: isScene ? ++n : null, start: i, end: i + 1 };
      out.push(cur);
    } else cur.end = i + 1;
  });
  return out;
}

/**
 * The script's outline as movable blocks, in order: section dividers and scenes.
 * Each block is a contiguous run of elements: { kind:'section'|'scene', key, start, end, scene? }.
 */
export function outlineBlocks(elements) {
  const scenes = splitScenes(elements);
  const blocks = scenes.map((s) => ({ kind: 'scene', key: s.key, start: s.start, end: s.end, scene: s }));
  elements.forEach((e, i) => e.type === 'section' && blocks.push({ kind: 'section', key: e.id, start: i, end: i + 1, section: e }));
  return blocks.sort((a, b) => a.start - b.start);
}

/** Rebuild the element list with its blocks in a new order. */
export const flattenBlocks = (elements, blocks) => blocks.flatMap((b) => elements.slice(b.start, b.end));

/** Group blocks into sections: [{ section: block|null, blocks: [...] }]; the first group may have no section. */
export function groupBlocks(blocks) {
  const groups = [];
  for (const b of blocks) {
    if (b.kind === 'section' || !groups.length) groups.push({ section: b.kind === 'section' ? b : null, blocks: [] });
    if (b.kind === 'scene') groups[groups.length - 1].blocks.push(b);
  }
  return groups;
}

/** A text block before the first scene heading ("FADE IN:") stays first. */
const isPinned = (b) => b.kind === 'scene' && !b.scene.heading && b.start === 0;

/** Move one scene up or down one place; crossing a divider moves it into the neighbouring section. */
export function moveScene(elements, key, dir) {
  const blocks = outlineBlocks(elements);
  const i = blocks.findIndex((b) => b.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length || isPinned(blocks[i]) || isPinned(blocks[j])) return elements;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return flattenBlocks(elements, blocks);
}

/** Move a whole section (divider + its scenes) up or down past its neighbouring section. */
export function moveSection(elements, key, dir) {
  const groups = groupBlocks(outlineBlocks(elements));
  const i = groups.findIndex((g) => g.section?.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= groups.length || !groups[j].section) return elements; // never above the unsectioned top
  [groups[i], groups[j]] = [groups[j], groups[i]];
  return flattenBlocks(elements, groups.flatMap((g) => [g.section, ...g.blocks].filter(Boolean)));
}

/**
 * Drag and drop in the scene menu. Moves block `key` (a scene, or a section with its scenes)
 * to just before block `beforeKey` (null = the very end).
 */
export function dropBlock(elements, key, beforeKey) {
  if (key === beforeKey) return elements;
  const blocks = outlineBlocks(elements);
  const dragged = blocks.find((b) => b.key === key);
  if (!dragged || isPinned(dragged)) return elements;
  let moving = [dragged];
  if (dragged.kind === 'section') {
    const at = blocks.indexOf(dragged);
    const nextSection = blocks.findIndex((b, k) => k > at && b.kind === 'section');
    moving = blocks.slice(at, nextSection < 0 ? blocks.length : nextSection);
    if (moving.some((b) => b.key === beforeKey)) return elements; // dropped inside itself
  }
  const rest = blocks.filter((b) => !moving.includes(b));
  let at = beforeKey ? rest.findIndex((b) => b.key === beforeKey) : rest.length;
  if (at < 0) at = rest.length;
  if (at === 0 && rest[0] && isPinned(rest[0])) at = 1;
  rest.splice(at, 0, ...moving);
  return flattenBlocks(elements, rest);
}

/** Index of the scene containing element `id`, or -1. */
export function sceneIndexOf(scenes, elements, id) {
  const i = elements.findIndex((e) => e.id === id);
  return i < 0 ? -1 : scenes.findIndex((s) => i >= s.start && i < s.end);
}

const SCENE_PREFIX = /^(int|ext|est|int\.?\/ext|i\/e)[.\s]/i;

/** While typing action, recognise scene headings and transitions and switch type. */
export function detectType(type, text) {
  if (type !== 'action') return type;
  if (SCENE_PREFIX.test(text)) return 'scene';
  if (/^[A-Z ]+TO:$/.test(text.trim())) return 'transition';
  return type;
}

/** Adjust text when an element changes type (parentheticals carry their own brackets). */
export function retypeText(text, from, to) {
  if (to === 'parenthetical' && !/^\(.*\)$/s.test(text)) return `(${text.replace(/^\(|\)$/g, '')})`;
  if (from === 'parenthetical' && to !== 'parenthetical') return text.replace(/^\(/, '').replace(/\)$/, '');
  return text;
}

/** "MARA (V.O.)" → "MARA" */
export const cueName = (text) => text.replace(/\(.*?\)/g, '').replace(/\^$/, '').trim().toUpperCase();

/** Scenes in order, and who speaks: name → { name, lines, scenes[] }. */
export function analyzeScript(elements) {
  const scenes = [];
  const cast = new Map();
  let scene = null;
  for (const e of elements) {
    if (e.type === 'scene') {
      scene = { id: e.id, n: scenes.length + 1, text: e.text };
      scenes.push(scene);
    } else if (e.type === 'character') {
      const name = cueName(e.text);
      if (!name) continue;
      let c = cast.get(name);
      if (!c) {
        c = { name, lines: 0, scenes: [] };
        cast.set(name, c);
      }
      c.lines++;
      if (scene && !c.scenes.includes(scene)) c.scenes.push(scene);
    }
  }
  return { scenes, cast };
}

/** Rough page count: 55 lines a page at standard widths (in characters) per element type. */
const WIDTH = { scene: 60, action: 60, character: 38, parenthetical: 25, dialogue: 35, transition: 60, section: 60 };
const GAP = { scene: 2, action: 1, character: 1, transition: 1, parenthetical: 0, dialogue: 0, section: 2 };
export function estimatePages(elements) {
  let lines = 0;
  for (const e of elements) {
    const w = WIDTH[e.type] || 60;
    const body = e.text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / w)), 0);
    lines += body + GAP[e.type];
  }
  return Math.max(1, Math.ceil(lines / 55));
}

/** Rename every cue for `oldName`, keeping extensions like (V.O.). */
export function renameCues(elements, oldName, newName) {
  const from = oldName.trim().toUpperCase();
  const to = newName.trim().toUpperCase();
  let count = 0;
  if (!from || !to || from === to) return { elements, count };
  const next = elements.map((e) => {
    if (e.type !== 'character' || cueName(e.text) !== from) return e;
    count++;
    const ext = e.text.match(/\(.*?\)/g)?.join(' ') ?? '';
    return { ...e, text: ext ? `${to} ${ext}` : to };
  });
  return { elements: next, count };
}

/** Plain-text Fountain screenplay (https://fountain.io), readable by most screenwriting apps. */
export function toFountain({ title, author, cover, elements }) {
  const out = [];
  const multi = (key, v) => (v.includes('\n') ? [`${key}:`, ...v.split('\n').map((l) => '   ' + l)] : [`${key}: ${v}`]);
  if (title) out.push(...multi('Title', cover.subtitle ? `${title}\n${cover.subtitle}` : title));
  if (author) out.push(`Credit: ${formatInfo(cover.format).credit}`, `Author: ${author}`);
  if (cover.basedOn) out.push(...multi('Source', cover.basedOn));
  if (cover.draft || cover.date) out.push(`Draft date: ${[cover.draft, cover.date].filter(Boolean).join(', ')}`);
  if (cover.contact) out.push(...multi('Contact', cover.contact));
  if (out.length) out.push('');
  const DIALOGUE_BLOCK = ['character', 'parenthetical', 'dialogue'];

  elements.forEach((e, i) => {
    const t = e.text.trim();
    if (!t) return;
    const prev = elements[i - 1];
    const continuesBlock =
      (e.type === 'parenthetical' || e.type === 'dialogue') && prev && DIALOGUE_BLOCK.includes(prev.type);
    if (!continuesBlock && out.length && out[out.length - 1] !== '') out.push('');

    if (e.type === 'section') out.push(`# ${t}`); // Fountain section
    else if (e.type === 'scene') {
      const u = t.toUpperCase();
      out.push(SCENE_PREFIX.test(u) ? u : '.' + u);
    } else if (e.type === 'character') out.push(t.toUpperCase());
    else if (e.type === 'parenthetical') out.push(t.startsWith('(') ? t : `(${t})`);
    else if (e.type === 'dialogue') out.push(t);
    else if (e.type === 'transition') {
      const u = t.toUpperCase();
      out.push(/TO:$/.test(u) ? u : '> ' + u);
    } else out.push(t === t.toUpperCase() && /[A-Z]/.test(t) ? '!' + t : t);
  });
  return out.join('\n') + '\n';
}
