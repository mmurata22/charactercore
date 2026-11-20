export default function ReelHeader({ canPlay, canExport, onPlay, onExport }) {
  return (
    <header className="band">
      <div className="wrap">
        <div className="top">
          <div>
            <h1>Character reel</h1>
            <p>
              Cut moments from films you own, file each under a character, write what it tells you, then watch the
              reel back with your notes as subtitles or export it as a video.
            </p>
          </div>
          <div className="btns">
            <button className="pri" disabled={!canPlay} onClick={onPlay}>Play reel</button>
            <button disabled={!canExport} onClick={onExport}>Export video</button>
          </div>
        </div>
      </div>
    </header>
  );
}
