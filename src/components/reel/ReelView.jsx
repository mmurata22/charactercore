import { useEffect, useRef, useState } from 'react';
import { useProject } from '../../state/ProjectContext.jsx';
import { useMonitorPlayer } from '../../hooks/useMonitorPlayer';
import { PALETTE, UNKNOWN_CHAR } from '../../lib/constants';
import { uid } from '../../lib/format';
import { captureThumb } from '../../lib/thumbnail';
import ReelHeader from './ReelHeader.jsx';
import Monitor from './Monitor.jsx';
import Transport from './Transport.jsx';
import MarkBar from './MarkBar.jsx';
import MonitorStatus from './MonitorStatus.jsx';
import ClipForm from './ClipForm.jsx';
import FootagePanel from './FootagePanel.jsx';
import CharacterGrid from './CharacterGrid.jsx';
import ReelStrip from './ReelStrip.jsx';
import FinishedReels from './FinishedReels.jsx';
import CharacterDialog from '../modals/CharacterDialog.jsx';
import CompareModal from '../modals/CompareModal.jsx';
import ExportModal from '../modals/ExportModal.jsx';

/** The clip being cut or edited: which footage, its in/out marks, and a thumbnail. */
const EMPTY_EDITOR = { src: null, in: null, out: null, thumb: null, editing: null };

export default function ReelView({ active, nav }) {
  const { project, setProject, snapshot, revision, addCharacter, updateCharacter, deleteCharacter: removeCharacter, media } =
    useProject();
  const { chars, clips } = project;
  const { sources, addFiles } = media; // footage belongs to the open project

  const [ed, setEd] = useState(EMPTY_EDITOR);
  const edRef = useRef(ed);
  edRef.current = ed;
  const player = useMonitorPlayer({ sources, getEditor: () => edRef.current });

  const [formChar, setFormChar] = useState('');
  const [caption, setCaption] = useState('');
  const [msg, setMsg] = useState('');
  const [filterState, setFilter] = useState('all');
  const [sel, setSel] = useState(() => new Set());
  const [dragging, setDragging] = useState(false);
  const [dialog, setDialog] = useState(null); // { type: 'char', id } | { type: 'compare' | 'export' | 'project' }
  const monRef = useRef(null);
  const captionRef = useRef(null);

  // ---- derived ----
  const charOf = (id) => chars.find((c) => c.id === id) || UNKNOWN_CHAR;
  const hasChar = (id) => chars.some((c) => c.id === id);
  const filter = filterState !== 'all' && !hasChar(filterState) ? 'all' : filterState;
  const visible = clips.filter((k) => filter === 'all' || k.char === filter);
  const selected = clips.filter((k) => sel.has(k.id));
  const charValue = hasChar(formChar) ? formChar : chars[0]?.id ?? '';
  const reeling = !!player.reelPos;

  // ---- footage ----
  function loadSource(name) {
    player.stopReel();
    setEd((e) => ({ ...e, src: name, ...(e.editing ? {} : { in: null, out: null, thumb: null }) }));
    player.setVideo(sources.get(name));
    setMsg('');
  }

  function handleFiles(list) {
    const names = addFiles(list);
    if (!names) {
      setMsg('Those files did not look like videos.');
      return;
    }
    const e = edRef.current;
    if (!e.src || !sources.has(e.src)) loadSource(names[0]);
  }

  // ---- cutting ----
  function ready() {
    if (player.isReeling()) {
      setMsg('Stop the reel to cut clips.');
      return false;
    }
    if (!ed.src || !sources.has(ed.src)) {
      setMsg('Add or load footage first.');
      return false;
    }
    return true;
  }

  function markIn() {
    if (!ready()) return;
    const v = player.videoRef.current;
    const t = +v.currentTime.toFixed(2);
    const thumb = captureThumb(v);
    setEd((e) => ({ ...e, in: t, out: e.out != null && e.out <= t ? null : e.out, thumb }));
    setMsg('');
  }

  function markOut() {
    if (!ready()) return;
    const t = +player.videoRef.current.currentTime.toFixed(2);
    if (ed.in == null || t <= ed.in) {
      setMsg('Mark out has to come after mark in.');
      return;
    }
    setEd((e) => ({ ...e, out: t }));
    setMsg('');
  }

  function previewCut() {
    if (!ready()) return;
    if (ed.in == null || ed.out == null) {
      setMsg('Mark in and out first.');
      return;
    }
    player.previewCut(ed.in);
  }

  function togglePlay() {
    if (!player.hasFootage()) {
      setMsg('Add footage first.');
      return;
    }
    player.togglePlay();
  }

  function resetEditor() {
    setEd((e) => ({ ...e, editing: null, in: null, out: null, thumb: null }));
    setCaption('');
  }

  function saveClip() {
    const ch = charValue;
    const cap = caption.trim();
    if (!hasChar(ch)) {
      setMsg('Create a character first.');
      openChar();
      return;
    }
    if (!ed.src) return setMsg('Load footage first.');
    if (ed.in == null || ed.out == null) return setMsg('Mark in and mark out to set the clip.');
    if (!cap) {
      setMsg('Write what this moment tells you about them.');
      captionRef.current?.focus();
      return;
    }
    const fields = { char: ch, cap, src: ed.src, in: ed.in, out: ed.out };
    setProject((p) => ({
      ...p,
      clips: ed.editing
        ? p.clips.map((k) => (k.id === ed.editing ? { ...k, ...fields, ...(ed.thumb ? { thumb: ed.thumb } : {}) } : k))
        : [...p.clips, { id: uid(), ...fields, thumb: ed.thumb }],
    }));
    const wasEditing = ed.editing;
    resetEditor();
    setMsg(wasEditing ? 'Clip updated.' : 'Clip added to the end of the reel.');
  }

  function editClip(id) {
    const k = clips.find((x) => x.id === id);
    if (!k) return;
    player.stopReel();
    setEd({ editing: id, src: k.src, in: k.in, out: k.out, thumb: null });
    setFormChar(k.char);
    setCaption(k.cap);
    setMsg('');
    if (sources.has(k.src)) {
      player.setVideo(sources.get(k.src), () => {
        player.videoRef.current.currentTime = k.in;
      });
    } else player.showCard(k);
    monRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteClip() {
    snapshot('Clip deleted');
    setProject((p) => ({ ...p, clips: p.clips.filter((k) => k.id !== ed.editing) }));
    resetEditor();
  }

  function moveClip(id, dir) {
    const i = visible.findIndex((k) => k.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= visible.length) return;
    const a = clips.indexOf(visible[i]);
    const b = clips.indexOf(visible[j]);
    setProject((p) => {
      const next = [...p.clips];
      [next[a], next[b]] = [next[b], next[a]];
      return { ...p, clips: next };
    });
    requestAnimationFrame(() =>
      document.querySelector(`[data-act="${dir < 0 ? 'left' : 'right'}"][data-id="${id}"]`)?.focus(),
    );
  }

  function toggleSelected(id, on) {
    setSel((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // ---- characters ----
  function openChar(id = null) {
    setDialog({ type: 'char', id });
  }

  function saveCharacter(fields) {
    if (dialog.id) updateCharacter(dialog.id, fields);
    else setFormChar(addCharacter(fields).id);
    setDialog(null);
  }

  function deleteCharacter() {
    removeCharacter(dialog.id);
    setDialog(null);
    resetEditor();
  }


  function playReel() {
    player.playReel(visible);
    monRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openCompare() {
    player.stopReel();
    setDialog({ type: 'compare' });
  }

  function openExport() {
    player.stopReel();
    player.pause();
    setDialog({ type: 'export' });
  }

  // ---- keyboard ----
  function onKey(e) {
    if (e.key === 'Escape') {
      if (dialog) return; // the open dialog handles its own Escape
      if (nav.open && !nav.wide) nav.close();
      else player.stopReel();
      return;
    }
    if (e.target.closest?.('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (dialog || !active || document.querySelector('.modal')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (k === 'i') markIn();
    else if (k === 'o') markOut();
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && player.hasFootage()) {
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.1;
      player.seekBy(e.key === 'ArrowLeft' ? -step : step, false);
    }
  }

  // Latest handlers for document-level listeners registered once.
  const handlers = useRef({});
  handlers.current = { onKey, handleFiles };

  useEffect(() => {
    const keydown = (e) => handlers.current.onKey(e);
    const over = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const drop = (e) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer?.files?.length) handlers.current.handleFiles(e.dataTransfer.files);
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('dragenter', over);
    document.addEventListener('dragover', over);
    document.addEventListener('dragleave', leave);
    document.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('dragenter', over);
      document.removeEventListener('dragover', over);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('drop', drop);
    };
  }, []);

  // Leaving the reel view stops playback.
  const playerRef = useRef(player);
  playerRef.current = player;
  useEffect(() => {
    if (!active) {
      playerRef.current.stopReel();
      playerRef.current.pause();
    }
  }, [active]);

  // After an undo, drop any half-edited clip tied to the old project.
  useEffect(() => {
    if (revision) resetEditor();
  }, [revision]);

  return (
    <>
      <div hidden={!active}>
        <ReelHeader
          canPlay={visible.length > 0}
          canExport={clips.length > 0}
          onPlay={playReel}
          onExport={openExport}
        />
        <main>
          <section className="band" style={{ paddingTop: 4 }}>
            <div className="wrap desk">
              <div>
                <Monitor
                  containerRef={monRef}
                  videoRef={player.videoRef}
                  screen={player.screen}
                  dragging={dragging}
                  charOf={charOf}
                  onFiles={handleFiles}
                />
                <Transport
                  videoRef={player.videoRef}
                  markIn={ed.in}
                  markOut={ed.out}
                  showRange={!reeling && sources.has(ed.src)}
                  onTogglePlay={togglePlay}
                />
                <MarkBar
                  onMarkIn={markIn}
                  onMarkOut={markOut}
                  onPreview={previewCut}
                  onNudge={(dt) => player.hasFootage() && player.seekBy(dt, true)}
                />
                <MonitorStatus
                  reelPos={player.reelPos}
                  src={ed.src}
                  hasSource={sources.has(ed.src)}
                  onSkip={player.nextClip}
                  onStop={player.stopReel}
                />
              </div>
              <aside>
                <ClipForm
                  chars={chars}
                  charValue={charValue}
                  onCharChange={setFormChar}
                  caption={caption}
                  onCaptionChange={setCaption}
                  captionRef={captionRef}
                  markIn={ed.in}
                  markOut={ed.out}
                  editing={!!ed.editing}
                  msg={msg}
                  onNewChar={() => openChar()}
                  onSave={saveClip}
                  onDelete={deleteClip}
                  onCancel={() => {
                    resetEditor();
                    setMsg('');
                  }}
                />
                <FootagePanel sources={sources} clips={clips} current={ed.src} onFiles={handleFiles} onLoad={loadSource} />
              </aside>
            </div>
          </section>

          <CharacterGrid chars={chars} clips={clips} onOpen={openChar} />

          <ReelStrip
            chars={chars}
            clips={visible}
            filter={filter}
            onFilter={setFilter}
            charOf={charOf}
            sources={sources}
            editingId={ed.editing}
            sel={sel}
            onEdit={editClip}
            onMove={moveClip}
            onToggle={toggleSelected}
            onPlay={playReel}
            selectedCount={selected.length}
            onCompare={openCompare}
          />

          <FinishedReels onExport={openExport} canExport={clips.length > 0} />
        </main>
      </div>

      {dialog?.type === 'char' && (
        <CharacterDialog
          character={dialog.id ? charOf(dialog.id) : null}
          defaultColor={PALETTE[chars.length % PALETTE.length]}
          onSave={saveCharacter}
          onDelete={deleteCharacter}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'compare' && (
        <CompareModal clips={selected} charOf={charOf} sources={sources} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'export' && (
        <ExportModal
          clips={clips}
          chars={chars}
          charOf={charOf}
          sources={sources}
          initialWhich={filter}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
