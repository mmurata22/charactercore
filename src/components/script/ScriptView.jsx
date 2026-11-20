import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useProject } from '../../state/ProjectContext.jsx';
import {
  TYPE_KEYS, analyzeScript, cueName, cycleType, detectType, dropBlock, estimatePages, moveScene, moveSection, newElement,
  nextType, retypeText, sceneIndexOf, splitScenes,
} from '../../lib/script';
import { titleCase } from '../../lib/characters';
import { downloadFile } from '../../lib/download';
import { EXPORT_KINDS, exportName, scriptBlob } from '../../lib/exports';
import { locateNote, targetColor } from '../../lib/notes';
import { clearPendingScriptFocus, peekPendingScriptFocus, takePendingPrint } from '../../lib/navigation';
import ScriptToolbar from './ScriptToolbar.jsx';
import ScriptNav from './ScriptNav.jsx';
import CoverPage from './CoverPage.jsx';
import ScriptLine from './ScriptLine.jsx';
import ScriptPrint from './ScriptPrint.jsx';
import CastPanel from './CastPanel.jsx';
import CommentsPanel from './CommentsPanel.jsx';
import NoteDialog from '../notes/NoteDialog.jsx';

const PAGE_KEY = 'charcore.scriptPage';
const COVER = 'cover';
const extensionOf = (text) => text.match(/\(.*?\)/g)?.join(' ') ?? '';
const sceneLabel = (s) => (s.heading ? `${s.n}. ${s.heading.text.trim().toUpperCase() || 'UNTITLED SCENE'}` : 'Opening');

function initialPage() {
  const pending = peekPendingScriptFocus(); // jump requested from the character book or notes
  if (pending) return pending.id;
  try {
    return localStorage.getItem(PAGE_KEY) || COVER;
  } catch {
    return COVER;
  }
}

/**
 * Screenplay editor. The side menu picks the cover page or one scene; only that page is shown.
 * Each scene runs from its heading to the next heading in one flat element list.
 * Select text to comment on it; comments become notes (see the Notes page).
 */
export default function ScriptView() {
  const { project, updateScript, addCharacter, snapshot, meta, notify, addNote, updateNote, deleteNote } = useProject();
  const { script, chars, notes, noteSections } = project;
  const els = script.elements;

  /** 'cover', or the id of any element in the scene being shown (normally its heading). */
  const [page, setPage] = useState(initialPage);
  const [currentId, setCurrentId] = useState(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [selection, setSelection] = useState(null); // { id, start, end } of selected text
  const [noteDialog, setNoteDialog] = useState(null); // { mode: 'new', ... } | { mode: 'edit', note }
  const [activeNote, setActiveNote] = useState(null);
  const refs = useRef(new Map());
  const pendingFocus = useRef(null);
  const topRef = useRef(null);

  // ---- derived ----
  const scenes = useMemo(() => splitScenes(els), [els]);
  const { cast } = useMemo(() => analyzeScript(els), [els]);
  const byCue = useMemo(() => new Map(chars.map((c) => [c.name.trim().toUpperCase(), c])), [chars]);
  const pages = useMemo(() => estimatePages(els), [els]);
  const onCover = page === COVER;
  let index = onCover ? -1 : sceneIndexOf(scenes, els, page);
  if (!onCover && index < 0) index = 0; // the scene was deleted
  const scene = onCover ? null : scenes[index];
  const visible = scene ? els.slice(scene.start, scene.end) : [];
  const current = visible.find((e) => e.id === currentId) || null;

  /** Notes per element, with where each highlight currently sits. */
  const notesByEl = useMemo(() => {
    const textOf = new Map(els.map((e) => [e.id, e.text]));
    const map = new Map();
    for (const n of notes) {
      if (!n.elementId || !textOf.has(n.elementId)) continue;
      const range = locateNote(n, textOf.get(n.elementId));
      if (!map.has(n.elementId)) map.set(n.elementId, []);
      map.get(n.elementId).push({ note: n, range });
    }
    return map;
  }, [notes, els]);
  const sceneNotes = visible.flatMap((e) => (notesByEl.get(e.id) || []).map(({ note, range }) => ({ note, located: !!range })));

  const sceneCast = useMemo(
    () =>
      scenes.map((s) => {
        const seen = new Map();
        for (const e of els.slice(s.start, s.end)) {
          if (e.type !== 'character') continue;
          const name = cueName(e.text);
          if (name && !seen.has(name)) seen.set(name, { name: byCue.get(name)?.name ?? name, color: byCue.get(name)?.color ?? '#9a9aa2' });
        }
        return [...seen.values()];
      }),
    [scenes, els, byCue],
  );

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_KEY, page);
    } catch {
      /* ignore */
    }
  }, [page]);

  // ---- focus ----
  const register = useCallback((id, node) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  }, []);

  function place(id, caret, end) {
    const n = refs.current.get(id);
    if (!n) return;
    n.focus();
    const pos = caret === 'end' ? n.value.length : Math.min(caret, n.value.length);
    n.setSelectionRange(pos, end == null ? pos : Math.min(end, n.value.length));
  }
  const focusAfterRender = (id, caret, end) => (pendingFocus.current = { id, caret, end });

  useLayoutEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    pendingFocus.current = null;
    place(p.id, p.caret, p.end);
  });

  useEffect(() => {
    /** Open (and select) what the character book or the notes page asked for. */
    const takeFocus = () => {
      const p = peekPendingScriptFocus();
      if (!p) return;
      clearPendingScriptFocus();
      setPage(p.id);
      focusAfterRender(p.id, p.start ?? 'end', p.end);
      setLayoutTick((t) => t + 1); // force a render so the focus is applied
    };
    takeFocus();
    addEventListener('cc-script-focus', takeFocus);
    const relayout = () => setLayoutTick((t) => t + 1);
    addEventListener('resize', relayout);
    document.fonts?.ready.then(relayout);
    // Printing (button or Ctrl+P) swaps in the full script: cover plus every scene.
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    addEventListener('beforeprint', before);
    addEventListener('afterprint', after);
    let printTimer = 0;
    const printIfRequested = () => {
      if (takePendingPrint()) printTimer = setTimeout(() => print(), 300); // let fonts and layout settle
    };
    printIfRequested();
    addEventListener('cc-print-script', printIfRequested);
    return () => {
      clearTimeout(printTimer);
      removeEventListener('cc-script-focus', takeFocus);
      removeEventListener('resize', relayout);
      removeEventListener('beforeprint', before);
      removeEventListener('afterprint', after);
      removeEventListener('cc-print-script', printIfRequested);
    };
  }, []);

  // ---- page navigation ----
  function showScene(i, focus = true) {
    if (i < 0) {
      setPage(COVER);
    } else {
      const s = scenes[i];
      if (!s) return;
      const first = els[s.start].id;
      setPage(first);
      if (focus) focusAfterRender(first, 'end');
    }
    setSelection(null);
    if (topRef.current && topRef.current.getBoundingClientRect().top < 0) topRef.current.scrollIntoView({ block: 'start' });
  }

  // ---- edits ----
  const setEls = (fn) => updateScript((s) => ({ ...s, elements: fn(s.elements) }));
  const patch = (id, changes) => setEls((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));

  function onText(el, text) {
    const type = detectType(el.type, text);
    patch(el.id, { text, type });
    if (type === 'scene' && el.type !== 'scene') setPage(el.id); // a new heading starts a new scene: follow it
  }

  function changeType(el, to) {
    if (!to || to === el.type) return;
    const text = retypeText(el.text, el.type, to);
    patch(el.id, { type: to, text });
    if (to === 'scene') setPage(el.id);
    focusAfterRender(el.id, to === 'parenthetical' ? text.length - 1 : 'end');
  }

  function insertAfter(el, currentText, next) {
    setEls((list) => {
      const i = list.findIndex((x) => x.id === el.id);
      const copy = [...list];
      copy[i] = { ...copy[i], text: currentText };
      copy.splice(i + 1, 0, next);
      return copy;
    });
    if (next.type === 'scene') setPage(next.id);
    setCurrentId(next.id);
    focusAfterRender(next.id, 0);
  }

  function removeInto(el, prev, carry) {
    const pos = prev.text.length;
    setEls((list) => list.filter((x) => x.id !== el.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + carry } : x)));
    setCurrentId(prev.id);
    focusAfterRender(prev.id, pos);
  }

  /** Insert a new, empty scene in front of element `beforeId` (null = at the very end) and open it. */
  function addSceneBefore(beforeId) {
    const ne = newElement('scene');
    setEls((list) => {
      const at = beforeId ? list.findIndex((e) => e.id === beforeId) : -1;
      return at < 0 ? [...list, ne] : [...list.slice(0, at), ne, ...list.slice(at)];
    });
    setPage(ne.id);
    setCurrentId(ne.id);
    setSelection(null);
    focusAfterRender(ne.id, 0);
  }
  /** "Insert scene after this one" from the scene bar. */
  const addSceneAfterCurrent = () => addSceneBefore(scene ? els[scene.end]?.id ?? null : null);

  function deleteScene() {
    if (!scene) return;
    snapshot(scene.heading ? `Scene ${scene.n} deleted` : 'Opening deleted');
    const { start, end } = scene;
    const remaining = [...els.slice(0, start), ...els.slice(end)];
    setEls(() => (remaining.some((e) => e.type !== 'section') ? remaining : [...remaining, newElement('scene')]));
    const prev = scenes[index - 1];
    setPage(prev ? els[prev.start].id : remaining.find((e) => e.type !== 'section')?.id ?? COVER);
  }

  // ---- outline: sections and scene order ----
  /** Add a section at the end of the script. Returns its id so the menu can start renaming it. */
  function addSection() {
    const sec = newElement('section', 'New section');
    setEls((list) => [...list, sec]);
    return sec.id;
  }
  const renameSection = (id, name) => name.trim() && patch(id, { text: name.trim() });
  const deleteSection = (id) => {
    snapshot('Section removed (its scenes stay)');
    setEls((list) => list.filter((e) => e.id !== id));
  };
  const reorder = (fn) => setEls((list) => fn(list));

  // ---- character suggestions ----
  function suggestionsFor(el) {
    if (el.type !== 'character') return [];
    const q = cueName(el.text);
    return chars
      .filter((c) => {
        const n = c.name.trim().toUpperCase();
        return n.startsWith(q) && n !== q;
      })
      .slice(0, 8);
  }

  function pickCharacter(el, c) {
    const ext = extensionOf(el.text);
    patch(el.id, { text: c.name.toUpperCase() + (ext ? ' ' + ext : '') });
    focusAfterRender(el.id, 'end');
  }

  // ---- comments ----
  function onSelectText(el, start, end) {
    setSelection(end > start ? { id: el.id, start, end } : null);
  }

  /** Who a comment on this element is most likely about: the speaking character, if they're in the book. */
  function guessTarget(el) {
    const i = visible.findIndex((x) => x.id === el.id);
    for (let j = i; j >= 0; j--) {
      const e = visible[j];
      if (e.type === 'character') {
        const c = byCue.get(cueName(e.text));
        return c ? { type: 'character', id: c.id } : { type: 'none' };
      }
      if (e.type !== 'dialogue' && e.type !== 'parenthetical') break;
    }
    return { type: 'none' };
  }

  function startComment() {
    if (!selection) {
      notify('Select some script text first, then choose Comment.');
      return;
    }
    const el = els.find((e) => e.id === selection.id);
    if (!el) return;
    setNoteDialog({ mode: 'new', ...selection, quote: el.text.slice(selection.start, selection.end), target: guessTarget(el) });
  }

  function goToNote(note) {
    setActiveNote(note.id);
    const range = notesByEl.get(note.elementId)?.find((x) => x.note.id === note.id)?.range;
    if (range) place(note.elementId, range.start, range.end);
    else place(note.elementId, 'end');
  }

  function onKeyDown(e, el) {
    const { selectionStart: s, selectionEnd: t, value } = e.currentTarget;
    const i = visible.findIndex((x) => x.id === el.id);
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      startComment();
      return;
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      showScene(index + (e.key === 'ArrowUp' ? -1 : 1));
      return;
    }
    if (mod && /^[1-6]$/.test(e.key)) {
      e.preventDefault();
      changeType(el, TYPE_KEYS[+e.key - 1]);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const blank = !value.replace(el.type === 'parenthetical' ? /[()\s]/g : /\s/g, '');
      if (blank && el.type !== 'action' && el.type !== 'scene') {
        changeType(el, 'action'); // Enter on an empty element: back to action
        return;
      }
      let keep = value.slice(0, s);
      let rest = value.slice(t);
      if (el.type === 'parenthetical') {
        keep = value;
        rest = '';
      }
      if (el.type === 'character' && s === value.length) {
        const best = cueName(value) && suggestionsFor(el)[0];
        if (best) {
          const ext = extensionOf(value);
          keep = best.name.toUpperCase() + (ext ? ' ' + ext : '');
        }
      }
      insertAfter(el, keep, newElement(nextType(el.type), rest));
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      changeType(el, cycleType(el.type, e.shiftKey ? -1 : 1));
      return;
    }

    // Within the scene only: the previous element of another scene isn't on the page.
    if (e.key === 'Backspace' && i > 0) {
      const emptyParen = el.type === 'parenthetical' && value === '()';
      if (emptyParen || (s === 0 && t === 0)) {
        e.preventDefault();
        removeInto(el, visible[i - 1], emptyParen ? '' : value);
      }
      return;
    }

    if (e.key === 'ArrowUp' && s === 0 && t === 0 && i > 0) {
      e.preventDefault();
      place(visible[i - 1].id, 'end');
    } else if (e.key === 'ArrowDown' && s === value.length && t === value.length && i < visible.length - 1) {
      e.preventDefault();
      place(visible[i + 1].id, 0);
    }
  }

  function download() {
    const name = exportName(meta.name, EXPORT_KINDS.script.kind, EXPORT_KINDS.script.ext);
    downloadFile(scriptBlob(script), name);
    notify(`Downloaded ${name}`);
  }

  const prevLabel = index === 0 ? 'Cover page' : scenes[index - 1] && sceneLabel(scenes[index - 1]);
  const nextScene = onCover ? scenes[0] : scenes[index + 1];

  return (
    <div className="band script-band">
      <div className="wrap script-desk">
        <aside className="script-side">
          <ScriptNav
            title={script.title}
            elements={els}
            scenes={scenes}
            sceneCast={sceneCast}
            onCover={onCover}
            currentKey={scene?.key}
            onSelectCover={() => showScene(-1)}
            onSelectScene={(i) => showScene(i)}
            onAddScene={addSceneBefore}
            onAddSection={addSection}
            onRenameSection={renameSection}
            onDeleteSection={deleteSection}
            onMoveScene={(key, dir) => reorder((list) => moveScene(list, key, dir))}
            onMoveSection={(key, dir) => reorder((list) => moveSection(list, key, dir))}
            onDrop={(key, before) => reorder((list) => dropBlock(list, key, before))}
          />
          {!onCover && (
            <CommentsPanel
              items={sceneNotes}
              total={notes.length}
              chars={chars}
              sections={noteSections}
              activeId={activeNote}
              onGo={goToNote}
              onEdit={(note) => setNoteDialog({ mode: 'edit', note })}
            />
          )}
          <CastPanel cast={cast} byCue={byCue} onAdd={(name) => addCharacter({ name: titleCase(name) })} />
        </aside>

        <div className="script-main" ref={topRef}>
          <ScriptToolbar
            currentType={current?.type}
            onType={(to) => current && changeType(current, to)}
            onNewScene={() => addSceneBefore(null)}
            onComment={startComment}
            canComment={!!selection}
            onPrint={() => print()}
            onDownload={download}
            pages={pages}
          />

          {printing ? (
            <ScriptPrint script={script} />
          ) : onCover ? (
            <CoverPage script={script} onChange={(p) => updateScript((s) => ({ ...s, ...p }))} />
          ) : (
            <>
              <div className="scene-bar">
                <span className="scene-pos">
                  {scene.heading ? `Scene ${scene.n} of ${scenes.filter((x) => x.heading).length}` : 'Opening'}
                  {sectionOf(scene, els) && <small className="scene-section">{sectionOf(scene, els)}</small>}
                </span>
                <span className="scene-bar-end">
                  <button onClick={() => showScene(index - 1)} aria-label="Previous page">‹ Previous</button>
                  <button disabled={!nextScene} onClick={() => showScene(index + 1)} aria-label="Next scene">Next ›</button>
                  <button onClick={addSceneAfterCurrent}>+ Insert scene after this</button>
                  <button className="danger" onClick={deleteScene}>{scene.heading ? 'Delete scene' : 'Delete opening'}</button>
                </span>
              </div>
              <div
                className="paper"
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  e.preventDefault(); // clicking the margin continues the scene's last line
                  place(visible[visible.length - 1].id, 'end');
                }}
              >
                <div className="script-body">
                  {visible.map((el) => (
                    <ScriptLine
                      key={el.id}
                      el={el}
                      sceneNo={scene.heading?.id === el.id ? scene.n : null}
                      cueColor={el.type === 'character' ? byCue.get(cueName(el.text))?.color : null}
                      active={el.id === currentId}
                      suggestions={el.id === currentId ? suggestionsFor(el) : []}
                      layoutTick={layoutTick}
                      register={register}
                      onText={onText}
                      onKeyDown={onKeyDown}
                      onFocus={setCurrentId}
                      onPick={pickCharacter}
                      marks={(notesByEl.get(el.id) || [])
                        .filter((x) => x.range)
                        .map(({ note, range }) => ({ id: note.id, ...range, color: targetColor(note.target, chars), active: note.id === activeNote }))}
                      hasSelection={selection?.id === el.id}
                      onSelectText={onSelectText}
                      onComment={startComment}
                      onNotesClick={(e) => {
                        const first = notesByEl.get(e.id)?.[0]?.note;
                        if (first) goToNote(first);
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {!printing && (
            <div className="page-turn">
              {!onCover ? <button onClick={() => showScene(index - 1)}>‹ {prevLabel}</button> : <span />}
              {nextScene ? (
                <button className="pri" onClick={() => showScene(onCover ? 0 : index + 1)}>{sceneLabel(nextScene)} ›</button>
              ) : (
                <button onClick={() => addSceneBefore(null)}>+ Add the next scene</button>
              )}
            </div>
          )}
        </div>
      </div>

      {noteDialog?.mode === 'new' && (
        <NoteDialog
          title="Comment"
          quote={noteDialog.quote}
          initialTarget={noteDialog.target}
          onClose={() => setNoteDialog(null)}
          onSave={({ text, target }) => {
            const n = addNote({ quote: noteDialog.quote, elementId: noteDialog.id, start: noteDialog.start, end: noteDialog.end, text, target });
            setActiveNote(n.id);
            setSelection(null);
            setNoteDialog(null);
            notify('Comment added. Find it any time on the Notes page.');
          }}
        />
      )}
      {noteDialog?.mode === 'edit' && (
        <NoteDialog
          title="Edit comment"
          quote={noteDialog.note.quote}
          initialText={noteDialog.note.text}
          initialTarget={noteDialog.note.target}
          onClose={() => setNoteDialog(null)}
          onSave={(patchNote) => {
            updateNote(noteDialog.note.id, patchNote);
            setNoteDialog(null);
          }}
          onDelete={() => {
            deleteNote(noteDialog.note.id);
            setNoteDialog(null);
          }}
        />
      )}
    </div>
  );
}

/** Name of the section a scene falls under, if any. */
function sectionOf(scene, elements) {
  for (let j = scene.start - 1; j >= 0; j--) if (elements[j].type === 'section') return elements[j].text;
  return '';
}
