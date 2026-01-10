export class AudioService {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  activeVoices = new Set<any>();

  init() {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
    }
  }

  get currentTime() { return this.ctx ? this.ctx.currentTime : 0; }

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }

  stopAllVoices(fadeSeconds = 0.02) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const v of this.activeVoices) {
      try {
        v.stop(now, fadeSeconds);
      } catch (_) {
        // ignore
      }
    }
    this.activeVoices.clear();
  }

  playNote(note: { stringIndex: number, fret: number, freq: number }, when: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const ctx = this.ctx;

    // Avoid scheduling in the past
    const safeWhen = Math.max(when, ctx.currentTime);
    const safeDur = Math.max(0.01, duration);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = note.stringIndex > 2 ? 'sawtooth' : 'triangle';
    // Use the frequency provided by the note (calculated from MIDI)
    osc.frequency.value = note.freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, safeWhen);
    filter.frequency.exponentialRampToValueAtTime(500, safeWhen + Math.min(0.5, safeDur));

    gain.gain.setValueAtTime(0, safeWhen);
    gain.gain.linearRampToValueAtTime(1, safeWhen + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, safeWhen + safeDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const voice = {
      osc,
      gain,
      stopped: false,
      stop: (atTime: number, fade: number) => {
        if (voice.stopped) return;
        voice.stopped = true;
        try {
          const t = Math.max(atTime, ctx.currentTime);
          if (typeof (voice.gain.gain as any).cancelAndHoldAtTime === 'function') {
            (voice.gain.gain as any).cancelAndHoldAtTime(t);
          } else {
            voice.gain.gain.cancelScheduledValues(t);
            voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
          }
          voice.gain.gain.linearRampToValueAtTime(0, t + fade);
          voice.osc.stop(t + fade + 0.1);
        } catch (_) {
          // ignore
        }
      }
    };

    this.activeVoices.add(voice);
    osc.onended = () => {
      this.activeVoices.delete(voice);
    };

    osc.start(safeWhen);
    osc.stop(safeWhen + safeDur + 0.2);
  }
}
