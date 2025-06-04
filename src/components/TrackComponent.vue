<script setup lang="ts">

import { frequencyFromNoteNumber, noteNumberFromFrequency } from '@/model/midi';
import AutoCorrelateWorker from '@/model/worker/autocorrelateWorker?worker';
import { useRafFn, useWindowSize } from '@vueuse/core';
import { computed, ref, watch, watchEffect } from 'vue';
import { NoteEvent, NoteEventWithFingeringAndAlternatives, TrackFingeringWithAlternatives } from '../model/types';

const windowSize = useWindowSize();

const conversion = computed(() => 25 / music.value.reduce((acc, tab) => Math.min(acc, tab.durationMs), 350));

const offset = 200;

// define music props Vue
const props = defineProps<{
  music: TrackFingeringWithAlternatives,
  instrument: { strings: number, frets: number }
}>();

const music = computed(() => props.music.map((tab: NoteEventWithFingeringAndAlternatives) => {
  return {
    ...tab,
    startTimeMs: tab.startTimeMs + 5000,
    success: false
  };
}));

const tabsGroupedByStrings = computed(() => {
  return music.value.reduce((acc, tab) => {
    if (!acc[tab.fingering.string]) {
      acc[tab.fingering.string] = [];
    }
    acc[tab.fingering.string].push(tab);
    return acc;
  }, {} as Record<string, (NoteEventWithFingeringAndAlternatives & { success?: boolean })[]>);
});

const maxTimeMs = computed(() => {
  return music.value.reduce((acc, tab) => {
    return Math.max(acc, tab.startTimeMs + tab.durationMs);
  }, 0);
});

const tabs = ref<HTMLElement>();

const playState = ref('idle');
let animation = ref<Animation>();
const playbackRate = ref(1);

watchEffect(() => {
  if(animation.value) animation.value.playbackRate = playbackRate.value;
});



let analyser: AnalyserNode;
let dataArray = new Float32Array(4096 / 2);
let audioContext = new window.AudioContext({
  latencyHint: 'interactive',
  sampleRate: 44100
});
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  let audioInput = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  audioInput.connect(analyser);
});

const detectionWorker = new AutoCorrelateWorker();

const time = ref(0);
const note = ref(0);
const correlated = ref<any>({});
interface AutoCorrelateResult { frequency: number; expectedFrequencyRank: number }
const results = ref<{ record: { time: number, detected: number, result: AutoCorrelateResult }[], noteEvent: NoteEvent }[]>([]);
const detection = useRafFn(() => {
  time.value = Number(animation.value?.currentTime ?? 0);

  const playedNoteEventIndex =  music.value.findIndex(tab => tab.startTimeMs <= time.value && (tab.startTimeMs + tab.durationMs) >= time.value);
  const playedNoteEvent = music.value[playedNoteEventIndex];
  note.value = playedNoteEvent?.note ?? 0;

  if(!playedNoteEvent) return;

  analyser.getFloatTimeDomainData(dataArray);

  detectionWorker.postMessage({
    index: playedNoteEventIndex,
    time: time.value,
    buffer: dataArray,
    sampleRate: audioContext.sampleRate,
    expectedFrequency: frequencyFromNoteNumber(note.value)
  });

  detectionWorker.onmessage = (e) => {
  
    const { index, time, result } = e.data;

    const playedNoteEvent = music.value[index];
    const expectedNote = playedNoteEvent.note;

    if (noteNumberFromFrequency(result.frequency) === expectedNote) {
      playedNoteEvent.success = true;
    }

    // console.log(results.value);

    const noteEvent = { note: playedNoteEvent.note, startTimeMs: playedNoteEvent.startTimeMs, durationMs: playedNoteEvent.durationMs };

    results.value[index] = results.value[index] ?? { record: [], noteEvent };
    results.value[index].record.push({ time, detected: noteNumberFromFrequency(result.frequency), result });
    
  }

}, { fpsLimit: Math.ceil(audioContext.sampleRate / dataArray.length) });

watch([music], () => {
  if(animation.value) animation.value?.cancel();
  animation.value = tabs.value?.animate(
    { transform: `translate(${-maxTimeMs.value * conversion.value}px)` },
    { duration: maxTimeMs.value, playbackRate: playbackRate.value }
  );
  pause();
  if(!animation.value) return;
  animation.value.onfinish = () => {
    playState.value = 'finished';
    music.value.forEach(tab => tab.success = false);
    detection.pause();
  };
  animation.value.oncancel = () => {
    playState.value = 'idle';
    music.value.forEach(tab => tab.success = false);
    detection.pause();
  };
}, { immediate: true });

function play() {
  animation.value?.play();
  playState.value = 'running';
  detection.resume();
}

function pause() {
  animation.value?.pause();
  playState.value = 'paused';
  detection.pause();
}

function stop() {
  animation.value?.cancel();
  playState.value = 'idle';
  detection.pause();
}

</script>
<template>

  <div class="track">
    <div class="indicator" :style="{ left: `${offset}px` }"></div>
    <div class="scroll-container">
      <div class="tab-container" ref="tabs">
        <div class="tab-row" v-for="string in instrument.strings" :key="string">
          <div 
            class="string" :class="{ [`string-${string}`]: true }"
            :style="{ width: `${Math.ceil(offset + maxTimeMs * conversion + windowSize.width.value)}px` }"
          ></div>
          <div
            v-for="tab in tabsGroupedByStrings[string]"
            :key="`${string}-${tab.startTimeMs}`"
            class="note" :class="{ [tab.success ? `success` : `finger-${tab.fingering.finger}`]: true }"
            :style="{
              left: `${Math.floor(offset + tab.startTimeMs * conversion)}px`,
              width: `${Math.floor(tab.durationMs * conversion)}px`
            }"
          >
            {{ tab.fingering.fret }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <button style="margin: 1rem;" @click="play()" v-if="playState !== 'running'">Start playing</button>
  <button style="margin: 1rem;" @click="pause()" v-else>Pause playing</button>
  <button style="margin: 1rem;" @click="stop()">Stop playing</button>
  <input type="range" v-model="playbackRate" min="0.1" max="2" step="0.1" style="margin: 1rem;">
  {{ playbackRate }} {{ animation?.playbackRate }}
  <div style="margin: 1rem;">
    <span class="tag finger-0">Open note</span>
    <span class="tag finger-1">Finger 1</span>
    <span class="tag finger-2">Finger 2</span>
    <span class="tag finger-3">Finger 3</span>
    <span class="tag finger-4">Finger 4</span>
  </div>

  <div>Time {{ time }}</div>

  <div>Current note {{ note }}</div>

  <div>Correlated note {{ correlated }}</div>

  <pre>{{ JSON.stringify(results, null, 2) }}</pre>

</template>

<style scoped>

.track {
  position: relative;
}

.scroll-container {
  position: relative;
  width: 100%;
  overflow-x: scroll;
  margin-top: 50px;
  margin-bottom: 50px;
  padding-bottom: 50px;
}

.indicator {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: red;
}

.tab-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  position: relative;
}

.tab-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  width: 100%;
  height: 20px;
  position: relative;
}

.string {
  position: absolute;
  width: 100%;
}

.string-1 {
  border-top: 1px solid #444;
}

.string-2 {
  border-top: 1px solid #555;
}

.string-3 {
  border-top: 1px solid #666;
}

.string-4 {
  border-top: 2px solid #777;
}

.string-5 {
  border-top: 2px solid #888;
}

.string-6 {
  border-top: 2px solid #999;
}

.note {
  position: absolute;
  top: 0px;
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: solid 1px #99999950;
  /*padding: 2px 5px;*/
  white-space: nowrap;
  margin-left: 1px;
  margin-right: 1px;
}

.tag {
  color: #fff;
  font-size: 16px;
  justify-content: center;
  border-radius: 5px;
  padding: 2px 5px;
  white-space: nowrap;
  display: inline-block;
}

/* Green and red can't bu used for other purposes. */ 
.green, .note.success { background-color: #00FF00; }
.red, .note.error { background-color: #FF4500; }

.grey, .finger-0 { background-color: #808080; }

.orange, .finger-1 { background-color: #FFA500; }
.purple, .finger-2 { background-color: #A020F0; }
.blue, .finger-3 { background-color: #1E90FF; }
.lime, .finger-4 { background-color: #9FB800; }

</style>