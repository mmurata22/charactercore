import { plural } from '../../lib/format';
import { goToScriptElement } from '../../lib/navigation';

/** Where this character shows up: their reel clips and the scenes they speak in. */
export default function Appearances({ character: c, clips, castEntry }) {
  return (
    <div className="appear">
      <section className="panel">
        <h2>In the reel</h2>
        {clips.length ? (
          <>
            <p className="appear-sum">{plural(clips.length, 'clip')} of what they're like on screen.</p>
            <div className="appear-clips">
              {clips.map((k) => (
                <figure key={k.id} className="ac">
                  <div className="pic" style={{ '--c': c.color }}>
                    {k.thumb && <img src={k.thumb} alt="" />}
                    <i>{(k.out - k.in).toFixed(1)}s</i>
                  </div>
                  <figcaption>{k.cap}</figcaption>
                </figure>
              ))}
            </div>
          </>
        ) : (
          <p className="appear-sum">
            No clips yet. On the <a href="#reel">Character reel</a>, cut moments from footage and file them under{' '}
            {c.name}.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>In the script</h2>
        {castEntry ? (
          <>
            <p className="appear-sum">
              {plural(castEntry.lines, 'line')} of dialogue across {plural(castEntry.scenes.length, 'scene')}.
            </p>
            <div className="scene-links">
              {castEntry.scenes.map((s) => (
                <button key={s.id} onClick={() => goToScriptElement(s.id)}>
                  {s.n}. {s.text.trim().toUpperCase() || 'UNTITLED SCENE'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="appear-sum">
            Doesn't speak yet. In the <a href="#script">Script</a>, add a Character cue and start typing{' '}
            {c.name.toUpperCase()}.
          </p>
        )}
      </section>
    </div>
  );
}
