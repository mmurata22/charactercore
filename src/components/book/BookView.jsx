import { useMemo, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { analyzeScript, renameCues } from '../../lib/script';
import { titleCase } from '../../lib/characters';
import BookIndex from './BookIndex.jsx';
import CharacterProfile from './CharacterProfile.jsx';

/**
 * Every character in the project — the same list the reel files clips under and
 * the script autocompletes. Each has a profile, a free-writing page and a moodboard.
 */
export default function BookView() {
  const { project, addCharacter, updateCharacter, deleteCharacter, updateScript } = useProject();
  const { chars, clips, script } = project;
  const [selId, setSelId] = useState(null);
  const [newId, setNewId] = useState(null);

  const selected = chars.find((c) => c.id === selId) || chars[0] || null;
  const { cast } = useMemo(() => analyzeScript(script.elements), [script.elements]);
  const listed = new Set(chars.map((c) => c.name.trim().toUpperCase()));
  const unlisted = [...cast.values()].filter((c) => !listed.has(c.name));

  function create(fields = {}) {
    const c = addCharacter(fields);
    setSelId(c.id);
    setNewId(fields.name ? null : c.id);
  }

  /** Keep script cues in step when a character is renamed. Returns how many changed. */
  function renameInScript(oldName, newName) {
    const { count } = renameCues(script.elements, oldName, newName);
    if (count) updateScript((s) => ({ ...s, elements: renameCues(s.elements, oldName, newName).elements }));
    return count;
  }

  return (
    <div className="band">
      <div className="wrap">
        <div className="top">
          <div>
            <h1>Character book</h1>
            <p>
              Everyone in your story, in one place: a profile, a page to write about them, and a moodboard of
              images. Characters here are the same ones you file reel clips under and that autocomplete in the
              script.
            </p>
          </div>
          <div className="btns">
            <button className="pri" onClick={() => create()}>New character</button>
          </div>
        </div>

        {selected ? (
          <div className="book">
            <BookIndex
              chars={chars}
              clips={clips}
              cast={cast}
              selectedId={selected.id}
              onSelect={setSelId}
              unlisted={unlisted}
              onAddUnlisted={(name) => create({ name: titleCase(name) })}
            />
            <CharacterProfile
              key={selected.id}
              character={selected}
              clips={clips.filter((k) => k.char === selected.id)}
              castEntry={cast.get(selected.name.trim().toUpperCase())}
              autoFocusName={newId === selected.id}
              onChange={(p) => updateCharacter(selected.id, p)}
              onRename={renameInScript}
              onDelete={() => {
                deleteCharacter(selected.id);
                setSelId(null);
              }}
            />
          </div>
        ) : (
          <div className="book-empty panel">
            <h2>No characters yet</h2>
            <p>Create one here, from the reel, or by adding a speaker from your script.</p>
            <div className="btns">
              <button className="pri" onClick={() => create()}>Create your first character</button>
              {unlisted.map((c) => (
                <button key={c.name} onClick={() => create({ name: titleCase(c.name) })}>
                  Add {titleCase(c.name)} from the script
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
