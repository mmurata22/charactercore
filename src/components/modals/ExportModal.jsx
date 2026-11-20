import { useEffect, useRef, useState } from 'react';
import { useEscape } from '../../hooks/useEscape';
import { canRecord, estimateSeconds, pickMimeType, recordReel } from '../../lib/exportVideo';
import { plural, slugify } from '../../lib/format';
import { downloadFile } from '../../lib/download';
import { exportName } from '../../lib/exports';
import { useProject } from '../../state/ProjectContext.jsx';

/** Records the reel (or one character's clips) to a downloadable video file. */
export default function ExportModal({ clips, chars, charOf, sources, initialWhich, onClose }) {
  const { meta, reels } = useProject();
  const [which, setWhich] = useState(
    initialWhich !== 'all' && clips.some((k) => k.char === initialWhich) ? initialWhich : 'all',
  );
  const defaultName = (w) => (w === 'all' ? 'Full reel' : `${charOf(w).name}’s reel`);
  const [reelName, setReelName] = useState('');
  const [size, setSize] = useState('720');
  const [subs, setSubs] = useState(true);
  const [sound, setSound] = useState(true);
  const [cards, setCards] = useState(true);
  const [phase, setPhase] = useState('setup'); // setup | run | done
  const [progress, setProgress] = useState({ label: '', pct: 0 });
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const controlRef = useRef(null);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const urlRef = useRef(null);

  const list = clips.filter((k) => which === 'all' || k.char === which);
  const secs = estimateSeconds(list, sources, cards);
  const missing = list.filter((k) => !sources.has(k.src)).length;
  const withClips = chars.filter((c) => clips.some((k) => k.char === c.id));

  // Stop any running export and free the video URL when the dialog goes away.
  useEffect(
    () => () => {
      if (controlRef.current) controlRef.current.stop = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const close = () => {
    if (controlRef.current) controlRef.current.stop = true;
    previewRef.current?.pause();
    onClose();
  };
  useEscape(() => {
    if (phase !== 'run') close();
  });

  async function start() {
    if (!canRecord()) {
      setMessage('This browser cannot record video. Try Chrome, Edge or Firefox.');
      return;
    }
    const mime = pickMimeType();
    if (!mime) {
      setMessage('This browser cannot record video.');
      return;
    }
    const control = { stop: false };
    controlRef.current = control;
    setMessage('');
    setProgress({ label: '', pct: 0 });
    setPhase('run');

    const r = await recordReel({
      clips: list,
      sources,
      charOf,
      height: +size,
      subs,
      sound,
      cards,
      canvas: canvasRef.current,
      mime,
      control,
      onProgress: (i, total) => setProgress({ label: `Recording clip ${i + 1} of ${total}…`, pct: (i / total) * 100 }),
    });
    controlRef.current = null;

    if (r.cancelled) {
      setPhase('setup');
      setMessage(r.error || 'Export cancelled.');
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(r.blob);
    urlRef.current = url;
    // Unique per export: what was exported, its size, and when it finished.
    const scope = which === 'all' ? 'full' : slugify(charOf(which).name);
    const fileName = exportName(meta.name, `reel_${scope}_${r.height}p`, r.ext);
    // Keep every finished reel in the project's list on the Character reel page.
    const kept = await reels.add(r.blob, {
      name: reelName.trim() || defaultName(which),
      scope: which === 'all' ? 'Full reel' : `Only ${charOf(which).name}`,
      height: r.height,
      ext: r.ext,
      clipCount: list.length,
      duration: secs,
      fileName,
      poster: r.poster,
    });
    setResult({ ...r, url, fileName, kept: !!kept });
    setProgress((p) => ({ ...p, pct: 100 }));
    setPhase('done');
  }

  const save = () => {
    if (!result) return;
    downloadFile(result.url, result.fileName);
    setMessage('If no download started, right-click the preview and choose “Save video as”.');
  };

  const info =
    `About ${Math.max(1, Math.round(secs))} seconds of video. Export plays the reel in real time, so keep this tab open and in front until it finishes.` +
    (missing
      ? ` ${plural(missing, 'clip')} ${missing === 1 ? 'has' : 'have'} no footage added${cards ? ' and will appear as text cards' : ' and will be skipped'}.`
      : '');

  return (
    <div className="modal">
      <div className="sheet narrow">
        <div className="hd">
          <h2>Export video</h2>
          <button onClick={close}>Close</button>
        </div>

        <div hidden={phase !== 'setup'}>
          <label className="f" htmlFor="xName">Name this reel</label>
          <input id="xName" type="text" maxLength={80} placeholder={defaultName(which)} value={reelName}
            onChange={(e) => setReelName(e.target.value)} />
          <label className="f" htmlFor="xWhich">Clips</label>
          <select id="xWhich" value={which} onChange={(e) => setWhich(e.target.value)}>
            <option value="all">Whole reel ({clips.length} clips)</option>
            {withClips.map((c) => (
              <option key={c.id} value={c.id}>Only {c.name}</option>
            ))}
          </select>
          <label className="f" htmlFor="xSize">Size</label>
          <select id="xSize" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="720">720p (1280 × 720)</option>
            <option value="1080">1080p (1920 × 1080)</option>
          </select>
          <div style={{ marginTop: 10 }}>
            <label className="chk">
              <input type="checkbox" checked={subs} onChange={(e) => setSubs(e.target.checked)} />
              Burn in subtitles
            </label>
            <label className="chk">
              <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
              Include sound
            </label>
            <label className="chk">
              <input type="checkbox" checked={cards} onChange={(e) => setCards(e.target.checked)} />
              Show a text card for clips whose footage isn't added
            </label>
          </div>
          <p className="lead" style={{ marginTop: 10 }}>{info}</p>
          <button className="pri" disabled={!secs} onClick={start}>Start export</button>
        </div>

        <div hidden={phase !== 'run'}>
          <div className="mon"><canvas ref={canvasRef} /></div>
          <div className="prog"><i style={{ width: `${progress.pct}%` }} /></div>
          <p className="lead">{progress.label}</p>
          <button onClick={() => controlRef.current && (controlRef.current.stop = true)}>Cancel export</button>
        </div>

        <div hidden={phase !== 'done'}>
          <div className="mon">
            <video ref={previewRef} controls playsInline src={result?.url} />
          </div>
          {result && (
            <p className="lead" style={{ marginTop: 10 }}>
              Done: {(result.blob.size / 1048576).toFixed(1)} MB {result.ext.toUpperCase()} video, {result.width} × {result.height}.
              <br />
              {result.kept
                ? 'Kept in Finished reels on the Character reel page.'
                : 'This one couldn’t be kept in Finished reels, so download it now.'}{' '}
              Downloads as <b>{result.fileName}</b>
            </p>
          )}
          <div className="actions">
            <button className="pri" onClick={save}>Download video</button>
            <button onClick={() => { setPhase('setup'); setMessage(''); }}>Change settings</button>
          </div>
        </div>

        <p className="msg">{message}</p>
      </div>
    </div>
  );
}
