import { AudioService } from './audio';
import { type Note } from './layout';
import { ThemeManager } from './theme';

export function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// Binary search helpers (notes must be sorted by start)
function lowerBoundByStart(notes: Note[], time: number) {
  let lo = 0, hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].start < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class Conductor {
  audio: AudioService;
  state: any;
  requestRender: () => void;
  rafId: number | null = null;
  audioAnchor = 0;
  pausedTime = 0;
  nextNoteIndex = 0;
  audioLookahead = 0.1;

  constructor(audio: AudioService, state: any, requestRender: () => void) {
    this.audio = audio;
    this.state = state;
    this.requestRender = requestRender;
  }

  init() {
    ThemeManager.refresh();
    this.audio.init();

    // Notes are loaded via props in the Vue component, so we assume state.notes is populated
    this.state.audioInitialized = true;
    this.pausedTime = 0;
    this.state.currentTime = 0;
    this.nextNoteIndex = 0;

    this.requestRender();
  }

  togglePlay() { this.state.isPlaying ? this.pause() : this.play(); }

  play() {
    if (this.state.isPlaying) return;
    this.audio.resume();

    this.state.isPlaying = true;

    this.audioAnchor = this.audio.currentTime - (this.pausedTime / this.state.playbackSpeed);
    this.nextNoteIndex = lowerBoundByStart(this.state.notes, this.pausedTime);

    this.loopTick();
  }

  pause() {
    if (!this.state.isPlaying) return;
    this.state.isPlaying = false;

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    this.pausedTime = this.state.currentTime;

    this.audio.stopAllVoices();
    this.audio.suspend();

    this.requestRender();
  }

  stop() {
    const target = this.state.loop.active ? this.state.loop.start : 0;
    this.pause();
    this.jumpTo(target, { keepPlaying: false });
  }

  setSpeed(newSpeed: number) {
    const speed = clamp(Number(newSpeed) || 1, 0.1, 5);

    const wasPlaying = this.state.isPlaying;
    const musicalNow = this.state.currentTime;

    this.audio.stopAllVoices();

    this.state.playbackSpeed = speed;
    this.pausedTime = musicalNow;
    this.state.currentTime = musicalNow;
    this.nextNoteIndex = lowerBoundByStart(this.state.notes, musicalNow);

    if (wasPlaying) {
      this.audio.resume();
      this.audioAnchor = this.audio.currentTime - (musicalNow / speed);
    }

    this.requestRender();
  }

  scrub(newTime: number) {
    this.jumpTo(newTime, { keepPlaying: this.state.isPlaying });
  }

  jumpTo(newTime: number, { keepPlaying }: { keepPlaying: boolean }) {
    const clamped = clamp(newTime, 0, this.state.duration);

    this.audio.stopAllVoices();

    this.state.currentTime = clamped;
    this.pausedTime = clamped;
    this.nextNoteIndex = lowerBoundByStart(this.state.notes, clamped);

    if (keepPlaying) {
      this.audio.resume();
      this.audioAnchor = this.audio.currentTime - (clamped / this.state.playbackSpeed);
    }

    this.requestRender();
  }

  loopTick() {
    if (!this.state.isPlaying) return;

    const nowAudio = this.audio.currentTime;
    const speed = this.state.playbackSpeed;

    const musicalNow = (nowAudio - this.audioAnchor) * speed;
    this.state.currentTime = musicalNow;

    if (this.state.loop.active) {
      if (this.state.currentTime >= this.state.loop.end) {
        this.jumpTo(this.state.loop.start, { keepPlaying: true });
        this.rafId = requestAnimationFrame(() => this.loopTick());
        return;
      }
    } else if (this.state.currentTime >= this.state.duration) {
      this.stop();
      return;
    }

    const lookaheadMusical = this.audioLookahead * speed;
    const scheduleUntil = this.state.currentTime + lookaheadMusical;
    const notes = this.state.notes;

    while (this.nextNoteIndex < notes.length) {
      const note = notes[this.nextNoteIndex];
      if (note.start > scheduleUntil) break;

      if (note.start >= this.state.currentTime) {
        const playAt = this.audioAnchor + (note.start / speed);
        const durAudio = note.duration / speed;
        this.audio.playNote(note, playAt, durAudio);
      }

      this.nextNoteIndex++;
    }

    this.requestRender();
    this.rafId = requestAnimationFrame(() => this.loopTick());
  }
}
