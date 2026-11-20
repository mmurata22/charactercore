import { useProject } from '../../state/ProjectContext.jsx';

export default function Toast() {
  const { toast, undo } = useProject();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.label}</span>
      {toast.undo && <button onClick={undo}>Undo</button>}
    </div>
  );
}
