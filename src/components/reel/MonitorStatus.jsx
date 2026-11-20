export default function MonitorStatus({ reelPos, src, hasSource, onSkip, onStop }) {
  if (reelPos) {
    return (
      <div className="status">
        <span>Reel <b>{reelPos.i + 1} of {reelPos.total}</b></span>
        <span className="btns">
          <button onClick={onSkip}>Next clip</button>
          <button onClick={onStop}>Stop reel</button>
        </span>
      </div>
    );
  }
  return (
    <div className="status">
      {src ? (
        <span>
          On the monitor: <b>{src}</b>
          {!hasSource && ' (not added yet)'}
        </span>
      ) : (
        <span>Load footage, find a moment, mark in and out, then describe it.</span>
      )}
    </div>
  );
}
