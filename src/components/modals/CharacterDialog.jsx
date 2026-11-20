import { useEffect, useRef, useState } from 'react';
import { useEscape } from '../../hooks/useEscape';
import ColorPicker from '../common/ColorPicker.jsx';

export default function CharacterDialog({ character, defaultColor, onSave, onDelete, onClose }) {
  const [name, setName] = useState(character?.name ?? '');
  const [about, setAbout] = useState(character?.about ?? '');
  const [color, setColor] = useState(character?.color ?? defaultColor);
  const [error, setError] = useState('');
  const nameRef = useRef(null);
  useEscape(onClose);
  useEffect(() => nameRef.current?.focus(), []);

  const submit = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError('Give them a name.');
      return;
    }
    onSave({ name: n, about: about.trim(), color });
  };

  return (
    <div className="modal">
      <form className="sheet narrow" onSubmit={submit}>
        <div className="hd">
          <h2>{character ? 'Edit character' : 'New character'}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <label className="f" htmlFor="chName">Name</label>
        <input ref={nameRef} type="text" id="chName" maxLength={60} autoComplete="off" placeholder="Mara"
          value={name} onChange={(e) => setName(e.target.value)} />
        <label className="f" htmlFor="chAbout">Who they are, in a line</label>
        <input type="text" id="chAbout" maxLength={160} autoComplete="off" placeholder="Line cook who never sits down"
          value={about} onChange={(e) => setAbout(e.target.value)} />
        <span className="f" style={{ margin: '14px 0 8px' }}>Colour</span>
        <ColorPicker value={color} onChange={setColor} label="Character colour" />
        <p className="msg">{error}</p>
        <div className="actions">
          <button className="pri" type="submit">{character ? 'Save changes' : 'Create character'}</button>
          {character && <button type="button" onClick={onDelete}>Delete character</button>}
        </div>
      </form>
    </div>
  );
}
