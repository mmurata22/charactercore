import { linkColor } from '../../../lib/maps';

/** Every connection on the map, editable. */
export default function LinkList({ map, charOf, selectedLink, onSelect, onChange, onDelete }) {
  const feelings = map.kind === 'feelings';
  if (!map.links.length) return null;
  return (
    <div className="panel">
      <h3>{feelings ? 'Feelings' : 'Relationships'} ({map.links.length})</h3>
      <ul className="link-list">
        {map.links.map((l) => (
          <li key={l.id} className={selectedLink === l.id ? 'sel' : ''} onClick={() => onSelect(l.id)}>
            <span className="link-who">{charOf(l.from).name}</span>
            {feelings ? (
              <span className="link-emo">
                <i style={{ background: linkColor(map, l) }} />
                <select value={l.label} aria-label="Feeling" onChange={(e) => onChange(l.id, { label: e.target.value })}>
                  {map.emotions.map((em) => <option key={em.label} value={em.label}>{em.label}</option>)}
                  {!map.emotions.some((em) => em.label === l.label) && <option value={l.label}>{l.label}</option>}
                </select>
                →
              </span>
            ) : (
              <input type="text" className="link-rel" value={l.label} maxLength={40} aria-label="Relationship"
                onChange={(e) => onChange(l.id, { label: e.target.value })} />
            )}
            <span className="link-who">{charOf(l.to).name}</span>
            <button className="link-del" aria-label="Remove connection" onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
