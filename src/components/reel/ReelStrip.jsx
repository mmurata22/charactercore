import FilterBar from './FilterBar.jsx';
import ReelFrame from './ReelFrame.jsx';

export default function ReelStrip({
  chars, clips, filter, onFilter, charOf, sources, editingId, sel, onEdit, onMove, onToggle,
  onPlay, selectedCount, onCompare,
}) {
  return (
    <section className="band" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="rhead">
          <h2>Reel</h2>
          <FilterBar chars={chars} filter={filter} onFilter={onFilter} />
          <div className="btns">
            <button className="pri" disabled={!clips.length} onClick={onPlay}>Play reel</button>
            <button disabled={selectedCount < 2} onClick={onCompare}>
              {selectedCount ? `Side by side (${selectedCount})` : 'Side by side'}
            </button>
          </div>
        </div>
        <div className="scroll">
          <div className="strip">
            {clips.length ? (
              clips.map((k, i) => (
                <ReelFrame
                  key={k.id}
                  clip={k}
                  n={i + 1}
                  char={charOf(k.char)}
                  hasFootage={sources.has(k.src)}
                  editing={editingId === k.id}
                  selected={sel.has(k.id)}
                  onEdit={onEdit}
                  onMove={onMove}
                  onToggle={onToggle}
                />
              ))
            ) : (
              <div className="strip-empty">
                {chars.length
                  ? 'No clips yet. Load footage, mark in and out, and save your first clip.'
                  : 'Create a character, then cut your first clip.'}
              </div>
            )}
          </div>
        </div>
        <p className="strip-hint">
          Clips play in this order. Use the arrows to rearrange, and tick two or more to watch them side by side.
        </p>
      </div>
    </section>
  );
}
