import { STORAGE_KEY, LEGACY_STORAGE_KEY } from './constants';
import { plural, uid } from './format';
import { normalizeCharacter } from './characters';
import { blankScript, isEmptyScript, normalizeScript } from './script';
import { normalizeMaps } from './maps';
import { normalizeNotes, normalizeSections } from './notes';

/**
 * A project's data is everything the user makes in it:
 *   chars  — characters (shared by the reel, script and character book)
 *   clips  — reel clips, each filed under a character
 *   script — the screenplay { title, author, cover, elements[] }
 *   maps   — character maps (relationships / feelings) from the character book
 *   notes, noteSections — comments on script text, filed under a character, an author-made section, or nothing
 */
export const blankProject = () => ({ chars: [], clips: [], script: blankScript(), maps: [], notes: [], noteSections: [] });

/** Validate and clean an untrusted project object. Returns null if it isn't one. */
export function normalizeProject(d) {
  if (!d || !Array.isArray(d.chars) || !Array.isArray(d.clips)) return null;
  const chars = d.chars.filter((c) => c && c.id && c.name).map(normalizeCharacter);
  const ids = new Set(chars.map((c) => c.id));
  const noteSections = normalizeSections(d.noteSections);
  return {
    chars,
    clips: d.clips
      .filter((k) => k && ids.has(k.char))
      .map((k) => ({ id: k.id || uid(), char: k.char, src: k.src, in: +k.in, out: +k.out, cap: k.cap || '', thumb: k.thumb || null })),
    script: normalizeScript(d.script),
    maps: normalizeMaps(d.maps, ids),
    noteSections,
    notes: normalizeNotes(d.notes, ids, new Set(noteSections.map((s) => s.id))),
  };
}

export const isEmptyProject = (p) =>
  !p.chars.length && !p.clips.length && !p.maps.length && !p.notes.length && isEmptyScript(p.script);

export function summarizeProject(p) {
  const scenes = p.script.elements.filter((e) => e.type === 'scene' && e.text.trim()).length;
  return [plural(p.chars.length, 'character'), plural(p.clips.length, 'clip'), plural(scenes, 'scene')].join(' · ');
}

/**
 * Older versions shipped a premade sample project and saved it to localStorage.
 * These identify its characters and clips so they can be removed from saved data.
 */
const SAMPLE_CHARS = { c1: 'Mara', c2: 'Tobin', c3: 'Ines' };
const SAMPLE_CLIPS = {
  k1: 'dinner-scenes.mp4', k2: 'dinner-scenes.mp4', k3: 'dinner-scenes.mp4',
  k4: 'arguments.mov', k5: 'arguments.mov',
  k6: 'interrogation.mp4', k7: 'interrogation.mp4',
};

function stripSample(p) {
  const chars = p.chars.filter((c) => SAMPLE_CHARS[c.id] !== c.name);
  const ids = new Set(chars.map((c) => c.id));
  const clips = p.clips.filter((k) => SAMPLE_CLIPS[k.id] !== k.src && ids.has(k.char));
  return { ...p, chars, clips };
}

/** Read a stored project with any leftover sample content removed. */
function readStored(key) {
  const d = normalizeProject(JSON.parse(localStorage.getItem(key)));
  return d && stripSample(d);
}

/** The single project older versions kept in localStorage (before projects existed), or null. */
export function readLegacyProject() {
  try {
    return readStored(STORAGE_KEY) || readStored(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}
