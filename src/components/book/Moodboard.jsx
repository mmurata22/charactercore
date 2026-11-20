import { useRef, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { uid } from '../../lib/format';

/**
 * A character's moodboard: drag your own images onto it, then move, resize, caption or remove them.
 * Positions are percentages of the board so it scales with the window.
 */
export default function Moodboard({ character: c, onChange }) {
  const { images } = useProject();
  const boardRef = useRef(null);
  const fileRef = useRef(null);
  const drag = useRef(null);
  const [over, setOver] = useState(false);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');
  const items = c.moodboard;
  const setItems = (fn) => onChange({ moodboard: fn(c.moodboard) });
  const sel = items.find((m) => m.id === selected);

  /** Board coordinates (%) of a pointer/drag event. */
  const at = (e) => {
    const r = boardRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  async function addFiles(files, point) {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      setMsg('Only image files can go on the moodboard.');
      return;
    }
    setMsg('');
    const ids = await images.add(list);
    const base = point ?? { x: 8 + (items.length % 4) * 22, y: 8 + Math.floor(items.length / 4) * 18 };
    const added = ids.map((imageId, i) => ({
      id: uid(),
      imageId,
      x: Math.min(80, Math.max(0, base.x - 12 + i * 4)),
      y: Math.min(80, Math.max(0, base.y - 10 + i * 4)),
      w: 26,
      caption: '',
    }));
    setItems((list2) => [...list2, ...added]);
    if (added.length) setSelected(added[added.length - 1].id);
  }

  // Dropping files from the computer. Stop the event here so the reel page doesn't treat it as footage.
  const dropProps = {
    onDragEnter: (e) => e.nativeEvent.stopPropagation(),
    onDragOver: (e) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      e.nativeEvent.stopPropagation();
      setOver(true);
    },
    onDragLeave: (e) => !boardRef.current?.contains(e.relatedTarget) && setOver(false),
    onDrop: (e) => {
      e.preventDefault();
      e.nativeEvent.stopPropagation();
      setOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files, at(e));
    },
  };

  // Moving and resizing images on the board.
  function startMove(e, item, mode) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(item.id);
    const p = at(e);
    drag.current = { id: item.id, mode, start: p, orig: { ...item } };
    // Bring to front.
    setItems((list) => [...list.filter((m) => m.id !== item.id), list.find((m) => m.id === item.id)]);
  }
  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    const p = at(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    setItems((list) =>
      list.map((m) => {
        if (m.id !== d.id) return m;
        if (d.mode === 'resize') return { ...m, w: Math.min(100 - m.x, Math.max(6, d.orig.w + dx)) };
        return { ...m, x: Math.min(95, Math.max(-5, d.orig.x + dx)), y: Math.min(95, Math.max(-5, d.orig.y + dy)) };
      }),
    );
  }
  const endMove = () => (drag.current = null);

  function removeItem(id) {
    const item = items.find((m) => m.id === id);
    setItems((list) => list.filter((m) => m.id !== id));
    setSelected(null);
    // Delete the stored image unless another board still uses it.
    const stillUsed = items.some((m) => m.id !== id && m.imageId === item?.imageId);
    if (item && !stillUsed) images.remove(item.imageId);
  }

  return (
    <section className="panel moodboard">
      <div className="mood-head">
        <h2>{c.name}’s moodboard</h2>
        <span className="mood-tools">
          <button onClick={() => fileRef.current?.click()}>Add images…</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </span>
      </div>
      {sel && (
        <div className="mood-selbar">
          <input type="text" maxLength={120} placeholder="Caption (optional)" aria-label="Caption" value={sel.caption}
            onChange={(e) => setItems((list) => list.map((m) => (m.id === sel.id ? { ...m, caption: e.target.value } : m)))} />
          <button onClick={() => setItems((list) => [list.find((m) => m.id === sel.id), ...list.filter((m) => m.id !== sel.id)])}>Send to back</button>
          <button className="danger" onClick={() => removeItem(sel.id)}>Remove image</button>
        </div>
      )}
      {(msg || images.error) && <p className="msg">{msg || images.error}</p>}

      <div
        ref={boardRef}
        className={`mood-board${over ? ' over' : ''}`}
        onPointerMove={onMove}
        onPointerUp={endMove}
        onPointerDown={() => setSelected(null)}
        {...dropProps}
      >
        {items.map((m) => {
          const src = images.url(m.imageId);
          return (
            <figure
              key={m.id}
              className={`mood-item${m.id === selected ? ' sel' : ''}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%` }}
              onPointerDown={(e) => startMove(e, m, 'move')}
            >
              {src ? <img src={src} alt={m.caption || ''} draggable={false} /> : <div className="mood-missing">Image not found</div>}
              {m.caption && <figcaption>{m.caption}</figcaption>}
              <button className="mood-del" aria-label="Remove image" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeItem(m.id)}>×</button>
              <span className="mood-resize" aria-hidden="true" onPointerDown={(e) => startMove(e, m, 'resize')} />
            </figure>
          );
        })}
        {!items.length && (
          <div className="mood-empty">
            <b>Drag images here</b>
            <span>Photos, paintings, outfits, places: anything that feels like {c.name}. They stay on this device.</span>
          </div>
        )}
      </div>
      <p className="map-hint">Drag images to arrange them; pull the corner to resize. Click one to caption or remove it.</p>
    </section>
  );
}
