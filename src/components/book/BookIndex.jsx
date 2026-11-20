import { plural } from '../../lib/format';
import { titleCase } from '../../lib/characters';

export default function BookIndex({ chars, clips, cast, selectedId, onSelect, unlisted, onAddUnlisted }) {
  return (
    <nav className="book-index" aria-label="Characters">
      {chars.map((c) => {
        const lines = cast.get(c.name.trim().toUpperCase())?.lines ?? 0;
        const n = clips.filter((k) => k.char === c.id).length;
        return (
          <button key={c.id} className="bi" aria-current={c.id === selectedId} onClick={() => onSelect(c.id)}>
            <i style={{ background: c.color }} />
            <span>
              <b>{c.name}</b>
              <small>{[c.role, plural(n, 'clip'), plural(lines, 'line')].filter(Boolean).join(' · ')}</small>
            </span>
          </button>
        );
      })}

      {unlisted.length > 0 && (
        <div className="unlisted">
          <p>Speaking in the script but not in the book:</p>
          {unlisted.map((c) => (
            <button key={c.name} onClick={() => onAddUnlisted(c.name)}>+ {titleCase(c.name)}</button>
          ))}
        </div>
      )}
    </nav>
  );
}
