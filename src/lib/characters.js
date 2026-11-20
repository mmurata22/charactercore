import { PALETTE } from './constants';
import { uid } from './format';

/** Extra profile fields kept in the character book. `short` fields render as one-line inputs. */
export const PROFILE_FIELDS = [
  { key: 'pronouns', label: 'Pronouns', short: true, placeholder: 'she/her' },
  { key: 'age', label: 'Age', short: true, placeholder: '34' },
  { key: 'role', label: 'Role in the story', short: true, placeholder: 'Protagonist' },
  { key: 'look', label: 'Appearance', placeholder: 'Burn scars on both forearms, always in kitchen whites.' },
  { key: 'personality', label: 'Personality', placeholder: 'Blunt, tireless, allergic to being helped.' },
  { key: 'voice', label: 'How they talk', placeholder: 'Short sentences. Never asks a question she can answer herself.' },
  { key: 'wants', label: 'What they want', placeholder: 'Her own restaurant before she turns forty.' },
  { key: 'flaw', label: 'Flaw or fear', placeholder: 'Being seen as needy.' },
  { key: 'backstory', label: 'Backstory', placeholder: 'Raised her brother after their mother left.' },
  { key: 'notes', label: 'Notes', placeholder: 'Anything else worth remembering.' },
];

/**
 * Besides the profile fields, each character has:
 *   writing   — free-form writing about them (the Writing tab)
 *   moodboard — images on their moodboard: [{ id, imageId, x, y, w, caption }]
 *               x, y and w are percentages of the board; the image itself is in the image store.
 */
export function normalizeCharacter(c) {
  const out = { id: c.id, name: String(c.name), color: c.color || PALETTE[0], about: c.about || '' };
  for (const f of PROFILE_FIELDS) out[f.key] = typeof c[f.key] === 'string' ? c[f.key] : '';
  out.writing = typeof c.writing === 'string' ? c.writing : '';
  const clamp = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  out.moodboard = (Array.isArray(c.moodboard) ? c.moodboard : [])
    .filter((m) => m && m.imageId)
    .map((m) => ({
      id: m.id || uid(),
      imageId: String(m.imageId),
      x: clamp(m.x, 0, 95, 5),
      y: clamp(m.y, 0, 95, 5),
      w: clamp(m.w, 6, 100, 28),
      caption: String(m.caption ?? ''),
    }));
  return out;
}

export const createCharacter = (fields, index) =>
  normalizeCharacter({ id: uid(), name: 'New character', color: PALETTE[index % PALETTE.length], ...fields });

/** "MRS. O'NEIL" → "Mrs. O'Neil" */
export const titleCase = (s) => s.toLowerCase().replace(/(^|[\s'.-])\p{L}/gu, (m) => m.toUpperCase());
