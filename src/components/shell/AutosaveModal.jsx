import { useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { useEscape } from '../../hooks/useEscape';
import { formatWhen, timeAgo } from '../../lib/format';
import { AUTOSAVE_INTERVAL_MS, AUTOSAVE_KEEP } from '../../lib/constants';

export default function AutosaveModal({ onClose }) {
  const { autosave } = useProject();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEscape(onClose);

  async function restore(id) {
    setBusy(true);
    const ok = await autosave.restore(id);
    setBusy(false);
    if (ok) onClose();
    else setMsg('That autosave couldn’t be read.');
  }

  async function saveNow() {
    setBusy(true);
    await autosave.saveNow('Saved manually');
    setBusy(false);
    setMsg('Saved a copy.');
  }

  return (
    <div className="modal">
      <div className="sheet narrow">
        <div className="hd">
          <h2>Autosaves</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <p className="lead">
          Every {AUTOSAVE_INTERVAL_MS / 1000} seconds while you work, and whenever you switch away from this tab, a copy
          of the whole project (characters, reel clips, script) is kept in this browser. The latest {AUTOSAVE_KEEP} are
          kept. Restoring first saves your current work, so you can always come back.
        </p>
        {autosave.error && <p className="msg">{autosave.error}</p>}

        {autosave.list.length ? (
          <ul className="as-list">
            {autosave.list.map((a, i) => (
              <li key={a.id}>
                <div>
                  <b>{formatWhen(a.at)}</b> <small>{i === 0 ? 'latest · ' : ''}{timeAgo(a.at)}</small>
                  <span>{a.summary}</span>
                  <small>{a.reason} · {Math.max(1, Math.round(a.size / 1024))} KB</small>
                </div>
                <button disabled={busy} onClick={() => restore(a.id)}>Restore</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lead">No autosaves yet. One is made as soon as there’s something to save.</p>
        )}

        <p className="msg">{msg}</p>
        <div className="actions">
          <button className="pri" disabled={busy} onClick={saveNow}>Save a copy now</button>
        </div>
      </div>
    </div>
  );
}
