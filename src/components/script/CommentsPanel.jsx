import { targetColor, targetLabel } from '../../lib/notes';

/** Comments on the scene that's open. */
export default function CommentsPanel({ items, total, chars, sections, activeId, onGo, onEdit }) {
  return (
    <div className="panel">
      <h2>Comments</h2>
      {items.length ? (
        <ul className="side-list comment-list">
          {items.map(({ note, located }) => (
            <li key={note.id} className={activeId === note.id ? 'on' : ''}>
              <button onClick={() => onGo(note)} title={located ? 'Show in the script' : 'The highlighted text was changed or removed'}>
                <i style={{ background: targetColor(note.target, chars) }} />
                <span>
                  <q className={located ? '' : 'gone'}>{note.quote}</q>
                  <span className="comment-text">{note.text || 'No comment'}</span>
                  <small>{targetLabel(note.target, chars, sections)}</small>
                </span>
              </button>
              <button className="comment-edit" onClick={() => onEdit(note)} aria-label="Edit comment">✎</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="side-empty">Select text in this scene and choose Comment to add one.</p>
      )}
      <a className="side-link" href="#notes">All notes{total ? ` (${total})` : ''} →</a>
    </div>
  );
}
