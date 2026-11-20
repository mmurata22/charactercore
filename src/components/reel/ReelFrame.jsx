import { tint } from '../../lib/format';

/** One frame of the film strip: thumbnail, caption, reorder arrows and compare tick. */
export default function ReelFrame({ clip, n, char, hasFootage, editing, selected, onEdit, onMove, onToggle }) {
  const cls = 'fw' + (editing ? ' on' : '') + (selected ? ' sel' : '');
  return (
    <div className={cls}>
      <button className="fr" aria-label={`Edit clip ${n}`} onClick={() => onEdit(clip.id)}>
        <div className="pic" style={{ '--c': char.color }}>
          {clip.thumb ? (
            <img src={clip.thumb} alt="" />
          ) : (
            <span className="slate pic-name">{char.name}</span>
          )}
          <u>{n}</u>
          <i>{(clip.out - clip.in).toFixed(1)}s</i>
        </div>
        <p>
          <strong style={{ color: tint(char.color, 60) }}>{char.name}</strong>
          {clip.cap}
        </p>
        {!hasFootage && <em>Footage not added</em>}
      </button>
      <div className="ft">
        <button data-act="left" data-id={clip.id} aria-label="Move earlier" onClick={() => onMove(clip.id, -1)}>←</button>
        <button data-act="right" data-id={clip.id} aria-label="Move later" onClick={() => onMove(clip.id, 1)}>→</button>
        <label>
          <input type="checkbox" checked={selected} onChange={(e) => onToggle(clip.id, e.target.checked)} />
          Compare
        </label>
      </div>
    </div>
  );
}
