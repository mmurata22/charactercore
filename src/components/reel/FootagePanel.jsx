import { plural } from '../../lib/format';
import FilePicker from './FilePicker.jsx';

export default function FootagePanel({ sources, clips, current, onFiles, onLoad }) {
  const used = (name) => clips.filter((k) => k.src === name).length;
  const have = [...sources.keys()];
  const needed = [...new Set(clips.map((k) => k.src))].filter((n) => !sources.has(n));

  return (
    <div className="panel">
      <h2>Footage</h2>
      <FilePicker label="Add video files" onFiles={onFiles} />
      <ul className="foot">
        {have.map((n) => (
          <li key={n}>
            <span>
              {n}
              {n === current && <> <b>(on monitor)</b></>} · {plural(used(n), 'clip')}
            </span>
            <button onClick={() => onLoad(n)}>Load</button>
          </li>
        ))}
        {needed.map((n) => (
          <li key={n} className="need">
            <span>Needed: {n} · {plural(used(n), 'clip')}</span>
          </li>
        ))}
        {!have.length && !needed.length && (
          <li className="need"><span>No footage yet.</span></li>
        )}
      </ul>
    </div>
  );
}
