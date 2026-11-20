export default function FilterBar({ chars, filter, onFilter }) {
  return (
    <div className="filt">
      <button aria-pressed={filter === 'all'} onClick={() => onFilter('all')}>All characters</button>
      {chars.map((c) => (
        <button key={c.id} aria-pressed={filter === c.id} onClick={() => onFilter(c.id)}>
          <i style={{ background: c.color }} />
          {c.name}
        </button>
      ))}
    </div>
  );
}
