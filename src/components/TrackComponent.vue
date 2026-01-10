<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, markRaw, watch } from 'vue';
import { TrackFingeringWithAlternatives } from '../model/types';
import { AudioService } from './track/audio';
import { Conductor, clamp } from './track/conductor';
import { CanvasRenderer } from './track/renderer';
import { Layout, NoteVisual, type Note } from './track/layout';
import { ThemeManager } from './track/theme';
import { frequencyFromNoteNumber } from '@/model/midi';

// ----------------------------
// Props
// ----------------------------
const props = defineProps<{
  music: TrackFingeringWithAlternatives,
  instrument: { strings: number, frets: number }
}>();

// ----------------------------
// STATE
// ----------------------------
const store = reactive({
  audioInitialized: false,
  isPlaying: false,
  currentTime: 0,
  duration: 32,
  pixelsPerSecond: 150,
  playbackSpeed: 1.0,
  loop: { active: false, start: 0, end: 8 },
  notes: markRaw<Note[]>([]),
  songMeta: { duration: 32, maxDuration: 0.5 },
  rendererMode: 'canvas' // 'canvas' | 'dom'
});

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const containerWidth = ref(1000);
const containerHeight = ref(600);

const audioService = new AudioService();
let canvasRenderer: CanvasRenderer | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;

// ----------------------------
// Conversion Logic
// ----------------------------
function convertMusicToNotes(music: TrackFingeringWithAlternatives): Note[] {
  let id = 0;
  const notes: Note[] = music.map(event => {
    // string is 1-based in event.fingering.string
    // we need 0-based for stringIndex
    // Also we need to handle case where string might be missing or alternatives
    // Assuming event.fingering is the primary one to display
    const stringIndex = (event.fingering.string || 1) - 1;

    return {
      id: id++,
      stringIndex: stringIndex,
      fret: event.fingering.fret,
      finger: event.fingering.finger,
      start: event.startTimeMs / 1000,
      duration: event.durationMs / 1000,
      freq: frequencyFromNoteNumber(event.note),
      active: false
    };
  });

  // Sort by start time
  notes.sort((a, b) => a.start - b.start);
  return notes;
}

function computeSongMeta(notes: Note[]) {
  let maxEnd = 0;
  let maxDur = 0;
  for (const n of notes) {
    const end = n.start + n.duration;
    if (end > maxEnd) maxEnd = end;
    if (n.duration > maxDur) maxDur = n.duration;
  }
  return { duration: maxEnd + 1, maxDuration: maxDur }; // +1 for padding
}

// Watch for prop changes to update notes
watch(() => props.music, (newMusic) => {
  if (newMusic) {
    const notes = convertMusicToNotes(newMusic);
    store.notes = markRaw(notes);
    const meta = computeSongMeta(notes);
    store.songMeta = meta;
    store.duration = meta.duration;
    store.currentTime = 0; // Reset to start
    requestRender();
  }
}, { immediate: true });


// ----------------------------
// Conductor & Rendering
// ----------------------------
const requestRender = () => {
  if (store.rendererMode === 'canvas' && canvasRenderer && canvas.value) {
    // Use prop instrument strings if available, else default to 6
    canvasRenderer.draw(store, ThemeManager.theme, props.instrument?.strings || 6);
  }
};

const conductor = new Conductor(audioService, store, requestRender);

// --- DOM Renderer Helpers ---
const playLineX = computed(() => Layout.getPlayLineX(containerWidth.value));

const domVisibleNotes = computed(() => {
  const notes = store.notes;
  if (!notes || notes.length === 0) return [];

  const plX = playLineX.value;
  const { leftTime, rightTime } = Layout.getVisibleTimeRange(
    store.currentTime,
    store.pixelsPerSecond,
    plX,
    containerWidth.value,
    1
  );

  // Binary search helpers could be reused from conductor or layout,
  // but for now simple filter for DOM mode is acceptable if not huge dataset
  // Or implement binary search here
  return notes.filter(n => {
    const end = n.start + n.duration;
    return end >= leftTime && n.start <= rightTime;
  });
});

const isNoteActive = (note: Note) => Layout.isActive(note, store.currentTime);

const getDomNoteStyle = (note: Note) => {
  const w = containerWidth.value;
  const { rect, active, fingerColor } = NoteVisual.compute(note, store, w, ThemeManager.theme);

  return {
    transform: `translate3d(${rect.x}px, ${rect.y - rect.h / 2}px, 0)`,
    width: rect.w + 'px',
    height: rect.h + 'px',
    background: active ? fingerColor : '#2a2a2a',
    borderColor: active ? '#fff' : fingerColor,
    color: fingerColor
  };
};

const getDomStringStyle = (i: number) => {
  const idx = i - 1;
  const y = Layout.topMargin + (idx * Layout.stringSpacing);
  // Simple heuristic for metal strings: low strings (high index)
  // But wait, i is 1-based index here.
  // 0,1,2 (high pitch) are Nylon. 3,4,5 (low pitch) are Metal.
  // indices 0,1,2 -> i 1,2,3.
  const isMetal = idx > 2;
  return {
    top: y + 'px',
    height: isMetal ? '2px' : '1px',
    background: isMetal ? (ThemeManager.theme ? ThemeManager.theme.stringMetal : 'var(--string-metal)')
                       : (ThemeManager.theme ? ThemeManager.theme.stringNylon : 'var(--string-nylon)')
  };
};

// --- Timeline styles ---
const timelineBarStyle = computed(() => {
  const dur = Math.max(0.0001, store.duration || 1);
  const start = clamp(store.loop.start, 0, dur);
  const current = clamp(store.currentTime, 0, dur);
  const leftPct = (start / dur) * 100;
  const widthPct = Math.max(0, ((current - start) / dur) * 100);
  return {
    left: leftPct + '%',
    width: widthPct + '%',
    background: '#2b62e6'
  };
});

const timelineLoopStyle = computed(() => {
  const dur = Math.max(0.0001, store.duration || 1);
  const s = clamp(store.loop.start, 0, dur);
  const e = clamp(store.loop.end, 0, dur);
  const left = Math.min(s, e);
  const right = Math.max(s, e);
  return {
    left: (left / dur) * 100 + '%',
    width: ((right - left) / dur) * 100 + '%'
  };
});

// --- Interaction ---
let isDragging = false;
let startX = 0;
let startTime = 0;

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging) return;
  const cx = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  conductor.scrub(startTime + (startX - cx) / store.pixelsPerSecond);
};

const stopDrag = () => {
  isDragging = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('touchmove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchend', stopDrag);
};

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging = true;
  startX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  startTime = store.currentTime;

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('touchmove', onDrag, { passive: true });
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
};

const handleWheel = (e: WheelEvent) => {
  if (store.isPlaying) return;
  const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
  conductor.scrub(store.currentTime + (delta / 500) * (300 / store.pixelsPerSecond));
};

const handleTimelineClick = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const time = pct * store.duration;

  if (e.shiftKey) {
    store.loop.active = true;
    if (Math.abs(time - store.loop.start) < Math.abs(time - store.loop.end)) store.loop.start = time;
    else store.loop.end = time;

    if (store.loop.start > store.loop.end) {
        const temp = store.loop.start;
        store.loop.start = store.loop.end;
        store.loop.end = temp;
    }
    conductor.scrub(store.loop.start);
  } else {
    conductor.scrub(time);
  }
};

const formatTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const initAudio = () => {
    conductor.init();
};

const updateSpeed = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    conductor.setSpeed(parseFloat(val));
};

const toggleLoop = () => {
    store.loop.active = !store.loop.active;
    if (store.loop.active) store.loop.start = 0;
};

const toggleRenderer = () => {
    store.rendererMode = store.rendererMode === 'canvas' ? 'dom' : 'canvas';
};

// --- Lifecycle ---
onMounted(() => {
  ThemeManager.refresh();

  if (canvas.value) {
      canvasRenderer = new CanvasRenderer(canvas.value);
  }

  if (container.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const h = entries[0].contentRect.height;
      containerWidth.value = w;
      containerHeight.value = h;

      ThemeManager.refresh();

      if (canvasRenderer) {
        canvasRenderer.resize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container.value);
  }

  themeObserver = new MutationObserver(() => {
    ThemeManager.refresh();
    requestRender();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'class']
  });
});

onUnmounted(() => {
  stopDrag();
  if (resizeObserver) resizeObserver.disconnect();
  if (themeObserver) themeObserver.disconnect();
  if (conductor && store.isPlaying) conductor.pause();
});

// Reactivity for redraws
watch(() => store.pixelsPerSecond, () => requestRender());
watch(() => store.rendererMode, () => requestRender());
watch(
  () => [store.loop.active, store.loop.start, store.loop.end],
  () => requestRender()
);

</script>

<template>
  <div class="track-component">
    <!-- Initial Load Screen -->
    <div v-if="!store.audioInitialized" class="loading-overlay">
      <button @click="initAudio" style="font-size: 1.2rem; padding: 1rem 2rem;">
        Click to Initialize Audio
      </button>
    </div>

    <header class="track-header">
      <div class="control-group">
        <button @click="conductor.togglePlay()" :class="{ active: store.isPlaying }">
          {{ store.isPlaying ? 'Pause' : 'Play' }}
        </button>
        <button @click="conductor.stop()">Stop</button>
        <button @click="toggleLoop" :class="{ active: store.loop.active }">Loop</button>
      </div>

      <div class="control-group">
        <label class="slider-label">Speed {{ store.playbackSpeed }}x</label>
        <input type="range" min="0.5" max="1.5" step="0.1"
               :value="store.playbackSpeed" @input="updateSpeed">
      </div>

      <div class="control-group">
        <label class="slider-label">Zoom</label>
        <input type="range" min="50" max="400" step="10" v-model.number="store.pixelsPerSecond">
      </div>

      <div class="control-group">
        <button @click="toggleRenderer" style="min-width: 80px;">
          {{ store.rendererMode === 'canvas' ? 'Canvas' : 'DOM' }}
        </button>
      </div>

      <div class="control-group" style="margin-left: auto;">
        <span class="time-display">
          {{ formatTime(store.currentTime) }}
        </span>
      </div>
    </header>

    <!-- Main Viewport -->
    <div class="viewport-container" ref="container"
         @mousedown="startDrag"
         @touchstart="startDrag"
         @wheel.prevent="handleWheel">

      <!-- 1) CANVAS RENDERER -->
      <canvas v-show="store.rendererMode === 'canvas'" ref="canvas"></canvas>

      <!-- 2) DOM RENDERER -->
      <div v-if="store.rendererMode === 'dom'" class="dom-renderer">
        <!-- Strings -->
        <div class="dom-strings">
          <div v-for="i in (props.instrument?.strings || 6)" :key="i" class="dom-string"
               :style="getDomStringStyle(i)">
          </div>
        </div>

        <!-- Play Line -->
        <div class="dom-play-line" :style="{ left: playLineX + 'px' }"></div>

        <!-- Notes (Windowed / Virtualized) -->
        <div v-for="note in domVisibleNotes" :key="note.id"
             class="dom-note"
             :class="{ active: isNoteActive(note) }"
             :style="getDomNoteStyle(note)">
          <span class="dom-note-text" :style="{ color: isNoteActive(note) ? '#000' : '#fff' }">
            {{ note.fret }}
          </span>
        </div>
      </div>
    </div>

    <div class="timeline" @mousedown="handleTimelineClick" title="Shift+Click to set Loop points">
      <div class="timeline-bar" :style="timelineBarStyle"></div>
      <div v-if="store.loop.active" class="timeline-loop" :style="timelineLoopStyle"></div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --bg-color: #121212;
  --panel-bg: #1e1e1e;
  --text-color: #e0e0e0;
  --accent-color: #3b82f6;
  --play-line-color: #ef4444;
  --string-nylon: #555;
  --string-metal: #777;
  --finger-1: #60a5fa;
  --finger-2: #fcd34d;
  --finger-3: #f87171;
  --finger-4: #34d399;
  --finger-T: #a78bfa;
}

.track-component {
    display: flex;
    flex-direction: column;
    height: 500px; /* Adjust as needed */
    background-color: var(--bg-color, #121212);
    color: var(--text-color, #e0e0e0);
    overflow: hidden;
    user-select: none;
    border: 1px solid #333;
}

.track-header {
  background-color: var(--panel-bg, #1e1e1e);
  padding: 0.5rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-bottom: 1px solid #333;
  z-index: 10;
  flex-wrap: wrap;
}

.control-group { display: flex; align-items: center; gap: 0.5rem; }

button {
  background: #333;
  border: 1px solid #444;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}
button:hover { background: #444; }
button.active { background: var(--accent-color, #3b82f6); border-color: var(--accent-color, #3b82f6); }

.slider-label { font-size: 0.8rem; color: #888; min-width: 40px; }

.time-display {
    font-family: monospace;
    color: var(--accent-color, #3b82f6);
    font-size: 1.1rem;
}

/* --- Viewport Container --- */
.viewport-container {
  flex: 1;
  position: relative;
  background-color: var(--bg-color, #121212);
  cursor: grab;
  overflow: hidden;
}
.viewport-container:active { cursor: grabbing; }

/* --- Canvas Renderer --- */
canvas { display: block; width: 100%; height: 100%; }

/* --- DOM Renderer Styles --- */
.dom-renderer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dom-strings { position: absolute; inset: 0; }
.dom-string { position: absolute; width: 100%; transform: translateY(-50%); }

.dom-play-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--play-line-color, #ef4444);
  box-shadow: 0 0 10px var(--play-line-color, #ef4444);
  z-index: 5;
}

.dom-note {
  position: absolute;
  top: 0;
  left: 0;
  /* height: 26px; */
  /* margin-top: -13px; */ /* Handled by transform */
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: #fff;
  border: 2px solid;
  background: #2a2a2a;
  box-sizing: border-box;
  will-change: transform;
}

.dom-note.active {
  box-shadow: 0 0 15px currentColor;
  border-color: #fff !important;
}

.dom-note-text { z-index: 2; margin-left: 2px; }

/* Timeline Styles */
.timeline {
  height: 40px;
  background: #181818;
  border-top: 1px solid #333;
  position: relative;
  cursor: pointer;
}
.timeline-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  height: 100%;
  transform-origin: left;
  transition: transform 0.1s linear;
}
.timeline-loop {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.2);
  border-left: 1px solid var(--accent-color, #3b82f6);
  border-right: 1px solid var(--accent-color, #3b82f6);
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
</style>
