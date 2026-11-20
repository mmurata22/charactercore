import { useState } from 'react';
import { RELATIONSHIP_SUGGESTIONS } from '../../../lib/maps';
import ColorPicker from '../../common/ColorPicker.jsx';

const NEW = '__new__';

/**
 * Connect two characters. Relationships: a hand-typed label on a line.
 * Feelings: a one-way arrow with an emotion from the map's colour-coded list (or a new one).
 */
export default function LinkForm({ map, charOf, from, to, onFrom, onTo, onAdd, onAddEmotion }) {
  const feelings = map.kind === 'feelings';
  const [label, setLabel] = useState('');
  const [emotion, setEmotion] = useState(map.emotions[0]?.label ?? NEW);
  const [newEmotion, setNewEmotion] = useState('');
  const [newColor, setNewColor] = useState('#0e7c86');
  const [msg, setMsg] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!from || !to) return setMsg('Pick two characters (or click them on the map).');
    if (from === to) return setMsg('Pick two different characters.');
    let text = label.trim();
    if (feelings) {
      if (emotion === NEW) {
        text = newEmotion.trim();
        if (!text) return setMsg('Name the feeling.');
        onAddEmotion({ label: text, color: newColor });
        setEmotion(text);
        setNewEmotion('');
      } else text = emotion;
    }
    if (!text) return setMsg('Type how they’re related, like “sister” or “neighbor”.');
    const dup = map.links.some(
      (l) => l.label.toLowerCase() === text.toLowerCase() &&
        (l.from === from && l.to === to || (!feelings && l.from === to && l.to === from)),
    );
    if (dup) return setMsg('That connection is already on the map.');
    onAdd({ from, to, label: text });
    setLabel('');
    setMsg('');
  }

  const options = map.nodes.map((n) => charOf(n.charId));
  const pick = (value, onChange, id, aria) => (
    <select id={id} aria-label={aria} value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Choose…</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );

  return (
    <form className="panel link-form" onSubmit={submit}>
      <h3>{feelings ? 'Add a feeling' : 'Add a relationship'}</h3>
      <p className="map-hint">
        {feelings ? 'Arrows point one way: from who feels it, to who it’s about.' : 'Click two characters on the map, or choose them here.'}
      </p>
      <div className="link-pair">
        {pick(from, onFrom, 'lf-from', feelings ? 'Who feels it' : 'First character')}
        <span aria-hidden="true">{feelings ? '→' : '—'}</span>
        {pick(to, onTo, 'lf-to', feelings ? 'About whom' : 'Second character')}
        <button type="button" className="link-swap" aria-label="Swap" onClick={() => { onFrom(to); onTo(from); }}>⇄</button>
      </div>

      {feelings ? (
        <>
          <label className="f" htmlFor="lf-emotion">Feeling</label>
          <div className="emo-pick" id="lf-emotion" role="radiogroup" aria-label="Feeling">
            {map.emotions.map((em) => (
              <label key={em.label} className={emotion === em.label ? 'on' : ''}>
                <input type="radio" name={`emo-${map.id}`} checked={emotion === em.label} onChange={() => setEmotion(em.label)} />
                <i style={{ background: em.color }} />
                {em.label}
              </label>
            ))}
            <label className={emotion === NEW ? 'on' : ''}>
              <input type="radio" name={`emo-${map.id}`} checked={emotion === NEW} onChange={() => setEmotion(NEW)} />
              + New feeling
            </label>
          </div>
          {emotion === NEW && (
            <div className="emo-new">
              <input type="text" maxLength={40} placeholder="e.g. resents, admires, pities" aria-label="New feeling"
                value={newEmotion} onChange={(e) => setNewEmotion(e.target.value)} />
              <ColorPicker compact value={newColor} onChange={setNewColor} label="Colour for this feeling" />
            </div>
          )}
        </>
      ) : (
        <>
          <label className="f" htmlFor="lf-label">Relationship</label>
          <input id="lf-label" type="text" maxLength={40} list={`rel-${map.id}`} placeholder="brother, sister, neighbor…"
            value={label} onChange={(e) => setLabel(e.target.value)} />
          <datalist id={`rel-${map.id}`}>
            {RELATIONSHIP_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </>
      )}

      <p className="msg">{msg}</p>
      <button className="pri" type="submit">{feelings ? 'Add arrow' : 'Add line'}</button>
    </form>
  );
}
