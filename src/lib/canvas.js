/** Canvas drawing helpers used by the video exporter. */

export function wrapText(ctx, text, max) {
  const out = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > max && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

export function drawSubtitle(ctx, W, H, clip, char) {
  const fs = Math.round(H * 0.042);
  const max = W * 0.82;
  ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, char.name + '  ' + clip.cap, max).slice(0, 3);
  const lh = fs * 1.3;
  const pad = fs * 0.45;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const bh = lines.length * lh + pad * 1.4;
  const bx = (W - bw) / 2;
  const by = H * 0.94 - bh;
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(bx, by, bw, bh);
  lines.forEach((l, i) => {
    const lw = ctx.measureText(l).width;
    const x = (W - lw) / 2;
    const y = by + pad * 0.7 + i * lh;
    ctx.fillStyle = '#fff';
    ctx.fillText(l, x, y);
    if (i === 0) {
      ctx.fillStyle = char.color;
      ctx.fillText(char.name, x, y);
    }
  });
}

export function drawCard(ctx, W, H, clip, char) {
  ctx.fillStyle = '#151517';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = char.color;
  ctx.font = `700 ${Math.round(H * 0.1)}px "Archivo Narrow", sans-serif`;
  ctx.fillText(char.name, W / 2, H * 0.4);
  ctx.fillStyle = '#e8e8ea';
  const fs = Math.round(H * 0.045);
  ctx.font = `500 ${fs}px Inter, sans-serif`;
  wrapText(ctx, clip.cap, W * 0.7)
    .slice(0, 4)
    .forEach((l, i) => ctx.fillText(l, W / 2, H * 0.55 + i * fs * 1.35));
  ctx.textAlign = 'start';
}
