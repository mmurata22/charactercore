import { tint } from '../../lib/format';

/** Text card shown in place of a clip whose footage hasn't been added. */
export default function ClipCard({ clip, char, showCaption = true }) {
  return (
    <div className="card">
      <strong style={{ color: tint(char.color, 60) }}>{char.name}</strong>
      {showCaption && <p>{clip.cap}</p>}
      <em>Add “{clip.src}” to see the footage</em>
    </div>
  );
}
