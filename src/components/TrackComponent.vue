<script setup lang="ts">

import { computed, ref, watch } from 'vue';
import { NoteEventWithFingeringAndAlternatives, TrackFingeringWithAlternatives } from '../model/types';
import { useWindowSize } from '@vueuse/core'

const windowSize = useWindowSize();

const conversion = computed(() => 25 / music.value.reduce((acc, tab) => Math.min(acc, tab.durationMs), Infinity));

const offset = 200;

// define music props Vue
const props = defineProps<{
  music: TrackFingeringWithAlternatives,
  instrument: { strings: number, frets: number }
}>();

const music = computed(() => props.music);

const tabsGroupedByStrings = computed(() => {
  return music.value.reduce((acc, tab) => {
    if (!acc[tab.fingering.string]) {
      acc[tab.fingering.string] = [];
    }
    acc[tab.fingering.string].push(tab);
    return acc;
  }, {} as Record<string, NoteEventWithFingeringAndAlternatives[]>);
});

const maxTimeMs = computed(() => {
  return music.value.reduce((acc, tab) => {
    return Math.max(acc, tab.startTimeMs + tab.durationMs);
  }, 0);
});

const tabs = ref<HTMLElement>();

let playbackRateValue = 1;
const playbackRate = computed({
  get: () => playbackRateValue,
  set: (value) => {
    playbackRateValue = value;
    if(animation.value) animation.value.playbackRate = value;
  }
});
const playState = ref('idle');

let animation = ref<Animation>();
watch([music, maxTimeMs, conversion], () => {
  if(animation.value) animation.value?.cancel();
  animation.value = tabs.value?.animate(
    { transform: `translate(${-maxTimeMs.value * conversion.value}px)` },
    { duration: maxTimeMs.value, playbackRate: playbackRate.value }
  );
  pause();
  if(!animation.value) return;
  animation.value.onfinish = () => {
    playState.value = 'finished';
  };
  animation.value.oncancel = () => {
    playState.value = 'idle';
  };
}, { immediate: true });

function play() {
  animation.value?.play();
  playState.value = 'running';
}

function pause() {
  animation.value?.pause();
  playState.value = 'paused';
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
            class="note" :class="{ [`finger-${tab.fingering.finger}`]: true }"
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
  <input type="range" v-model="playbackRate" min="0.1" max="2" step="0.1" style="margin: 1rem;">

  <div style="margin: 1rem;">
    <span class="tag finger-0">Open note</span>
    <span class="tag finger-1">Finger 1</span>
    <span class="tag finger-2">Finger 2</span>
    <span class="tag finger-3">Finger 3</span>
    <span class="tag finger-4">Finger 4</span>
  </div>

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
  padding-bottom: 10px;
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