import { plural } from '../../lib/format';

/** Who speaks in the script; speakers missing from the book can be added in one click. */
export default function CastPanel({ cast, byCue, onAdd }) {
  const list = [...cast.values()].sort((a, b) => b.lines - a.lines);
  return (
    <div className="panel">
      <h2>Cast</h2>
      {list.length ? (
        <ul className="side-list cast-list">
          {list.map((c) => {
            const known = byCue.get(c.name);
            return (
              <li key={c.name}>
                <span className="cast-row">
                  <i style={{ background: known?.color ?? 'transparent', borderColor: known ? 'transparent' : 'var(--line)' }} />
                  <span>
                    <b>{known?.name ?? c.name}</b>
                    <small>{plural(c.lines, 'line')} · {plural(c.scenes.length, 'scene')}</small>
                  </span>
                </span>
                {!known && (
                  <button className="cast-add" onClick={() => onAdd(c.name)}>Add to book</button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="side-empty">Characters appear here once they speak. Names from your character book autocomplete.</p>
      )}
    </div>
  );
}
