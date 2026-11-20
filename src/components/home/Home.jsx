import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../../lib/constants';
import { blankProject, summarizeProject } from '../../lib/project';
import {
  deleteProjectRecord, getProjectRecord, listProjects, migrateLegacy, newProjectId, newProjectRecord, putProjectRecord,
} from '../../lib/projectStore';
import { deleteProjectAutosaves } from '../../lib/autosaveStore';
import { copyProjectReels, deleteProjectReels, newReelId, putReel } from '../../lib/reelStore';
import { copyProjectImages, deleteProjectImages, putImageRecord } from '../../lib/imageStore';
import { PROJECT_EXT, readProjectFile } from '../../lib/projectFile';
import { crashedProjectId } from '../../lib/session';
import ProjectCard from './ProjectCard.jsx';

/** The home screen: pick, create or open a project file. Nothing else is reachable from here. */
export default function Home({ onOpen, openError }) {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(openError || '');
  const [newName, setNewName] = useState('');
  const [conflict, setConflict] = useState(null); // { loaded, existing } when an opened file matches a stored project
  const fileRef = useRef(null);

  async function refresh() {
    try {
      await migrateLegacy();
      setProjects(await listProjects());
    } catch (e) {
      setError(e?.message?.startsWith('Close') ? e.message : 'This browser is blocking storage, so projects can’t be kept here.');
      setProjects([]);
    }
  }
  useEffect(() => {
    document.title = APP_NAME;
    refresh();
  }, []);

  async function create(e) {
    e.preventDefault();
    const name = newName.trim() || 'Untitled project';
    const data = blankProject();
    data.script.title = name;
    const rec = newProjectRecord(name, data);
    await putProjectRecord(rec);
    onOpen(rec.id);
  }

  async function rename(id, name) {
    const rec = await getProjectRecord(id);
    if (!rec) return;
    await putProjectRecord({ ...rec, name: name.trim() || rec.name, updatedAt: Date.now() });
    refresh();
  }

  async function duplicate(id) {
    const rec = await getProjectRecord(id);
    if (!rec) return;
    const copy = { ...newProjectRecord(`${rec.name} (copy)`, rec.data), includeFootage: rec.includeFootage, includeReels: rec.includeReels };
    await putProjectRecord(copy);
    await copyProjectReels(id, copy.id);
    await copyProjectImages(id, copy.id);
    refresh();
  }

  async function remove(id) {
    await deleteProjectRecord(id);
    await deleteProjectAutosaves(id);
    await deleteProjectReels(id);
    await deleteProjectImages(id);
    refresh();
  }

  async function openFile(file) {
    setError('');
    try {
      const loaded = await readProjectFile(file);
      const existing = loaded.meta.id ? await getProjectRecord(loaded.meta.id) : null;
      if (existing) setConflict({ loaded, existing });
      else await importLoaded(loaded, 'as-is');
    } catch (e) {
      setError(e.message || 'That file couldn’t be opened.');
    }
  }

  /** mode: 'as-is' (keep the file's id; replaces a stored copy) or 'copy' (new project alongside). */
  async function importLoaded({ meta, data, media, reels, images = [] }, mode) {
    const id = mode === 'copy' || !meta.id ? newProjectId() : meta.id;
    const name = (meta.name || 'Opened project') + (mode === 'copy' ? ' (copy)' : '');
    const rec = { ...newProjectRecord(name, data, id), createdAt: meta.createdAt || Date.now(), summary: summarizeProject(data) };
    await putProjectRecord(rec);
    // Finished reels from the file replace any stored for this project.
    if (mode !== 'copy') await deleteProjectReels(id);
    for (const r of reels) {
      const blob = new Blob([await r.blob.arrayBuffer()], { type: r.mime || 'video/webm' });
      await putReel({ ...r, id: newReelId(), projectId: id, blob });
    }
    for (const img of images) {
      await putImageRecord(id, img.imageId, new Blob([await img.blob.arrayBuffer()], { type: img.blob.type }));
    }
    setConflict(null);
    onOpen(id, media);
  }

  const crashed = crashedProjectId();

  return (
    <div className="home">
      <header className="home-head">
        <img src="/icon.svg" alt="" width="64" height="64" />
        <div>
          <h1 className="slate">{APP_NAME}</h1>
          <p>Choose a project to work on. Each one has its own characters, reel, script and autosaves.</p>
        </div>
      </header>

      {error && <p className="home-error" role="alert">{error}</p>}

      <section className="home-actions">
        <form className="home-new panel" onSubmit={create}>
          <label className="f" htmlFor="newName">New project</label>
          <div className="selrow">
            <input id="newName" type="text" maxLength={80} autoComplete="off" placeholder="Title of the movie, book or play"
              value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="pri" type="submit">Create</button>
          </div>
        </form>
        <div className="home-open panel">
          <span className="f">Have a project file?</span>
          <button onClick={() => fileRef.current?.click()}>Open a .{PROJECT_EXT} file…</button>
          <input ref={fileRef} type="file" accept={`.${PROJECT_EXT},.json`} hidden
            onChange={(e) => {
              if (e.target.files[0]) openFile(e.target.files[0]);
              e.target.value = '';
            }} />
        </div>
      </section>

      <section>
        <h2>Your projects</h2>
        {projects === null ? (
          <p className="home-muted">Loading…</p>
        ) : projects.length ? (
          <div className="home-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                crashed={p.id === crashed}
                onOpen={() => onOpen(p.id)}
                onRename={(name) => rename(p.id, name)}
                onDuplicate={() => duplicate(p.id)}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="home-muted">No projects yet. Name your first one above.</p>
        )}
        <p className="home-muted home-note">
          Projects are kept in this browser. Use Save inside a project to keep everything, footage included, in one
          file you can back up or move to another computer.
        </p>
      </section>

      {conflict && (
        <div className="modal">
          <div className="sheet narrow">
            <div className="hd"><h2>This project is already here</h2></div>
            <p className="lead">
              “{conflict.existing.name}” is already in this browser (last edited{' '}
              {new Date(conflict.existing.updatedAt).toLocaleString()}). Replace it with the file’s version, or open
              the file as a separate copy?
            </p>
            <div className="actions">
              <button className="pri" onClick={() => importLoaded(conflict.loaded, 'as-is')}>Replace with the file</button>
              <button onClick={() => importLoaded(conflict.loaded, 'copy')}>Open as a copy</button>
              <button onClick={() => setConflict(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
