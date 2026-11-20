import { useEffect, useRef, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { useEscape } from '../../hooks/useEscape';

const NEW_SECTION = 'new-section';
const encode = (t) => (t.type === 'none' ? 'none' : `${t.type}:${t.id}`);
const decode = (v) => {
  if (v === 'none') return { type: 'none' };
  const [type, id] = v.split(':');
  return { type, id };
};

/** Write or edit a note and choose what it's filed under: a character, a section, or nothing. */
export default function NoteDialog({ title, quote, initialText = '', initialTarget = { type: 'none' }, onSave, onDelete, onClose }) {
  const { project, addNoteSection } = useProject();
  const { chars, noteSections } = project;
  const [text, setText] = useState(initialText);
  const [target, setTarget] = useState(encode(initialTarget));
  const [sectionName, setSectionName] = useState('');
  const [msg, setMsg] = useState('');
  const textRef = useRef(null);
  useEscape(onClose);
  useEffect(() => textRef.current?.focus(), []);

  function save(e) {
    e.preventDefault();
    if (!text.trim() && !quote) return setMsg('Write a note.');
    let t = decode(target === NEW_SECTION ? 'none' : target);
    if (target === NEW_SECTION) {
      if (!sectionName.trim()) return setMsg('Name the new section.');
      t = { type: 'section', id: addNoteSection(sectionName).id };
    }
    onSave({ text: text.trim(), target: t });
  }

  return (
    <div className="modal">
      <form className="sheet narrow" onSubmit={save}>
        <div className="hd">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {quote && <blockquote className="note-quote">{quote}</blockquote>}
        <label className="f" htmlFor="noteText">Comment</label>
        <textarea id="noteText" ref={textRef} value={text} placeholder="What’s on your mind about this?"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && save(e)} />

        <label className="f" htmlFor="noteTarget">File under</label>
        <select id="noteTarget" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="none">Nothing (unfiled)</option>
          {chars.length > 0 && (
            <optgroup label="Characters">
              {chars.map((c) => <option key={c.id} value={`character:${c.id}`}>{c.name}</option>)}
            </optgroup>
          )}
          <optgroup label="Sections">
            {noteSections.map((s) => <option key={s.id} value={`section:${s.id}`}>{s.name}</option>)}
            <option value={NEW_SECTION}>+ New section…</option>
          </optgroup>
        </select>
        {target === NEW_SECTION && (
          <input type="text" className="note-newsec" maxLength={60} autoFocus placeholder="Section name, e.g. Act 1, Continuity, Themes"
            value={sectionName} onChange={(e) => setSectionName(e.target.value)} aria-label="New section name" />
        )}

        <p className="msg">{msg}</p>
        <div className="actions">
          <button className="pri" type="submit">Save note</button>
          {onDelete && <button type="button" className="danger" onClick={onDelete}>Delete note</button>}
        </div>
      </form>
    </div>
  );
}
