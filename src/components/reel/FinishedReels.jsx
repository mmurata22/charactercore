import { useEffect, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { useEscape } from '../../hooks/useEscape';
import { downloadFile } from '../../lib/download';
import { formatWhen, plural } from '../../lib/format';

const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
const len = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Every reel exported from this project, kept so it can be watched, downloaded or renamed later. */
export default function FinishedReels({ onExport, canExport }) {
  const { reels } = useProject();
  const [playing, setPlaying] = useState(null);

  return (
    <section className="band" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="rhead">
          <h2>Finished reels</h2>
          <button disabled={!canExport} onClick={onExport}>Export a new reel</button>
        </div>
        {reels.error && <p className="msg">{reels.error}</p>}
        {reels.list.length ? (
          <ul className="fin-list">
            {reels.list.map((r) => (
              <FinishedReel key={r.id} reel={r} onPlay={() => setPlaying(r)} />
            ))}
          </ul>
        ) : (
          <p className="strip-hint">
            Reels you export are kept here, so you can watch, rename or download them again later.
          </p>
        )}
      </div>
      {playing && <ReelPlayer reel={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

function FinishedReel({ reel: r, onPlay }) {
  const { reels, notify } = useProject();
  const [mode, setMode] = useState(null); // 'rename' | 'delete'
  const [name, setName] = useState(r.name);

  async function download() {
    const full = await reels.get(r.id);
    if (!full) return;
    downloadFile(full.blob, r.fileName);
    notify(`Downloaded ${r.fileName}`);
  }

  return (
    <li className="fin">
      <button className="fin-poster" onClick={onPlay} aria-label={`Play ${r.name}`}>
        {r.poster ? <img src={r.poster} alt="" /> : <span>▶</span>}
        <i>{len(r.duration || 0)}</i>
      </button>
      <div className="fin-body">
        {mode === 'rename' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reels.rename(r.id, name);
              setMode(null);
            }}
          >
            <input type="text" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-label="Reel name" />
          </form>
        ) : (
          <b>{r.name}</b>
        )}
        <small>
          {[r.scope, plural(r.clipCount || 0, 'clip'), `${r.height}p ${String(r.ext).toUpperCase()}`, mb(r.size)].join(' · ')}
        </small>
        <small>{formatWhen(r.createdAt)}</small>
        {mode === 'delete' ? (
          <div className="fin-actions">
            <span>Delete this reel?</span>
            <button className="danger" onClick={() => reels.remove(r.id)}>Delete</button>
            <button onClick={() => setMode(null)}>Keep</button>
          </div>
        ) : (
          <div className="fin-actions">
            <button className="pri" onClick={onPlay}>Play</button>
            <button onClick={download}>Download</button>
            {mode === 'rename' ? (
              <button onClick={() => { reels.rename(r.id, name); setMode(null); }}>Save name</button>
            ) : (
              <button onClick={() => setMode('rename')}>Rename</button>
            )}
            <button className="danger" onClick={() => setMode('delete')}>Delete</button>
          </div>
        )}
      </div>
    </li>
  );
}

function ReelPlayer({ reel, onClose }) {
  const { reels } = useProject();
  const [url, setUrl] = useState(null);
  useEscape(onClose);

  useEffect(() => {
    let u = null;
    let live = true;
    reels.get(reel.id).then((full) => {
      if (!live || !full) return;
      u = URL.createObjectURL(full.blob);
      setUrl(u);
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [reel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal">
      <div className="sheet">
        <div className="hd">
          <h2>{reel.name}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="mon">{url && <video src={url} controls autoPlay playsInline />}</div>
      </div>
    </div>
  );
}
