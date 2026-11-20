/** Trigger a browser download of `blob` (or an existing object URL) as `fileName`. */
export function downloadFile(blobOrUrl, fileName) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (url !== blobOrUrl) setTimeout(() => URL.revokeObjectURL(url), 10000);
}
