/** Grab the current video frame as a small JPEG data URL (or null if it can't). */
export function captureThumb(video, w = 192, h = 108) {
  try {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const r = Math.max(w / video.videoWidth, h / video.videoHeight);
    const dw = video.videoWidth * r;
    const dh = video.videoHeight * r;
    ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return cv.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}
