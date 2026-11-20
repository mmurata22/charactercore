import { useProject } from '../../../state/ProjectContext.jsx';
import { UNKNOWN_CHAR } from '../../../lib/constants';
import MapsView from './MapsView.jsx';

/** Character maps get their own page in the menu. */
export default function MapsPage() {
  const { project } = useProject();
  const { chars } = project;
  return (
    <div className="band">
      <div className="wrap">
        <div className="top">
          <div>
            <h1>Character maps</h1>
            <p>
              Draw how your characters are connected. Relationship maps link characters with labelled lines; feelings
              maps use one-way, colour-coded arrows for how one character feels about another.
            </p>
          </div>
        </div>
        {!chars.length && (
          <p className="strip-hint">
            Maps use the characters from your <a href="#book">Character book</a>. Create some there first.
          </p>
        )}
        <MapsView chars={chars} charOf={(id) => chars.find((c) => c.id === id) || UNKNOWN_CHAR} />
      </div>
    </div>
  );
}
