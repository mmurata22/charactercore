import { useState } from 'react';
import { useProject } from '../../../state/ProjectContext.jsx';
import { MAP_KINDS, nextNodePosition } from '../../../lib/maps';
import { uid } from '../../../lib/format';
import MapCanvas from './MapCanvas.jsx';
import LinkForm from './LinkForm.jsx';
import LinkList from './LinkList.jsx';
import EmotionLegend from './EmotionLegend.jsx';

export default function MapEditor({ map, chars, charOf, onDelete }) {
  const { updateMap } = useProject();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [adding, setAdding] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const change = (fn) => updateMap(map.id, fn);
  const onMap = new Set(map.nodes.map((n) => n.charId));
  const offMap = chars.filter((c) => !onMap.has(c.id));

  function addCharacters(ids) {
    change((m) => {
      const nodes = [...m.nodes];
      for (const id of ids) if (!nodes.some((n) => n.charId === id)) nodes.push({ charId: id, ...nextNodePosition(nodes.length) });
      return { ...m, nodes };
    });
    setAdding('');
  }

  function removeCharacter(id) {
    change((m) => ({ ...m, nodes: m.nodes.filter((n) => n.charId !== id), links: m.links.filter((l) => l.from !== id && l.to !== id) }));
    setFrom((f) => (f === id ? null : f));
    setTo((t) => (t === id ? null : t));
  }

  /** Clicking characters fills "from" then "to". */
  function clickNode(id) {
    setSelectedLink(null);
    if (!from || (from && to)) {
      setFrom(id);
      setTo(null);
    } else if (id !== from) setTo(id);
    else setFrom(null);
  }

  const emotionOps = {
    onAdd: (em) => change((m) => ({ ...m, emotions: [...m.emotions.filter((x) => x.label.toLowerCase() !== em.label.toLowerCase()), em] })),
    onRecolor: (label, color) => change((m) => ({ ...m, emotions: m.emotions.map((e) => (e.label === label ? { ...e, color } : e)) })),
    onRename: (oldLabel, label) =>
      change((m) => ({
        ...m,
        emotions: m.emotions.map((e) => (e.label === oldLabel ? { ...e, label } : e)),
        links: m.links.map((l) => (l.label === oldLabel ? { ...l, label } : l)),
      })),
    onRemove: (label) => change((m) => ({ ...m, emotions: m.emotions.filter((e) => e.label !== label) })),
  };

  const selectedNodes = [from, to].filter(Boolean);
  const lone = map.nodes.length === 1 ? map.nodes[0].charId : null;

  return (
    <div className="map-editor">
      <div className="map-top">
        <input
          type="text"
          className="map-title"
          aria-label="Map name"
          maxLength={60}
          value={map.name}
          onChange={(e) => change((m) => ({ ...m, name: e.target.value }))}
          onBlur={(e) => !e.target.value.trim() && change((m) => ({ ...m, name: MAP_KINDS[m.kind].label }))}
        />
        <span className="map-kind">{MAP_KINDS[map.kind].short}</span>
        <span className="map-top-end">
          {offMap.length > 0 && (
            <>
              <select aria-label="Character to add" value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Add a character…</option>
                {offMap.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button disabled={!adding} onClick={() => addCharacters([adding])}>Add</button>
              <button onClick={() => addCharacters(offMap.map((c) => c.id))}>Add everyone</button>
            </>
          )}
          {confirmDelete ? (
            <>
              <button className="danger" onClick={onDelete}>Delete map</button>
              <button onClick={() => setConfirmDelete(false)}>Keep</button>
            </>
          ) : (
            <button className="danger" onClick={() => setConfirmDelete(true)}>Delete map</button>
          )}
        </span>
      </div>

      <div className="map-body">
        <div className="map-stage">
          {map.nodes.length ? (
            <MapCanvas
              map={map}
              charOf={charOf}
              selectedNodes={selectedNodes}
              selectedLink={selectedLink}
              onMoveNode={(id, x, y) => change((m) => ({ ...m, nodes: m.nodes.map((n) => (n.charId === id ? { ...n, x, y } : n)) }))}
              onNodeClick={clickNode}
              onLinkClick={(id) => { setSelectedLink(id); setFrom(null); setTo(null); }}
              onBackgroundClick={() => { setSelectedLink(null); }}
            />
          ) : (
            <div className="map-empty">
              <p>{chars.length ? 'Add characters to start this map.' : 'Create characters in the Profiles tab first.'}</p>
              {chars.length > 0 && <button className="pri" onClick={() => addCharacters(chars.map((c) => c.id))}>Add everyone</button>}
            </div>
          )}
          <p className="map-hint">
            Drag characters to arrange them. Click two characters to connect them; click a {map.kind === 'feelings' ? 'arrow' : 'line'} to select it.
            {lone && ' Add one more character to make a connection.'}
          </p>
          {selectedNodes.length === 1 && (
            <p className="map-hint">
              <button className="danger" onClick={() => removeCharacter(selectedNodes[0])}>Remove {charOf(selectedNodes[0]).name} from this map</button>
            </p>
          )}
        </div>

        <aside className="map-side">
          {map.nodes.length >= 2 && (
            <LinkForm
              key={map.id}
              map={map}
              charOf={charOf}
              from={from}
              to={to}
              onFrom={setFrom}
              onTo={setTo}
              onAddEmotion={emotionOps.onAdd}
              onAdd={(l) => {
                const link = { id: uid(), color: '', ...l };
                change((m) => ({ ...m, links: [...m.links, link] }));
                setSelectedLink(link.id);
                setFrom(null);
                setTo(null);
              }}
            />
          )}
          {map.kind === 'feelings' && <EmotionLegend map={map} {...emotionOps} />}
          <LinkList
            map={map}
            charOf={charOf}
            selectedLink={selectedLink}
            onSelect={setSelectedLink}
            onChange={(id, patch) => change((m) => ({ ...m, links: m.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))}
            onDelete={(id) => change((m) => ({ ...m, links: m.links.filter((l) => l.id !== id) }))}
          />
        </aside>
      </div>
    </div>
  );
}
