<script setup lang="ts">
import { ref, computed, reactive, watchEffect } from 'vue'
import { useRafFn } from '@vueuse/core'
import { Instrument } from '@/model/instrument'
import AutoCorrelateWorker from '@/model/worker/autocorrelateWorker?worker'
import { centsOffFromNote, noteNumberFromFrequency } from '@/model/midi'

const instruments = {
  ukulele: Instrument.ukulele(),
  guitar: Instrument.guitar()
}

const selectedInstrument = ref<'ukulele' | 'guitar'>('guitar')
const instrument = computed(() => instruments[selectedInstrument.value])

const worker = new AutoCorrelateWorker()

const audioContext = new window.AudioContext({ latencyHint: 'interactive' })
const analyser = audioContext.createAnalyser()
const dataArray = new Float32Array(2048)

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const src = audioContext.createMediaStreamSource(stream)
  src.connect(analyser)
})

interface StringState { cents: number; tuned: boolean }
const stringStates = reactive<Record<number, StringState>>({})

watchEffect(() => {
  for (const s of instrument.value.strings) {
    stringStates[s] = { cents: 999, tuned: false }
  }
})

const currentString = ref<number | null>(null)

useRafFn(() => {
  analyser.getFloatTimeDomainData(dataArray)
  worker.postMessage({ index: 0, time: audioContext.currentTime, buffer: dataArray, sampleRate: audioContext.sampleRate, expectedFrequency: 0 })
})

worker.onmessage = (e: MessageEvent<{ result: { frequency: number, probability: number } }>) => {
  const { result } = e.data
  if (result.frequency === -1 || result.probability < 0.1) {
    currentString.value = null
    return
  }

  const freq = result.frequency
  const diffs = instrument.value.strings.map(string => {
    const note = noteNumberFromFrequency(instrument.value.baseFrequencies[string])
    return { string, cents: centsOffFromNote(freq, note) }
  })

  const nearest = diffs.reduce((a, b) => Math.abs(a.cents) < Math.abs(b.cents) ? a : b)
  currentString.value = nearest.string
  stringStates[nearest.string].cents = nearest.cents
  stringStates[nearest.string].tuned = Math.abs(nearest.cents) <= 5
}

const allTuned = computed(() => instrument.value.strings.every(s => stringStates[s]?.tuned))
</script>

<template>
  <label>
    Instrument
    <select v-model="selectedInstrument">
      <option value="guitar">Guitar</option>
      <option value="ukulele">Ukulele</option>
    </select>
  </label>

  <div class="strings">
    <div
      v-for="string in instrument.strings"
      :key="string"
      class="string"
      :class="{ tuned: stringStates[string]?.tuned, active: currentString === string }"
    >
      <div class="info">
        String {{ string }} - {{ instrument.baseFrequencies[string].toFixed(2) }} Hz
      </div>
      <div class="meter">
        <div
          class="needle"
          :style="{ transform: `rotate(${Math.max(-45, Math.min(45, stringStates[string]?.cents))}deg)` }"
        ></div>
      </div>
      <div class="cents">{{ Math.round(stringStates[string]?.cents) }} cents</div>
    </div>
  </div>

  <div v-if="allTuned" class="complete">
    Instrument tuned!
  </div>
</template>

<style scoped>
.strings {
  margin-top: 1rem;
}
.string {
  border: 1px solid #666;
  padding: 0.5rem;
  margin-bottom: 1rem;
}
.string.active {
  border-color: #1E90FF;
}
.string.tuned {
  background-color: #00FF00;
}
.meter {
  height: 10px;
  background: #333;
  position: relative;
}
.needle {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 2px;
  height: 20px;
  background: red;
  transform-origin: bottom center;
}
.complete {
  color: #00FF00;
  font-weight: bold;
  margin-top: 1rem;
}
</style>
