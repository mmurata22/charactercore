import { useEffect, useRef, useState } from 'react';
import ColorPicker from '../common/ColorPicker.jsx';
import { PROFILE_FIELDS } from '../../lib/characters';
import { plural } from '../../lib/format';
import Appearances from './Appearances.jsx';
import CharacterWriting from './CharacterWriting.jsx';
import Moodboard from './Moodboard.jsx';

const TAB_KEY = 'charcore.charTab';
const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'writing', label: 'Writing' },
  { key: 'moodboard', label: 'Moodboard' },
];

/** One character: name and colour, then Profile / Writing / Moodboard. Every change is saved straight away. */
export default function CharacterProfile({ character: c, clips, castEntry, autoFocusName, onChange, onRename, onDelete }) {
  const nameRef = useRef(null);
  const nameAtFocus = useRef(c.name);
  const [note, setNote] = useState('');
  const [tab, setTabState] = useState(() => {
    try {
      return localStorage.getItem(TAB_KEY) || 'profile';
    } catch {
      return 'profile';
    }
  });
  const setTab = (t) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (autoFocusName) {
      setTabState('profile');
      nameRef.current?.select();
    }
  }, [autoFocusName]);

  function finishName() {
    let name = c.name.trim();
    if (!name) {
      name = 'Unnamed character';
      onChange({ name });
    }
    const before = nameAtFocus.current.trim();
    if (before && before !== name) {
      const n = onRename(before, name);
      setNote(n ? `Renamed ${plural(n, 'cue')} in the script to ${name.toUpperCase()}.` : '');
    }
  }

  const short = PROFILE_FIELDS.filter((f) => f.short);
  const long = PROFILE_FIELDS.filter((f) => !f.short);
  const counts = {
    writing: c.writing.trim() ? `${plural(c.writing.trim().split(/\s+/).length, 'word')}` : '',
    moodboard: c.moodboard.length ? String(c.moodboard.length) : '',
  };

  return (
    <article className="profile">
      <div className="panel profile-top">
        <div className="profile-head">
          <span className="big-sw" style={{ background: c.color }} />
          <div className="profile-names">
            <input
              ref={nameRef}
              type="text"
              className="profile-name"
              aria-label="Name"
              maxLength={60}
              value={c.name}
              onFocus={() => (nameAtFocus.current = c.name)}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={finishName}
            />
            <input
              type="text"
              className="profile-about"
              aria-label="Who they are, in a line"
              placeholder="Who they are, in a line"
              maxLength={160}
              value={c.about}
              onChange={(e) => onChange({ about: e.target.value })}
            />
          </div>
        </div>
        {note && <p className="msg">{note}</p>}
        <div className="tabs" role="tablist" aria-label={`${c.name}`}>
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label} {counts[t.key] && <small>{counts[t.key]}</small>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'writing' && <CharacterWriting character={c} onChange={onChange} />}
      {tab === 'moodboard' && <Moodboard character={c} onChange={onChange} />}
      {tab === 'profile' && (
        <>
          <div className="panel">
            <span className="f">Colour (used for them in the reel, script and maps)</span>
            <ColorPicker value={c.color} onChange={(color) => onChange({ color })} label="Character colour" />

            <div className="pf-short">
              {short.map((f) => (
                <div key={f.key}>
                  <label className="f" htmlFor={`pf-${f.key}`}>{f.label}</label>
                  <input id={`pf-${f.key}`} type="text" value={c[f.key]} placeholder={f.placeholder}
                    onChange={(e) => onChange({ [f.key]: e.target.value })} />
                </div>
              ))}
            </div>

            <div className="pf-long">
              {long.map((f) => (
                <div key={f.key}>
                  <label className="f" htmlFor={`pf-${f.key}`}>{f.label}</label>
                  <textarea id={`pf-${f.key}`} value={c[f.key]} placeholder={f.placeholder}
                    onChange={(e) => onChange({ [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <Appearances character={c} clips={clips} castEntry={castEntry} />

          <div className="profile-foot">
            <button className="danger" onClick={onDelete}>Delete {c.name}</button>
            <small>Also removes their reel clips and places on maps. You can undo straight after.</small>
          </div>
        </>
      )}
    </article>
  );
}
