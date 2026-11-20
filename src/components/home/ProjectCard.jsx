import { useState } from 'react';
import { timeAgo } from '../../lib/format';

export default function ProjectCard({ project: p, crashed, onOpen, onRename, onDuplicate, onDelete }) {
  const [mode, setMode] = useState(null); // 'rename' | 'delete'
  const [name, setName] = useState(p.name);

  return (
    <article className="pcard">
      {mode === 'rename' ? (
        <form
          className="pcard-body"
          onSubmit={(e) => {
            e.preventDefault();
            onRename(name);
            setMode(null);
          }}
        >
          <label className="f" htmlFor={`rn-${p.id}`}>Project name</label>
          <input id={`rn-${p.id}`} type="text" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="actions">
            <button className="pri" type="submit">Save name</button>
            <button type="button" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="pcard-body pcard-open" onClick={onOpen}>
          <b>{p.name}</b>
          <span>{p.summary}</span>
          <small>Edited {timeAgo(p.updatedAt)}</small>
          {crashed && <em>Didn’t close properly last time. Open it to recover.</em>}
        </button>
      )}

      {mode === 'delete' ? (
        <div className="pcard-foot pcard-confirm">
          <span>Delete “{p.name}” and its autosaves from this browser?</span>
          <button className="danger" onClick={onDelete}>Delete</button>
          <button onClick={() => setMode(null)}>Keep</button>
        </div>
      ) : (
        mode !== 'rename' && (
          <div className="pcard-foot">
            <button className="pri" onClick={onOpen}>Open</button>
            <button onClick={() => setMode('rename')}>Rename</button>
            <button onClick={onDuplicate}>Duplicate</button>
            <button className="danger" onClick={() => setMode('delete')}>Delete</button>
          </div>
        )
      )}
    </article>
  );
}
