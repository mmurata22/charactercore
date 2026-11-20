import { uid } from './format';
import { splitScenes } from './script';

/**
 * Notes: comments on highlighted script text (or free-standing notes).
 *   note    = { id, text, quote, elementId, start, end, target, createdAt, updatedAt }
 *   target  = { type: 'character', id } | { type: 'section', id } | { type: 'none' }
 *   section = { id, name } — sections are made by the author (e.g. "Act 1", "Continuity").
 * The highlight is found again by its quoted text, so it survives edits around it.
 */
export const UNFILED_COLOR = '#eab308';
export const SECTION_COLOR = '#8fd0f5';

export function newNote({ quote = '', elementId = null, start = 0, end = 0, text = '', target = { type: 'none' } } = {}) {
  const now = Date.now();
  return { id: uid() + uid(), quote, elementId, start, end, text, target, createdAt: now, updatedAt: now };
}
export const newSection = (name) => ({ id: uid() + uid(), name });

export const normalizeSections = (list) =>
  Array.isArray(list) ? list.filter((s) => s && s.id && s.name).map((s) => ({ id: s.id, name: String(s.name) })) : [];

/** Clean untrusted notes; a note filed under a character or section that's gone becomes unfiled. */
export function normalizeNotes(list, charIds, sectionIds) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((n) => n && n.id)
    .map((n) => {
      const t = n.target || {};
      let target = { type: 'none' };
      if (t.type === 'character' && charIds.has(t.id)) target = { type: 'character', id: t.id };
      else if (t.type === 'section' && sectionIds.has(t.id)) target = { type: 'section', id: t.id };
      const createdAt = +n.createdAt || Date.now();
      return {
        id: n.id,
        text: String(n.text ?? ''),
        quote: String(n.quote ?? ''),
        elementId: typeof n.elementId === 'string' ? n.elementId : null,
        start: +n.start || 0,
        end: +n.end || 0,
        target,
        createdAt,
        updatedAt: +n.updatedAt || createdAt,
      };
    });
}

/** Where a note's highlight is in its element's current text, or null if the quote is gone. */
export function locateNote(note, text) {
  if (!note.quote) return null;
  if (text.slice(note.start, note.end) === note.quote) return { start: note.start, end: note.end };
  let best = -1;
  let bestDist = Infinity;
  for (let i = text.indexOf(note.quote); i !== -1; i = text.indexOf(note.quote, i + 1)) {
    const d = Math.abs(i - note.start);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best < 0 ? null : { start: best, end: best + note.quote.length };
}

/** The scene a note's highlight is in: { scene, element } or null. */
export function noteContext(note, elements, scenes = splitScenes(elements)) {
  const i = elements.findIndex((e) => e.id === note.elementId);
  if (i < 0) return null;
  return { element: elements[i], scene: scenes.find((s) => i >= s.start && i < s.end) || null };
}

export const sceneName = (scene) =>
  scene ? (scene.heading ? `Scene ${scene.n} · ${scene.heading.text.trim().toUpperCase() || 'UNTITLED SCENE'}` : 'Opening') : '';

export function targetColor(target, chars) {
  if (target.type === 'character') return chars.find((c) => c.id === target.id)?.color ?? UNFILED_COLOR;
  if (target.type === 'section') return SECTION_COLOR;
  return UNFILED_COLOR;
}

export function targetLabel(target, chars, sections) {
  if (target.type === 'character') return chars.find((c) => c.id === target.id)?.name ?? 'Unfiled';
  if (target.type === 'section') return sections.find((s) => s.id === target.id)?.name ?? 'Unfiled';
  return 'Unfiled';
}

/** Notes as Markdown: by character, by section, then unfiled. `only` limits it to a list of notes. */
export function notesMarkdown(projectName, project, { title = 'Notes', only } = {}) {
  const { chars, noteSections: sections, script } = project;
  const notes = only ?? project.notes;
  const scenes = splitScenes(script.elements);
  const out = [`# ${projectName} — ${title}`, '', `_Exported ${new Date().toLocaleString()} · ${notes.length} note${notes.length === 1 ? '' : 's'}_`, ''];

  const write = (list) => {
    for (const n of list) {
      const ctx = noteContext(n, script.elements, scenes);
      if (n.quote) out.push(...n.quote.split('\n').map((l) => `> ${l}`), '');
      out.push(n.text || '_(no comment)_', '');
      out.push(`_${[sceneName(ctx?.scene), new Date(n.createdAt).toLocaleString()].filter(Boolean).join(' — ')}_`, '');
    }
  };
  const group = (heading, list) => {
    if (!list.length) return;
    out.push(`## ${heading}`, '');
    write(list);
  };

  const byChar = chars.map((c) => [c, notes.filter((n) => n.target.type === 'character' && n.target.id === c.id)]);
  const bySection = sections.map((s) => [s, notes.filter((n) => n.target.type === 'section' && n.target.id === s.id)]);
  if (byChar.some(([, l]) => l.length)) {
    out.push('# Characters', '');
    byChar.forEach(([c, l]) => group(c.name, l));
  }
  if (bySection.some(([, l]) => l.length)) {
    out.push('# Sections', '');
    bySection.forEach(([s, l]) => group(s.name, l));
  }
  const unfiled = notes.filter((n) => n.target.type === 'none');
  if (unfiled.length) {
    out.push('# Unfiled notes', '');
    write(unfiled);
  }
  if (!notes.length) out.push('No notes yet.');
  return new Blob([out.join('\n')], { type: 'text/markdown;charset=utf-8' });
}
