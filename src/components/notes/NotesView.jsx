import { useMemo, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { splitScenes } from '../../lib/script';
import { notesMarkdown, SECTION_COLOR, UNFILED_COLOR } from '../../lib/notes';
import { exportName } from '../../lib/exports';
import { downloadFile } from '../../lib/download';
import { slugify } from '../../lib/format';
import NoteCard from './NoteCard.jsx';
import NoteDialog from './NoteDialog.jsx';

const GROUP_KEY = 'charcore.notesGroup';

/**
 * All notes in the project: by character, by author-made section, and unfiled.
 * Notes come from comments on highlighted script text, or can be written here.
 */
export default function NotesView() {
  const { project, meta, notify, addNote, updateNote, deleteNote, addNoteSection, renameNoteSection, deleteNoteSection } = useProject();
  const { chars, notes, noteSections, script } = project;
  const scenes = useMemo(() => splitScenes(script.elements), [script.elements]);
  const [group, setGroupState] = useState(() => {
    try {
      return localStorage.getItem(GROUP_KEY) || 'all';
    } catch {
      return 'all';
    }
  });
  const [dialog, setDialog] = useState(null); // { mode: 'new' } | { mode: 'edit', note }
  const [newSection, setNewSection] = useState('');
  const [renaming, setRenaming] = useState(null);

  const setGroup = (g) => {
    setGroupState(g);
    try {
      localStorage.setItem(GROUP_KEY, g);
    } catch {
      /* ignore */
    }
  };

  const inGroup = (g) => {
    if (g === 'all') return notes;
    if (g === 'unfiled') return notes.filter((n) => n.target.type === 'none');
    const [type, id] = g.split(':');
    return notes.filter((n) => n.target.type === type && n.target.id === id);
  };
  // Fall back to "all" if the selected character or section is gone.
  const valid = group === 'all' || group === 'unfiled' ||
    chars.some((c) => group === `character:${c.id}`) || noteSections.some((s) => group === `section:${s.id}`);
  const g = valid ? group : 'all';
  const list = [...inGroup(g)].sort((a, b) => b.updatedAt - a.updatedAt);

  const groupInfo = (() => {
    if (g === 'all') return { title: 'All notes', target: { type: 'none' } };
    if (g === 'unfiled') return { title: 'Unfiled notes', target: { type: 'none' } };
    const [type, id] = g.split(':');
    const name = type === 'character' ? chars.find((c) => c.id === id)?.name : noteSections.find((s) => s.id === id)?.name;
    return { title: name, target: { type, id }, type, id };
  })();

  function exportNotes(onlyThis) {
    const name = exportName(meta.name, onlyThis && g !== 'all' ? `notes_${slugify(groupInfo.title)}` : 'notes', 'md');
    downloadFile(notesMarkdown(meta.name, project, onlyThis ? { title: groupInfo.title, only: list } : {}), name);
    notify(`Downloaded ${name}`);
  }

  const navItem = (key, label, count, color) => (
    <button key={key} className="bi notes-nav-item" aria-current={g === key} onClick={() => setGroup(key)}>
      <i style={{ background: color }} />
      <span><b>{label}</b></span>
      <small className="notes-count">{count}</small>
    </button>
  );

  return (
    <div className="band">
      <div className="wrap">
        <div className="top">
          <div>
            <h1>Notes</h1>
            <p>
              Comments you’ve made on highlighted script text, and notes written here. File each one under a
              character, a section of your own, or nothing.
            </p>
          </div>
          <div className="btns">
            <button className="pri" onClick={() => setDialog({ mode: 'new' })}>New note</button>
            <button disabled={!notes.length} onClick={() => exportNotes(false)}>Export all notes</button>
          </div>
        </div>

        <div className="notes">
          <nav className="notes-nav" aria-label="Note groups">
            {navItem('all', 'All notes', notes.length, 'var(--mute)')}

            <h3>Characters</h3>
            {chars.length ? (
              chars.map((c) => navItem(`character:${c.id}`, c.name, inGroup(`character:${c.id}`).length, c.color))
            ) : (
              <p className="side-empty">No characters yet.</p>
            )}

            <h3>Sections</h3>
            {noteSections.map((s) =>
              renaming === s.id ? (
                <input key={s.id} type="text" autoFocus defaultValue={s.name} maxLength={60} aria-label="Section name"
                  onBlur={(e) => { renameNoteSection(s.id, e.target.value); setRenaming(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
              ) : (
                navItem(`section:${s.id}`, s.name, inGroup(`section:${s.id}`).length, SECTION_COLOR)
              ),
            )}
            <form
              className="notes-newsec"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSection.trim()) return;
                const s = addNoteSection(newSection);
                setNewSection('');
                setGroup(`section:${s.id}`);
              }}
            >
              <input type="text" maxLength={60} placeholder="New section, e.g. Act 1" aria-label="New section name"
                value={newSection} onChange={(e) => setNewSection(e.target.value)} />
              <button type="submit">Add</button>
            </form>

            <h3>Unfiled</h3>
            {navItem('unfiled', 'Unfiled notes', inGroup('unfiled').length, UNFILED_COLOR)}
          </nav>

          <section className="notes-main">
            <div className="rhead">
              <h2>{groupInfo.title}</h2>
              <div className="btns">
                {groupInfo.type === 'section' && (
                  <>
                    <button onClick={() => setRenaming(groupInfo.id)}>Rename section</button>
                    <button className="danger" onClick={() => { deleteNoteSection(groupInfo.id); setGroup('all'); }}>Delete section</button>
                  </>
                )}
                <button disabled={!list.length} onClick={() => exportNotes(true)}>Export these notes</button>
              </div>
            </div>
            {groupInfo.type === 'section' && <p className="strip-hint">Deleting a section keeps its notes; they move to Unfiled.</p>}

            {list.length ? (
              <ul className="note-list">
                {list.map((n) => (
                  <NoteCard key={n.id} note={n} scenes={scenes} onEdit={() => setDialog({ mode: 'edit', note: n })}
                    onRefile={(target) => updateNote(n.id, { target })} onDelete={() => deleteNote(n.id)} />
                ))}
              </ul>
            ) : (
              <p className="strip-hint">
                No notes here yet. In the <a href="#script">Script</a>, select some text and choose Comment, or write a
                new note above.
              </p>
            )}
          </section>
        </div>
      </div>

      {dialog?.mode === 'new' && (
        <NoteDialog
          title="New note"
          initialTarget={groupInfo.target}
          onClose={() => setDialog(null)}
          onSave={(fields) => {
            addNote(fields);
            setDialog(null);
          }}
        />
      )}
      {dialog?.mode === 'edit' && (
        <NoteDialog
          title="Edit note"
          quote={dialog.note.quote}
          initialText={dialog.note.text}
          initialTarget={dialog.note.target}
          onClose={() => setDialog(null)}
          onSave={(fields) => {
            updateNote(dialog.note.id, fields);
            setDialog(null);
          }}
          onDelete={() => {
            deleteNote(dialog.note.id);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
