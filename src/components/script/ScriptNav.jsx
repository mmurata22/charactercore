import { useState } from 'react';
import { groupBlocks, outlineBlocks } from '../../lib/script';

const COLLAPSE_KEY = 'charcore.collapsedSections';
const readCollapsed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || []);
  } catch {
    return new Set();
  }
};

/**
 * Side menu: the cover page, then the script's outline: section dividers ("Act One") and the scenes
 * under them, in script order. Drag scenes or sections to reorder, or use the ↑ ↓ buttons.
 * New scenes are added at the end (or at the end of a section with its own "+ scene").
 */
export default function ScriptNav({
  title, elements, scenes, sceneCast, onCover, currentKey,
  onSelectCover, onSelectScene, onAddScene, onAddSection, onRenameSection, onDeleteSection,
  onMoveScene, onMoveSection, onDrop,
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [editing, setEditing] = useState(null); // section id being renamed
  const [dragKey, setDragKey] = useState(null);
  const [dropKey, setDropKey] = useState(null); // highlight: drop before this block ('end:<id>' = end of a section)
  const blocks = outlineBlocks(elements);
  const groups = groupBlocks(blocks);
  const isOpening = (b) => b?.kind === 'scene' && !b.scene.heading && b.start === 0;
  const sceneIndex = new Map(scenes.map((s, i) => [s.key, i]));

  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });

  // ---- drag and drop ----
  const dragProps = (key) => ({
    draggable: true,
    onDragStart: (e) => {
      setDragKey(key);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', key);
    },
    onDragEnd: () => {
      setDragKey(null);
      setDropKey(null);
    },
  });
  /** `before` is the block to drop in front of; null = very end. */
  const dropProps = (zone, before) => ({
    onDragOver: (e) => {
      if (!dragKey) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropKey(zone);
    },
    onDragLeave: () => setDropKey((z) => (z === zone ? null : z)),
    onDrop: (e) => {
      e.preventDefault();
      if (dragKey) onDrop(dragKey, before);
      setDragKey(null);
      setDropKey(null);
    },
  });
  /** The block that follows a group: scenes dropped at the end of a section go in front of it. */
  const afterGroup = (gi) => groups[gi + 1]?.section?.key ?? groups[gi + 1]?.blocks[0]?.key ?? null;

  const sceneRow = (b) => {
    const s = b.scene;
    const i = sceneIndex.get(s.key);
    const pinned = isOpening(b);
    const pos = blocks.indexOf(b);
    return (
      <li key={s.key} className={`nav-scene${dropKey === s.key ? ' drop-before' : ''}${dragKey === s.key ? ' dragging' : ''}`}
        {...(pinned ? {} : dragProps(s.key))} {...dropProps(s.key, s.key)}>
        <button aria-current={!onCover && s.key === currentKey} onClick={() => onSelectScene(i)}>
          {!pinned && <span className="grip" aria-hidden="true">⋮⋮</span>}
          <b>{s.n ?? '·'}</b>
          <span className="side-scene-wrap">
            <span className="side-scene">{s.heading ? s.heading.text.trim() || 'Untitled scene' : pinned ? 'Opening' : 'Scene with no heading'}</span>
            {sceneCast[i]?.length > 0 && (
              <span className="side-dots" aria-label={sceneCast[i].map((c) => c.name).join(', ')}>
                {sceneCast[i].map((c) => <i key={c.name} style={{ background: c.color }} title={c.name} />)}
              </span>
            )}
          </span>
        </button>
        {!pinned && (
          <span className="nav-move">
            <button aria-label="Move scene up" disabled={pos <= 0 || isOpening(blocks[pos - 1])} onClick={() => onMoveScene(s.key, -1)}>↑</button>
            <button aria-label="Move scene down" disabled={pos >= blocks.length - 1} onClick={() => onMoveScene(s.key, 1)}>↓</button>
          </span>
        )}
      </li>
    );
  };

  return (
    <nav className="panel script-nav" aria-label="Script pages">
      <h2 className="script-nav-title">{title.trim() || 'Untitled project'}</h2>
      <ol className="side-list">
        <li>
          <button aria-current={onCover} onClick={onSelectCover}>
            <b>◇</b>
            <span>Cover page</span>
          </button>
        </li>

        {groups.map((g, gi) => {
          const next = afterGroup(gi);
          if (!g.section) return g.blocks.map(sceneRow);
          const sec = g.section.section;
          const open = !collapsed.has(sec.id);
          return (
            <li key={sec.id} className={`nav-section${dragKey === sec.id ? ' dragging' : ''}`}>
              <div className={`nav-section-head${dropKey === sec.id ? ' drop-before' : ''}`} {...dragProps(sec.id)} {...dropProps(sec.id, sec.id)}>
                <button className="nav-section-toggle" aria-expanded={open} onClick={() => toggle(sec.id)}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${sec.text}`}>
                  {open ? '▾' : '▸'}
                </button>
                {editing === sec.id ? (
                  <input type="text" autoFocus defaultValue={sec.text} maxLength={60} aria-label="Section name"
                    onBlur={(e) => { onRenameSection(sec.id, e.target.value); setEditing(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditing(null);
                    }} />
                ) : (
                  <span className="nav-section-name" onDoubleClick={() => setEditing(sec.id)}>
                    {sec.text || 'Untitled section'} <small>{g.blocks.length}</small>
                  </span>
                )}
                <span className="nav-move">
                  <button aria-label="Move section up" disabled={!groups[gi - 1]?.section} onClick={() => onMoveSection(sec.id, -1)}>↑</button>
                  <button aria-label="Move section down" disabled={gi === groups.length - 1} onClick={() => onMoveSection(sec.id, 1)}>↓</button>
                  <button aria-label={`Rename ${sec.text}`} onClick={() => setEditing(sec.id)}>✎</button>
                  <button aria-label={`Remove section ${sec.text}`} onClick={() => onDeleteSection(sec.id)}>×</button>
                </span>
              </div>
              {open && (
                <ol className="side-list nav-section-items">
                  {g.blocks.map(sceneRow)}
                  <li className={`nav-section-end${dropKey === `end:${sec.id}` ? ' drop-before' : ''}`} {...dropProps(`end:${sec.id}`, next)}>
                    <button className="nav-add-in" onClick={() => onAddScene(next)}>+ scene{g.blocks.length ? '' : ' (this section is empty)'}</button>
                  </li>
                </ol>
              )}
            </li>
          );
        })}

        <li className={`nav-end${dropKey === 'end' ? ' drop-before' : ''}`} {...dropProps('end', null)} aria-hidden={!dragKey} />
      </ol>
      <div className="nav-add">
        <button className="add-scene" onClick={() => onAddScene(null)}>+ Add scene at the end</button>
        <button className="add-scene" onClick={() => setEditing(onAddSection())}>+ Add section</button>
      </div>
      <p className="side-empty nav-tip">Drag scenes to reorder them, or into a section. Sections group the scenes below them.</p>
    </nav>
  );
}
