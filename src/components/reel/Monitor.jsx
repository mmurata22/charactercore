import { tint } from '../../lib/format';
import ClipCard from './ClipCard.jsx';
import FilePicker from './FilePicker.jsx';

/**
 * The black 16:9 monitor. The <video> element is driven imperatively by ReelView
 * through `videoRef`; `screen` says which overlay (card / empty / subtitle) to show.
 */
export default function Monitor({ containerRef, videoRef, screen, dragging, charOf, onFiles }) {
  const { card, sub, empty } = screen;
  return (
    <div className={dragging ? 'mon drag' : 'mon'} ref={containerRef}>
      <video ref={videoRef} playsInline preload="auto" />
      {card && <ClipCard key={card.id} clip={card} char={charOf(card.char)} />}
      {empty && !card && (
        <div className="empty">
          <strong>Drop video files here</strong>
          <span>MP4, WebM or MOV. Files stay on this device and are never uploaded.</span>
          <FilePicker label="Choose videos" primary onFiles={onFiles} />
        </div>
      )}
      {sub && <Subtitle key={sub.id} clip={sub} char={charOf(sub.char)} />}
    </div>
  );
}

function Subtitle({ clip, char }) {
  return (
    <div className="sub">
      <b style={{ color: tint(char.color, 55) }}>{char.name}</b>
      {clip.cap}
    </div>
  );
}
