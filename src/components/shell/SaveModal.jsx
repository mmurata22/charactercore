import { useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { useEscape } from '../../hooks/useEscape';
import { plural, timeAgo } from '../../lib/format';
import { PROJECT_EXT } from '../../lib/projectFile';

const mb = (bytes) => (bytes / 1048576).toFixed(bytes > 1048576 * 10 ? 0 : 1) + ' MB';

/** Save everything in the project to one .ccproj file. */
export default function SaveModal({ onClose }) {
  const { project, meta, media, reels, saveToFile, savedFile, hasFileHandle, autosave } = useProject();
  const reelsSize = reels.list.reduce((s, r) => s + (r.size || 0), 0);
  const [includeReels, setIncludeReels] = useState(meta.includeReels && reels.list.length > 0);
  const footage = [...media.files.values()];
  const footageSize = footage.reduce((s, f) => s + f.size, 0);
  const needed = [...new Set(project.clips.map((k) => k.src))].filter((n) => !media.files.has(n));
  const [include, setInclude] = useState(meta.includeFootage && footage.length > 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const canPickFile = !!window.showSaveFilePicker;
  useEscape(() => !busy && onClose());

  async function save(saveAs) {
    setBusy(true);
    setMsg('');
    const r = await saveToFile({ includeFootage: include, includeReels, saveAs });
    setBusy(false);
    if (r.error) setMsg(r.error);
    else if (r.ok) onClose();
  }

  return (
    <div className="modal">
      <div className="sheet narrow">
        <div className="hd">
          <h2>Save project</h2>
          <button onClick={onClose} disabled={busy}>Close</button>
        </div>
        <p className="lead">
          Saves all of “{meta.name}” into a single .{PROJECT_EXT} file: {autosave.list[0]?.summary ?? 'characters, clips and scenes'},
          the script’s cover page, every character profile and map, and all reel notes. Open it again from the home screen,
          on any computer.
        </p>

        <label className="chk">
          <input type="checkbox" checked={include} disabled={!footage.length} onChange={(e) => setInclude(e.target.checked)} />
          {footage.length
            ? `Include the video footage (${plural(footage.length, 'file')}, ${mb(footageSize)})`
            : 'Include the video footage (none loaded right now)'}
        </label>
        <label className="chk">
          <input type="checkbox" checked={includeReels} disabled={!reels.list.length} onChange={(e) => setIncludeReels(e.target.checked)} />
          {reels.list.length
            ? `Include finished reels (${plural(reels.list.length, 'reel')}, ${mb(reelsSize)})`
            : 'Include finished reels (none yet)'}
        </label>
        {needed.length > 0 && (
          <p className="lead">
            Not loaded, so not included: {needed.join(', ')}. Add those files on the Character reel page first if you
            want them in the file.
          </p>
        )}
        <p className="lead">
          {canPickFile
            ? hasFileHandle
              ? `Saving overwrites ${savedFile?.name ?? 'the same file'}. Ctrl+S saves straight to it.`
              : 'You’ll choose where to save. After that, Save and Ctrl+S update that same file.'
            : 'This browser downloads the file. Each save gets its own unique name.'}
          {savedFile && ` Last saved ${timeAgo(savedFile.at)}.`}
        </p>

        <p className="msg">{busy ? 'Saving…' : msg}</p>
        <div className="actions">
          <button className="pri" disabled={busy} onClick={() => save(false)}>
            {hasFileHandle ? `Save to ${savedFile?.name ?? 'file'}` : 'Save project file'}
          </button>
          {hasFileHandle && <button disabled={busy} onClick={() => save(true)}>Save as a new file…</button>}
        </div>
      </div>
    </div>
  );
}
