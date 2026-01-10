export interface Note {
  id: number;
  stringIndex: number;
  fret: number;
  finger: number;
  start: number; // seconds
  duration: number; // seconds
  freq: number; // Hz
  active?: boolean;
}

export const Layout = Object.freeze({
  topMargin: 60,
  stringSpacing: 40,
  noteHeight: 26,
  minNoteWidth: 24,
  radius: 6,
  playLineRatio: 0.2,

  getPlayLineX(width: number) {
    return width * this.playLineRatio;
  },

  getVisibleTimeRange(currentTime: number, pixelsPerSecond: number, playLineX: number, width: number, padSeconds = 1) {
    const leftTime = currentTime - (playLineX / pixelsPerSecond) - padSeconds;
    const rightTime = currentTime + ((width - playLineX) / pixelsPerSecond) + padSeconds;
    return { leftTime, rightTime };
  },

  noteToRect(note: Note, state: { currentTime: number, pixelsPerSecond: number }, viewportWidth: number) {
    const playLineX = this.getPlayLineX(viewportWidth);
    const x = playLineX + (note.start - state.currentTime) * state.pixelsPerSecond;
    const y = this.topMargin + (note.stringIndex * this.stringSpacing);
    const w = Math.max(this.minNoteWidth, note.duration * state.pixelsPerSecond);
    return { x, y, w, h: this.noteHeight, playLineX };
  },

  isActive(note: Note, currentTime: number) {
    return currentTime >= note.start && currentTime < (note.start + note.duration);
  }
});

export const NoteVisual = {
  compute(note: Note, state: { currentTime: number, pixelsPerSecond: number }, viewportWidth: number, theme: any) {
    const rect = Layout.noteToRect(note, state, viewportWidth);
    const active = Layout.isActive(note, state.currentTime);
    const fingerColor = (theme && theme.fingers && theme.fingers[note.finger]) || '#60a5fa';
    return { rect, active, fingerColor };
  }
};
