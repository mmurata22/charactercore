import { useProject } from '../../state/ProjectContext.jsx';
import { useEscape } from '../../hooks/useEscape';
import { downloadFile } from '../../lib/download';
import { EXPORT_KINDS, characterBookMarkdown, exportName, scriptBlob } from '../../lib/exports';
import { slugify, plural } from '../../lib/format';
import { requestScriptPrint } from '../../lib/navigation';
import { notesMarkdown } from '../../lib/notes';

/** Export one part of the project on its own. Every export gets a unique file name. */
export default function ExportsModal({ onClose, onSaveProject, onExportReel }) {
  const { project, meta, notify } = useProject();
  const { chars, clips, script } = project;
  const scenes = script.elements.filter((e) => e.type === 'scene').length;
  const slug = slugify(meta.name);
  useEscape(onClose);

  const download = (blob, { kind, ext }) => {
    const name = exportName(meta.name, kind, ext);
    downloadFile(blob, name);
    notify(`Downloaded ${name}`);
  };

  const items = [
    {
      title: 'Whole project',
      desc: 'Everything in one file, footage optional. Open it from the home screen.',
      file: `${slug}_project_<date-time>.ccproj`,
      action: 'Save project file…',
      run: onSaveProject,
    },
    {
      title: 'Reel video',
      desc: `${plural(clips.length, 'clip')} played back as one video, with your notes as subtitles.`,
      file: `${slug}_reel_<clips>_<size>_<date-time>.webm or .mp4`,
      action: 'Export reel video…',
      disabled: !clips.length,
      run: onExportReel,
    },
    {
      title: 'Script (Fountain)',
      desc: `Cover page and ${plural(scenes, 'scene')} as a plain-text screenplay that Final Draft, Highland and Fade In can open.`,
      file: `${slug}_script_<date-time>.fountain`,
      action: 'Download script',
      run: () => download(scriptBlob(script), EXPORT_KINDS.script),
    },
    {
      title: 'Script (PDF / print)',
      desc: 'The cover page and every scene, formatted for print. Choose “Save as PDF” in the print dialog.',
      file: 'Named in your print dialog',
      action: 'Print script…',
      run: () => {
        onClose();
        requestScriptPrint();
      },
    },
    {
      title: 'Notes',
      desc: `${plural(project.notes.length, 'note')}, grouped by character, by section and unfiled, with the script text each comments on.`,
      file: `${slug}_notes_<date-time>.md`,
      action: 'Download notes',
      disabled: !project.notes.length,
      run: () => download(notesMarkdown(meta.name, project), { kind: 'notes', ext: 'md' }),
    },
    {
      title: 'Character book',
      desc: `${plural(chars.length, 'profile')} with their writing, reel notes and script appearances, as a Markdown document.`,
      file: `${slug}_character-book_<date-time>.md`,
      action: 'Download character book',
      disabled: !chars.length,
      run: () => download(characterBookMarkdown(meta.name, project), EXPORT_KINDS.book),
    },
  ];

  return (
    <div className="modal">
      <div className="sheet narrow">
        <div className="hd">
          <h2>Export</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <p className="lead">Export any part of “{meta.name}” on its own.</p>
        <ul className="exp-list">
          {items.map((it) => (
            <li key={it.title}>
              <div>
                <b>{it.title}</b>
                <span>{it.desc}</span>
                <code>{it.file}</code>
              </div>
              <button disabled={it.disabled} onClick={it.run}>{it.action}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
