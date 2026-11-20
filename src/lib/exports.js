import { fileStamp, plural, slugify } from './format';
import { PROFILE_FIELDS } from './characters';
import { analyzeScript, toFountain } from './script';

/**
 * Every export gets a distinct, unique file name:
 *   <project>_<kind>_<YYYY-MM-DD_HH-MM-SS>.<ext>
 * e.g. night-shift_script_2026-11-19_14-32-07.fountain
 */
export const exportName = (projectName, kind, ext) => `${slugify(projectName)}_${kind}_${fileStamp()}.${ext}`;

export const EXPORT_KINDS = {
  project: { kind: 'project', ext: 'ccproj' },
  script: { kind: 'script', ext: 'fountain' },
  book: { kind: 'character-book', ext: 'md' },
};

export const scriptBlob = (script) => new Blob([toFountain(script)], { type: 'text/plain;charset=utf-8' });

const fmtTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/** The character book as a Markdown document: profiles, reel notes and script appearances. */
export function characterBookMarkdown(projectName, { chars, clips, script }) {
  const { cast } = analyzeScript(script.elements);
  const out = [`# ${projectName} — Character book`, '', `_Exported ${new Date().toLocaleString()}_`, ''];
  if (!chars.length) out.push('No characters yet.', '');

  for (const c of chars) {
    out.push(`## ${c.name}`, '');
    if (c.about) out.push(`*${c.about}*`, '');
    const short = PROFILE_FIELDS.filter((f) => f.short && c[f.key]);
    if (short.length) out.push(...short.map((f) => `- **${f.label}:** ${c[f.key]}`), '');
    for (const f of PROFILE_FIELDS.filter((x) => !x.short && c[x.key])) out.push(`### ${f.label}`, '', c[f.key], '');
    if (c.writing?.trim()) out.push('### Writing', '', c.writing.trim(), '');
    if (c.moodboard?.length) out.push(`_Moodboard: ${plural(c.moodboard.length, 'image')} (in the project file)._`, '');

    const theirs = clips.filter((k) => k.char === c.id);
    out.push(`### In the reel (${plural(theirs.length, 'clip')})`, '');
    if (theirs.length) out.push(...theirs.map((k) => `- ${k.cap} — _${k.src}, ${fmtTime(k.in)}–${fmtTime(k.out)}_`), '');
    else out.push('No clips yet.', '');

    const entry = cast.get(c.name.trim().toUpperCase());
    out.push('### In the script', '');
    if (entry) {
      out.push(`${plural(entry.lines, 'line')} of dialogue across ${plural(entry.scenes.length, 'scene')}.`, '');
      out.push(...entry.scenes.map((s) => `- Scene ${s.n}: ${s.text.trim().toUpperCase() || 'UNTITLED SCENE'}`), '');
    } else out.push('Doesn’t speak yet.', '');
  }
  return new Blob([out.join('\n')], { type: 'text/markdown;charset=utf-8' });
}
