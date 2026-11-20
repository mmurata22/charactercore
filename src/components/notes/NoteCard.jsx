import { useProject } from '../../state/ProjectContext.jsx';
import { locateNote, noteContext, sceneName, targetColor } from '../../lib/notes';
import { goToScriptElement } from '../../lib/navigation';
import { formatWhen } from '../../lib/format';

const encode = (t) => (t.type === 'none' ? 'none' : `${t.type}:${t.id}`);
const decode = (v) => (v === 'none' ? { type: 'none' } : { type: v.split(':')[0], id: v.split(':')[1] });

export default function NoteCard({ note: n, scenes, onEdit, onRefile, onDelete }) {
  const { project } = useProject();
  const { chars, noteSections, script } = project;
  const ctx = noteContext(n, script.elements, scenes);
  const range = ctx ? locateNote(n, ctx.element.text) : null;

  return (
    <li className="note-card" style={{ '--note': targetColor(n.target, chars) }}>
      {n.quote && (
        <blockquote className={range ? 'note-quote' : 'note-quote gone'}>
          {n.quote}
        </blockquote>
      )}
      <p className="note-text">{n.text || <em>No comment</em>}</p>
      <div className="note-meta">
        <span>
          {ctx ? sceneName(ctx.scene) : n.quote ? 'From the script (that line was removed)' : 'Written on the Notes page'}
          {n.quote && ctx && !range && ' · the highlighted text was changed'}
          {' · '}
          {formatWhen(n.updatedAt)}
        </span>
      </div>
      <div className="note-actions">
        <label>
          <span className="sr-only">File under</span>
          <select value={encode(n.target)} onChange={(e) => onRefile(decode(e.target.value))} aria-label="File under">
            <option value="none">Unfiled</option>
            {chars.length > 0 && (
              <optgroup label="Characters">
                {chars.map((c) => <option key={c.id} value={`character:${c.id}`}>{c.name}</option>)}
              </optgroup>
            )}
            {noteSections.length > 0 && (
              <optgroup label="Sections">
                {noteSections.map((s) => <option key={s.id} value={`section:${s.id}`}>{s.name}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        {ctx && <button onClick={() => goToScriptElement(n.elementId, range ?? undefined)}>Show in script</button>}
        <button onClick={onEdit}>Edit</button>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>
    </li>
  );
}
