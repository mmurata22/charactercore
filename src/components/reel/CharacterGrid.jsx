import { plural } from '../../lib/format';

export default function CharacterGrid({ chars, clips, onOpen }) {
  return (
    <section className="band" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <h2>Characters</h2>
        <div className="chars">
          {chars.map((c) => (
            <button key={c.id} className="cc" onClick={() => onOpen(c.id)}>
              <i className="sw" style={{ background: c.color }} />
              <div>
                <b>{c.name}</b>
                {c.about && <span>{c.about}</span>}
                <small>{plural(clips.filter((k) => k.char === c.id).length, 'clip')} · Edit</small>
              </div>
            </button>
          ))}
          <button className="cc new" onClick={() => onOpen(null)}>+ New character</button>
        </div>
      </div>
    </section>
  );
}
