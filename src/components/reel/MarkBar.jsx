export default function MarkBar({ onMarkIn, onMarkOut, onPreview, onNudge }) {
  return (
    <div className="marks">
      <button onClick={onMarkIn}>Mark in <span className="kbd">I</span></button>
      <button onClick={onMarkOut}>Mark out <span className="kbd">O</span></button>
      <button onClick={onPreview}>Preview cut</button>
      <button aria-label="Back a tenth of a second" onClick={() => onNudge(-0.1)}>−0.1s</button>
      <button aria-label="Forward a tenth of a second" onClick={() => onNudge(0.1)}>+0.1s</button>
    </div>
  );
}
