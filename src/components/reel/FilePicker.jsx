/** A button-styled label wrapping a hidden multi-file video input. */
export default function FilePicker({ label, primary, onFiles }) {
  return (
    <label className={primary ? 'btn pri' : 'btn'}>
      {label}
      <input
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );
}
