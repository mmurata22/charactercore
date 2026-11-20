import { useState } from 'react';
import { useProject } from '../../../state/ProjectContext.jsx';
import { MAP_KINDS, newMap } from '../../../lib/maps';
import { plural } from '../../../lib/format';
import MapEditor from './MapEditor.jsx';

const MAP_KEY = 'charcore.map';

/** Character maps: any number of relationship maps and feelings maps. */
export default function MapsView({ chars, charOf }) {
  const { project, setMaps, snapshot } = useProject();
  const maps = project.maps;
  const [selId, setSelId] = useState(() => {
    try {
      return localStorage.getItem(MAP_KEY);
    } catch {
      return null;
    }
  });
  const selected = maps.find((m) => m.id === selId) || maps[0] || null;

  function select(id) {
    setSelId(id);
    try {
      localStorage.setItem(MAP_KEY, id);
    } catch {
      /* ignore */
    }
  }

  function create(kind) {
    const count = maps.filter((m) => m.kind === kind).length;
    const m = newMap(kind, count ? `${MAP_KINDS[kind].label} ${count + 1}` : MAP_KINDS[kind].label);
    setMaps((list) => [...list, m]);
    select(m.id);
  }

  function remove(id) {
    const m = maps.find((x) => x.id === id);
    snapshot(`${m?.name ?? 'Map'} deleted`);
    setMaps((list) => list.filter((x) => x.id !== id));
  }

  return (
    <div className="maps">
      <nav className="maps-index" aria-label="Maps">
        {maps.map((m) => (
          <button key={m.id} className="bi" aria-current={selected?.id === m.id} onClick={() => select(m.id)}>
            <span className={`map-glyph ${m.kind}`} aria-hidden="true">{m.kind === 'feelings' ? '→' : '—'}</span>
            <span>
              <b>{m.name}</b>
              <small>{MAP_KINDS[m.kind].short} · {plural(m.nodes.length, 'character')} · {plural(m.links.length, m.kind === 'feelings' ? 'arrow' : 'line')}</small>
            </span>
          </button>
        ))}
        <button className="add-scene" onClick={() => create('relationships')}>+ New relationship map</button>
        <button className="add-scene" onClick={() => create('feelings')}>+ New feelings map</button>
      </nav>

      {selected ? (
        <MapEditor key={selected.id} map={selected} chars={chars} charOf={charOf} onDelete={() => remove(selected.id)} />
      ) : (
        <div className="panel maps-empty">
          <h2>Map your characters</h2>
          {Object.entries(MAP_KINDS).map(([kind, k]) => (
            <div key={kind} className="maps-empty-row">
              <div>
                <b>{k.label}</b>
                <p>{k.blurb}</p>
              </div>
              <button className="pri" onClick={() => create(kind)}>Create {k.label.toLowerCase()}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
