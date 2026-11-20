import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { blankProject, normalizeProject, summarizeProject } from '../lib/project';
import { createCharacter } from '../lib/characters';
import { putProjectRecord, writeLive } from '../lib/projectStore';
import { PROJECT_EXT, PROJECT_MIME, buildProjectFile } from '../lib/projectFile';
import { exportName } from '../lib/exports';
import { downloadFile } from '../lib/download';
import { markProjectOpen } from '../lib/session';
import { normalizeMaps } from '../lib/maps';
import { newNote, newSection, normalizeNotes } from '../lib/notes';
import { useAutosave } from '../hooks/useAutosave';
import { useSources } from '../hooks/useSources';
import { useReelLibrary } from '../hooks/useReelLibrary';
import { useImageLibrary } from '../hooks/useImageLibrary';

const ProjectContext = createContext(null);
const SAVE_DELAY_MS = 400;

/**
 * The open project: its data (characters, clips, script), its name, its loaded footage.
 * Persists every change to browser storage, keeps autosaves, saves to a single project
 * file, and offers single-level undo through a toast.
 */
export function ProjectProvider({ record, initialMedia, onExit, children }) {
  const [project, setProject] = useState(() => normalizeProject(record.data) || blankProject());
  const [meta, setMeta] = useState(() => ({
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    includeFootage: record.includeFootage ?? true,
    includeReels: record.includeReels ?? true,
  }));
  const [toast, setToast] = useState(null); // { label, undo }
  const [revision, setRevision] = useState(0);
  const [storageError, setStorageError] = useState('');
  const [savedFile, setSavedFile] = useState(null); // { name, at } of the last project-file save
  const media = useSources();
  const reels = useReelLibrary(record.id);
  const images = useImageLibrary(record.id);
  const projectRef = useRef(project);
  const metaRef = useRef(meta);
  const undoRef = useRef(null);
  const toastTimer = useRef(0);
  const fileHandle = useRef(null);
  projectRef.current = project;
  metaRef.current = meta;

  useEffect(() => {
    markProjectOpen(record.id);
    if (initialMedia?.length) media.addFiles(initialMedia); // footage that came inside a project file
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- persistence to browser storage ----
  const persist = useCallback(() => {
    const now = Date.now();
    const p = projectRef.current;
    const m = metaRef.current;
    writeLive(m.id, p, now);
    return putProjectRecord({ ...m, updatedAt: now, summary: summarizeProject(p), data: p }).then(
      () => setStorageError(''),
      () => setStorageError('Couldn’t save to browser storage. Save the project to a file to be safe.'),
    );
  }, []);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(persist, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [project, meta, persist]);

  useEffect(() => {
    const onVisibility = () => document.visibilityState === 'hidden' && persist();
    addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persist]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ---- toast + undo ----
  const showToast = useCallback((label, undo, ms) => {
    setToast({ label, undo });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  const notify = useCallback((label) => showToast(label, false, 4000), [showToast]);

  /** Remember the current project so the next destructive change can be undone. Call before changing. */
  const snapshot = useCallback(
    (label) => {
      undoRef.current = JSON.stringify(projectRef.current);
      showToast(label, true, 6000);
    },
    [showToast],
  );

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    setProject(JSON.parse(undoRef.current));
    undoRef.current = null;
    setToast(null);
    setRevision((r) => r + 1);
  }, []);

  // ---- project-level ----
  const renameProject = useCallback((name) => setMeta((m) => ({ ...m, name: name.trim() || 'Untitled project' })), []);
  const setSaveOptions = useCallback(
    (includeFootage, includeReels) => setMeta((m) => ({ ...m, includeFootage, includeReels })),
    [],
  );

  const closeProject = useCallback(async () => {
    await persist();
    media.releaseAll();
    markProjectOpen(null);
    onExit();
  }, [persist, media, onExit]);

  /**
   * Save the whole project (and optionally its footage) to one .ccproj file.
   * Where the browser allows it, the first save picks a location and later saves overwrite
   * that same file; otherwise each save downloads a uniquely named file.
   */
  const saveToFile = useCallback(
    async ({ includeFootage = metaRef.current.includeFootage, includeReels = metaRef.current.includeReels, saveAs = false } = {}) => {
      const m = metaRef.current;
      const suggested = exportName(m.name, 'project', PROJECT_EXT);
      const footage = includeFootage ? [...media.files.values()] : [];
      setSaveOptions(includeFootage, includeReels);
      try {
        let handle = saveAs ? null : fileHandle.current;
        if (!handle && window.showSaveFilePicker) {
          // Ask first, while the click still counts as a user gesture.
          handle = await window.showSaveFilePicker({
            suggestedName: suggested,
            types: [{ description: 'charactercore project', accept: { [PROJECT_MIME]: ['.' + PROJECT_EXT] } }],
          });
          fileHandle.current = handle;
        }
        const finished = [];
        if (includeReels) {
          for (const r of reels.list) {
            const full = await reels.get(r.id);
            if (full) {
              const { id, projectId, blob: video, ...info } = full;
              finished.push({ ...info, blob: video });
            }
          }
        }
        // Moodboard images always go in: they're part of the character book.
        const boardImages = [];
        const used = new Set(projectRef.current.chars.flatMap((c) => c.moodboard.map((x) => x.imageId)));
        for (const imageId of used) {
          const rec = await images.get(imageId);
          if (rec) boardImages.push({ imageId, blob: rec.blob });
        }
        const blob = buildProjectFile({ meta: m, data: projectRef.current, media: footage, reels: finished, images: boardImages });
        let name = suggested;
        if (handle) {
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
          name = handle.name;
        } else downloadFile(blob, suggested);
        await persist();
        setSavedFile({ name, at: Date.now() });
        notify(handle ? `Saved to ${name}` : `Downloaded ${name}`);
        return { ok: true, name };
      } catch (e) {
        if (e?.name === 'AbortError') return { cancelled: true };
        return { error: 'Couldn’t save the file. Try “Save as a new file”.' };
      }
    },
    [media, reels, images, persist, notify, setSaveOptions],
  );

  // ---- characters (shared by reel, script and book) ----
  const addCharacter = useCallback((fields) => {
    const c = createCharacter(fields, projectRef.current.chars.length);
    setProject((p) => ({ ...p, chars: [...p.chars, c] }));
    return c;
  }, []);

  const updateCharacter = useCallback((id, patch) => {
    setProject((p) => ({ ...p, chars: p.chars.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  /** Removes the character, their reel clips and their places on maps (undoable). Script text is left alone. */
  const deleteCharacter = useCallback(
    (id) => {
      const c = projectRef.current.chars.find((x) => x.id === id);
      if (!c) return;
      snapshot(`${c.name} deleted`);
      setProject((p) => {
        const chars = p.chars.filter((x) => x.id !== id);
        const ids = new Set(chars.map((x) => x.id));
        return {
          ...p,
          chars,
          clips: p.clips.filter((k) => k.char !== id),
          maps: normalizeMaps(p.maps, ids),
          notes: normalizeNotes(p.notes, ids, new Set(p.noteSections.map((s) => s.id))), // their notes become unfiled
        };
      });
    },
    [snapshot],
  );

  const updateScript = useCallback((fn) => setProject((p) => ({ ...p, script: fn(p.script) })), []);

  /** Change one map: fn(map) → map. */
  const updateMap = useCallback(
    (mapId, fn) => setProject((p) => ({ ...p, maps: p.maps.map((m) => (m.id === mapId ? fn(m) : m)) })),
    [],
  );
  const setMaps = useCallback((fn) => setProject((p) => ({ ...p, maps: fn(p.maps) })), []);

  // ---- notes ----
  const addNote = useCallback((fields) => {
    const n = newNote(fields);
    setProject((p) => ({ ...p, notes: [...p.notes, n] }));
    return n;
  }, []);
  const updateNote = useCallback((id, patch) => {
    setProject((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)) }));
  }, []);
  const deleteNote = useCallback(
    (id) => {
      snapshot('Note deleted');
      setProject((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) }));
    },
    [snapshot],
  );
  /** Author-made note sections. Removing one leaves its notes unfiled. */
  const addNoteSection = useCallback((name) => {
    const s = newSection(name.trim() || 'Untitled section');
    setProject((p) => ({ ...p, noteSections: [...p.noteSections, s] }));
    return s;
  }, []);
  const renameNoteSection = useCallback((id, name) => {
    setProject((p) => ({ ...p, noteSections: p.noteSections.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)) }));
  }, []);
  const deleteNoteSection = useCallback(
    (id) => {
      snapshot('Section deleted');
      setProject((p) => {
        const noteSections = p.noteSections.filter((s) => s.id !== id);
        return {
          ...p,
          noteSections,
          notes: normalizeNotes(p.notes, new Set(p.chars.map((c) => c.id)), new Set(noteSections.map((s) => s.id))),
        };
      });
    },
    [snapshot],
  );

  // ---- autosave ----
  const applyRestore = useCallback(
    (json) => {
      let d = null;
      try {
        d = normalizeProject(JSON.parse(json));
      } catch {
        /* corrupt entry */
      }
      if (!d) return false;
      snapshot('Autosave restored');
      setProject(d);
      setRevision((r) => r + 1);
      return true;
    },
    [snapshot],
  );
  const autosave = useAutosave(record.id, project, applyRestore);

  const value = {
    project, setProject, snapshot, undo, toast, notify, revision,
    addCharacter, updateCharacter, deleteCharacter, updateScript, updateMap, setMaps,
    addNote, updateNote, deleteNote, addNoteSection, renameNoteSection, deleteNoteSection,
    autosave, meta, renameProject, media, reels, images, saveToFile, savedFile,
    hasFileHandle: !!fileHandle.current, closeProject, storageError,
  };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
