import { fmt } from '../../lib/format';

export default function ClipForm({
  chars, charValue, onCharChange, caption, onCaptionChange, captionRef,
  markIn, markOut, editing, msg, onNewChar, onSave, onDelete, onCancel,
}) {
  const len = markIn != null && markOut != null ? (markOut - markIn).toFixed(1) + 's' : '–';
  return (
    <div className="panel">
      <h2>{editing ? 'Edit clip' : 'Cut a clip'}</h2>

      <label className="f" htmlFor="fChar">Character</label>
      <div className="selrow">
        <select id="fChar" value={charValue} onChange={(e) => onCharChange(e.target.value)}>
          {chars.length ? (
            chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
          ) : (
            <option value="">Create a character first</option>
          )}
        </select>
        <button onClick={onNewChar}>New character</button>
      </div>

      <label className="f" htmlFor="fCap">What this shows about them</label>
      <textarea
        id="fCap"
        ref={captionRef}
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Eats with a spoon, delicately. Never lets anyone see her hungry."
      />

      <div className="cut">
        <span>In <b>{fmt(markIn)}</b></span>
        <span>Out <b>{fmt(markOut)}</b></span>
        <span>Length <b>{len}</b></span>
      </div>
      <p className="msg" role="status">{msg}</p>

      <div className="actions">
        <button className="pri" onClick={onSave}>{editing ? 'Update clip' : 'Save clip'}</button>
        {editing && <button onClick={onDelete}>Delete</button>}
        {editing && <button onClick={onCancel}>New clip instead</button>}
      </div>
    </div>
  );
}
