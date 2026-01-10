import { Layout, NoteVisual, type Note } from './layout';

export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.max(1, Math.floor(width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(height * this.dpr));

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  draw(state: { currentTime: number, pixelsPerSecond: number, notes: Note[], songMeta: { maxDuration: number } }, theme: any, stringCount: number) {
    const { ctx, width, height } = this;
    const notes = state.notes;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    const playLineX = Layout.getPlayLineX(width);

    // strings
    for (let i = 0; i < stringCount; i++) {
      const y = Layout.topMargin + (i * Layout.stringSpacing);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = i > 2 ? theme.stringMetal : theme.stringNylon;
      ctx.lineWidth = i > 2 ? 2 : 1;
      ctx.stroke();
    }

    const { leftTime, rightTime } = Layout.getVisibleTimeRange(
      state.currentTime,
      state.pixelsPerSecond,
      playLineX,
      width,
      1
    );

    // Helpers need to be imported or duplicated
    // Assuming notes are sorted by start time
    const startIdx = lowerBoundByStart(notes, leftTime - state.songMeta.maxDuration);
    const endIdx = upperBoundByStart(notes, rightTime);

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = startIdx; i < endIdx; i++) {
      const note = notes[i];
      const end = note.start + note.duration;
      if (end < leftTime) continue;

      const { rect, active, fingerColor } = NoteVisual.compute(note, state, width, theme);
      const x = rect.x;
      const y = rect.y;
      const w = rect.w;
      const h = rect.h;
      const r = Layout.radius;

      ctx.beginPath();
      ctx.moveTo(x + r, y - h / 2);
      ctx.lineTo(x + w - r, y - h / 2);
      ctx.quadraticCurveTo(x + w, y - h / 2, x + w, y);
      ctx.quadraticCurveTo(x + w, y + h / 2, x + w - r, y + h / 2);
      ctx.lineTo(x + r, y + h / 2);
      ctx.quadraticCurveTo(x, y + h / 2, x, y);
      ctx.quadraticCurveTo(x, y - h / 2, x + r, y - h / 2);
      ctx.closePath();

      ctx.fillStyle = active ? fingerColor : '#2a2a2a';
      ctx.fill();

      if (active) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = fingerColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = fingerColor;
        ctx.lineWidth = 2;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = active ? '#000' : '#fff';
      ctx.fillText(String(note.fret), x + (w / 2), y);
    }

    // play line
    ctx.beginPath();
    ctx.moveTo(playLineX, 0);
    ctx.lineTo(playLineX, height);
    ctx.strokeStyle = theme.playLine;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = theme.playLine;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function lowerBoundByStart(notes: Note[], time: number) {
  let lo = 0, hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].start < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundByStart(notes: Note[], time: number) {
  let lo = 0, hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].start <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
