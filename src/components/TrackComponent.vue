<template>
  <div class="track-container">
    <canvas ref="canvasEl"></canvas>
    <div class="playback-indicator" :style="{ left: `${playbackIndicatorPosition}px` }"></div>
  </div>
  <button @click="play" :disabled="playState === 'running'">Play</button>
  <button @click="pause" :disabled="playState !== 'running'">Pause</button>
  <button @click="stop">Stop</button>
  <div>
    <label for="speedControl">Speed:</label>
    <input id="speedControl" type="range" v-model="playbackRateInput" min="0.1" max="2" step="0.1" />
    <span>{{ playbackRateInput }}x</span>
  </div>
  <div>
    <label for="seekSlider">Seek:</label>
    <input
      id="seekSlider"
      type="range"
      v-model="manualSeekTimeMs"
      :max="maxTimeMs"
      :disabled="playState === 'running'"
      @input="handleSeek"
      min="0"
      step="1"
    />
    <span>{{ formatTime(manualSeekTimeMs) }} / {{ formatTime(maxTimeMs) }}</span>
  </div>
  <!-- For debugging audio input -->
  <div>Detected Note MIDI: {{ detectedNoteDebug }}</div>
  <div>Expected Note MIDI: {{ expectedNoteDebug }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import type { TrackFingeringWithAlternatives, NoteEventWithFingeringAndAlternatives } from '@/model/types';
import { useWindowSize } from '@vueuse/core';
import { frequencyFromNoteNumber, noteNumberFromFrequency } from '@/model/midi'; // Added
import AutoCorrelateWorker from '@/model/worker/autocorrelateWorker?worker'; // Added

const props = defineProps<{
  music: TrackFingeringWithAlternatives, // Assuming items here can have their 'success' property updated reactively
  instrument: { strings: number, frets: number }
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
const windowSize = useWindowSize();
const playbackIndicatorPosition = 100;
const noteHeight = 20;
const stringSpacing = 30;

// Audio processing refs
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Float32Array | null = null;
const detectionWorker = new AutoCorrelateWorker();
const detectedNoteDebug = ref(0); // For UI feedback - will show MIDI note number
const expectedNoteDebug = ref(0); // For UI feedback - will show MIDI note number

const processedMusic = computed(() => props.music.map((tab, index) => ({
  ...tab,
  originalIndex: index, // Keep track of original index to update the prop
  startTimeMs: tab.startTimeMs,
  // success is directly from props.music[index].success
  // No need to include 'success' here explicitly if it's already on 'tab' from props.music
})));

const conversion = computed(() => 0.025);

const maxTimeMs = computed(() => {
  return processedMusic.value.reduce((acc, tab) => Math.max(acc, tab.startTimeMs + tab.durationMs), 0);
});

const canvasHeight = computed(() => props.instrument.strings * stringSpacing + stringSpacing);

const playState = ref<'idle' | 'running' | 'paused' | 'finished'>('idle');
const currentTime = ref(0);
const animationRef = ref<Animation | null>(null);
const playbackRateInput = ref("1.0");
const playbackRate = computed(() => parseFloat(playbackRateInput.value));
const manualSeekTimeMs = ref(0);

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// --- Audio Setup ---
async function setupAudio() {
  if (audioContext) return; // Already setup
  try {
    audioContext = new window.AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioInput = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Standard FFT size
    dataArray = new Float32Array(analyser.frequencyBinCount); // Should be analyser.fftSize / 2
    audioInput.connect(analyser);
    console.log('Audio setup complete.');
  } catch (e) {
    console.error('Error setting up audio:', e);
    // Handle error - e.g., show a message to the user
  }
}

detectionWorker.onmessage = (e) => {
  const { originalIndex, /*time, // time not used here */ result, detectedFrequency } = e.data;

  if (originalIndex === undefined || originalIndex < 0 || originalIndex >= props.music.length) return;

  const noteEvent = props.music[originalIndex];
  if (!noteEvent) return;

  const expectedMidiNote = noteEvent.note;
  const detectedMidiNote = detectedFrequency > 0 ? noteNumberFromFrequency(detectedFrequency) : 0;

  // For debugging
  detectedNoteDebug.value = detectedMidiNote;
  // expectedNoteDebug is updated in performAudioDetection

  if (result && detectedMidiNote === expectedMidiNote) { // Assuming worker sends a 'result' boolean
    if (!noteEvent.success) {
        noteEvent.success = true;
        // Reactivity should ensure processedMusic updates, and renderLoop redraws.
    }
  }
  // No 'else { noteEvent.success = false }' as success is usually a one-way street or reset on stop/new play.
};

function performAudioDetection() {
  if (!analyser || !dataArray || !audioContext || playState.value !== 'running') {
    expectedNoteDebug.value = 0; // Clear expected note if not detecting
    return;
  }

  analyser.getFloatTimeDomainData(dataArray);

  const currentTrackTime = currentTime.value;

  const activeNote = processedMusic.value.find(note =>
    currentTrackTime >= note.startTimeMs && currentTrackTime < (note.startTimeMs + note.durationMs)
  );

  if (activeNote) {
    expectedNoteDebug.value = activeNote.note; // Update debug display

    // Avoid sending messages if the note is already marked successful
    if (!activeNote.success) {
        detectionWorker.postMessage({
        originalIndex: activeNote.originalIndex,
        buffer: dataArray, // This posts a copy, consider Transferable if performance is an issue
        sampleRate: audioContext.sampleRate,
        expectedFrequency: frequencyFromNoteNumber(activeNote.note)
        });
    }
  } else {
    expectedNoteDebug.value = 0; // No note expected
  }
}


// --- Drawing and Animation ---
function drawStrings() {
  if (!ctx || !canvasEl.value) return;
  ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  for (let i = 0; i < props.instrument.strings; i++) {
    const y = stringSpacing * (i + 1);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasEl.value.width, y);
    ctx.stroke();
  }
}
function getNoteColor(note: NoteEventWithFingeringAndAlternatives & { success?: boolean }): string {
  if (note.success) return '#00FF00';
  const fingerColors: Record<number, string> = {
    0: '#808080', 1: '#FFA500', 2: '#A020F0', 3: '#1E90FF', 4: '#9FB800',
  };
  return fingerColors[note.fingering.finger] || '#FF4500';
}
function drawNotes(scrollOffset = 0) {
  if (!ctx || !canvasEl.value) return;
  processedMusic.value.forEach(note => { // processedMusic has originalIndex and direct access to success from prop
    const x = playbackIndicatorPosition + (note.startTimeMs * conversion.value) - scrollOffset;
    const y = stringSpacing * note.fingering.string - (noteHeight / 2);
    const width = note.durationMs * conversion.value;
    if (x + width < 0 || x > canvasEl.value!.width) return;

    ctx.fillStyle = getNoteColor(props.music[note.originalIndex]); // Use original prop item for success flag
    ctx.fillRect(x, y, width, noteHeight);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Arial';
    ctx.fillText(note.fingering.fret.toString(), x + width / 2, y + noteHeight / 2);
  });
}

function renderLoop(currentScrollOffset: number) {
  if (!ctx || !canvasEl.value) return;
  const visibleWidth = canvasEl.value.parentElement?.clientWidth || windowSize.width.value;
  if (canvasEl.value.width !== visibleWidth) canvasEl.value.width = visibleWidth;
  if (canvasEl.value.height !== canvasHeight.value) canvasEl.value.height = canvasHeight.value;

  drawStrings();
  drawNotes(currentScrollOffset);
}

function setupAnimation() {
  if (animationRef.value) animationRef.value.cancel();

  animationRef.value = new Animation(
    new KeyframeEffect(null, null, { duration: maxTimeMs.value, fill: 'forwards' }),
    document.timeline
  );
  animationRef.value.playbackRate = playbackRate.value;

  animationRef.value.onfinish = () => {
    playState.value = 'finished';
    currentTime.value = maxTimeMs.value;
    manualSeekTimeMs.value = maxTimeMs.value;
    performAudioDetection(); // One last detection call at the very end
    renderLoop(maxTimeMs.value * conversion.value);
  };
  animationRef.value.oncancel = () => { // This is effectively 'stop'
    playState.value = 'idle';
    // currentTime.value = 0; // Set by stop() or handleSeek()
    // manualSeekTimeMs.value = 0;
    props.music.forEach(note => note.success = false); // Reset success states on stop
    renderLoop(currentTime.value * conversion.value); // Render at current time (e.g. 0 if stopped)
  };
}

watch(playbackRate, (newRate) => {
  if (animationRef.value) animationRef.value.playbackRate = newRate;
});

watch([() => props.music, windowSize, () => props.instrument.strings], () => {
  nextTick(() => {
    if (canvasEl.value) {
      const visibleWidth = canvasEl.value.parentElement?.clientWidth || windowSize.width.value;
      canvasEl.value.width = visibleWidth;
      canvasEl.value.height = canvasHeight.value;
    }
    manualSeekTimeMs.value = 0;
    currentTime.value = 0;
    props.music.forEach(note => note.success = false); // Reset success on new music
    setupAnimation();
    renderLoop(currentTime.value * conversion.value);
  });
}, { deep: true, immediate: true });

let rafId: number | null = null;
function animationStep() {
  if (!animationRef.value) { rafId = null; return; }

  if (playState.value !== 'running') {
    if (playState.value === 'paused' && animationRef.value?.currentTime != null) {
        const currentAnimTime = animationRef.value.currentTime;
        manualSeekTimeMs.value = currentAnimTime;
        currentTime.value = currentAnimTime; // Keep currentTime synced
        renderLoop(currentAnimTime * conversion.value);
    }
    rafId = null;
    return;
  }

  const currentAnimTime = animationRef.value.currentTime ?? 0;
  currentTime.value = currentAnimTime;
  manualSeekTimeMs.value = currentAnimTime;

  performAudioDetection();

  renderLoop(currentAnimTime * conversion.value);
  rafId = requestAnimationFrame(animationStep);
}

async function play() {
  if (!audioContext) await setupAudio();
  if (!audioContext) {
      console.error("Cannot play: Audio context not available.");
      return;
  }
  // It's good practice to resume context on user gesture
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }


  if (!animationRef.value) setupAnimation(); // Should be set up by watch
  if (!animationRef.value) return;

  if (playState.value === 'finished') {
    // For re-play, reset time and success states
    currentTime.value = 0;
    manualSeekTimeMs.value = 0;
    animationRef.value.currentTime = 0;
    props.music.forEach(note => note.success = false);
    // setupAnimation(); // No need to fully re-setup, just reset time and state
  }

  if (playState.value === 'paused' || playState.value === 'idle' || playState.value === 'finished') {
    animationRef.value.currentTime = manualSeekTimeMs.value;
    currentTime.value = manualSeekTimeMs.value; // Sync currentTime

    // Reset success flags for notes that haven't been successfully played yet or will be re-evaluated
    props.music.forEach(note => {
        if (note.startTimeMs >= manualSeekTimeMs.value) {
            note.success = false;
        }
        // Optionally, keep success for notes already passed and correctly played:
        // else if (note.startTimeMs < manualSeekTimeMs.value && note.success) { /* keep it */ }
        // else { note.success = false; } // for notes passed but not successful
    });
  }

  animationRef.value.play(); // This might throw if context is suspended and not resumed.
  playState.value = 'running';

  if (rafId === null) { // Start RAF loop if not already running
    animationStep();
  }
}

function pause() {
  if (animationRef.value && playState.value === 'running') {
    animationRef.value.pause();
    playState.value = 'paused';
    if (audioContext && audioContext.state === 'running') { // Suspend audio context only if it's running
        audioContext.suspend();
    }
    const currentAnimTime = animationRef.value.currentTime ?? 0;
    // currentTime and manualSeekTimeMs are already updated by animationStep or play
    renderLoop(currentAnimTime * conversion.value);
  }
}

function stop() {
  if (animationRef.value) {
    // Set current time to 0 before cancel, so oncancel renders at 0
    animationRef.value.currentTime = 0;
    currentTime.value = 0;
    manualSeekTimeMs.value = 0;
    animationRef.value.cancel(); // Triggers oncancel, which resets success flags and renders
  }
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend();
  }
  playState.value = 'idle'; // Ensure state is idle. oncancel also sets it.
}

function handleSeek() {
  if (!animationRef.value) return;

  const seekTime = Number(manualSeekTimeMs.value);
  currentTime.value = seekTime;

  if (playState.value !== 'running') {
    animationRef.value.currentTime = seekTime;
    // Reset success flags for notes ahead of the seek target
    props.music.forEach(note => {
        if (note.startTimeMs >= seekTime) {
            note.success = false;
        }
    });
    renderLoop(seekTime * conversion.value);
  }
}

onMounted(async () => {
  if (canvasEl.value) {
    ctx = canvasEl.value.getContext('2d');
    if (ctx) {
      // Initial watch call handles setup.
    } else {
      console.error('Failed to get 2D context');
    }
  }
  // Defer audio setup until first play or user interaction
});

onUnmounted(() => {
  if (animationRef.value) animationRef.value.cancel();
  detectionWorker.terminate();
  if (audioContext) {
    audioContext.close().catch(e => console.error("Error closing audio context:", e));
  }
});

defineExpose({ play, pause, stop, currentTime, playState, manualSeekTimeMs });

</script>

<style scoped>
.track-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}
canvas {
  display: block;
}
.playback-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: red;
}
button, input[type="range"], label {
  margin: 5px;
  vertical-align: middle;
}
div > label {
  margin-right: 0.5em;
}
input[type="range"] {
  width: 200px;
}
</style>
