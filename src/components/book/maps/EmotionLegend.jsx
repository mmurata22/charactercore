import { useState } from 'react';
import ColorPicker from '../../common/ColorPicker.jsx';

/** The feelings map's colour code: each feeling and its colour. Renaming updates every arrow. */
export default function EmotionLegend({ map, onRecolor, onRename, onRemove, onAdd }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#14b8a6');
  const used = (label) => map.links.some((l) => l.label.toLowerCase() === label.toLowerCase());

  return (
    <div className="panel legend">
      <h3>Colour code</h3>
      <ul>
        {map.emotions.map((em) => (
          <li key={em.label}>
            <ColorPicker compact value={em.color} onChange={(c) => onRecolor(em.label, c)} label={`Colour for ${em.label}`} />
            <input type="text" defaultValue={em.label} maxLength={40} aria-label="Feeling name"
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== em.label && onRename(em.label, e.target.value.trim())} />
            <button className="link-del" disabled={used(em.label)} title={used(em.label) ? 'In use on the map' : 'Remove'}
              aria-label={`Remove ${em.label}`} onClick={() => onRemove(em.label)}>×</button>
          </li>
        ))}
      </ul>
      <form
        className="emo-new"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || map.emotions.some((x) => x.label.toLowerCase() === name.trim().toLowerCase())) return;
          onAdd({ label: name.trim(), color });
          setName('');
        }}
      >
        <ColorPicker compact value={color} onChange={setColor} label="Colour for the new feeling" />
        <input type="text" maxLength={40} placeholder="Add a feeling" aria-label="New feeling" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
