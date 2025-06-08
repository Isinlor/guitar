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

navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true } }).then((stream) => {
  const src = audioContext.createMediaStreamSource(stream)

  // Create a high-pass filter to remove low-end rumble (e.g., below 60 Hz)
  const highPassFilter = audioContext.createBiquadFilter()
  highPassFilter.type = 'highpass'
  highPassFilter.frequency.value = 60 // Cutoff frequency in Hz

  // Create a low-pass filter to remove high-end hiss (e.g., above 5000 Hz)
  const lowPassFilter = audioContext.createBiquadFilter()
  lowPassFilter.type = 'lowpass'
  lowPassFilter.frequency.value = 5000 // Cutoff frequency in Hz

  // Chain the nodes together: source -> filters -> analyser
  src.connect(highPassFilter)
  highPassFilter.connect(lowPassFilter)
  lowPassFilter.connect(analyser)
})

interface StringState {
  cents: number
  tuned: boolean
}
const stringStates = reactive<Record<number, StringState>>({})

watchEffect(() => {
  for (const s of instrument.value.strings) {
    stringStates[s] = { cents: 999, tuned: false }
  }
})

const currentString = ref<number | null>(null)

useRafFn(() => {
  analyser.getFloatTimeDomainData(dataArray)
  worker.postMessage({
    index: 0,
    time: audioContext.currentTime,
    buffer: dataArray,
    sampleRate: audioContext.sampleRate,
    expectedFrequency: 0
  })
})

const detectionsCount = ref<number>(0)
const smoothedFrequency = ref<number | null>(null)
const SMOOTHING_FACTOR = 0.1 // The alpha value (α)

worker.onmessage = (e: MessageEvent<{ result: { frequency: number; probability: number } }>) => {
  const { result } = e.data
  if (result.frequency === -1 || result.probability < 0.8) {
    currentString.value = null
    smoothedFrequency.value = null
    detectionsCount.value = 0
    return
  }

  const newFrequency = result.frequency

  smoothedFrequency.value =
    SMOOTHING_FACTOR * newFrequency + (1 - SMOOTHING_FACTOR) * (smoothedFrequency.value ?? newFrequency)

  const freq = smoothedFrequency.value

  const diffs = instrument.value.strings.map((string) => {
    const note = noteNumberFromFrequency(instrument.value.baseFrequencies[string])
    return { string, cents: centsOffFromNote(freq, note) }
  })

  const nearest = diffs.reduce((a, b) => (Math.abs(a.cents) < Math.abs(b.cents) ? a : b))

  if (Math.abs(nearest.cents) > 100) {
    console.log(`Nothing detected`)
    currentString.value = null
    smoothedFrequency.value = null
    detectionsCount.value = 0
    return
  }

  if (currentString.value !== null && currentString.value !== nearest.string) {
    console.log(`End of focus on ${currentString.value}`)
    currentString.value = null
    smoothedFrequency.value = null
    detectionsCount.value = 0
    return
  }

  if (Math.abs(nearest.cents) > 50) {
    console.log(`String ${nearest.string} is out of range: ${nearest.cents} cents`)
    return
  }

  currentString.value = nearest.string
  stringStates[nearest.string].cents = nearest.cents

  if (Math.abs(nearest.cents) <= 5) detectionsCount.value++
  else detectionsCount.value = 0

  if (detectionsCount.value >= 15) {
    console.log(`Tuning string ${nearest.string} to ${nearest.cents} cents, detected ${detectionsCount.value} times`)
    stringStates[nearest.string].tuned = Math.abs(nearest.cents) <= 5
    stringStates[nearest.string].cents = nearest.cents
  }

}

const allTuned = computed(() => instrument.value.strings.every((s) => stringStates[s]?.tuned))
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
      :class="{ active: currentString === string }"
    >
      <div class="info">
        String {{ string }} - {{ instrument.baseFrequencies[string].toFixed(2) }} Hz
      </div>
      <div class="meter" :class="{ ideal: stringStates[string]?.tuned }">
        <div
          v-if="stringStates[string]?.tuned || currentString === string"
          class="indicator"
          :style="{
            left: `${50 + Math.max(-50, Math.min(50, stringStates[string]?.cents))}%`
          }"
        ></div>
        <div
          class="indicator min"
          :style="{ left: `45%` }"
        ></div>
        <div
          class="indicator ideal"
          :style="{ left: `50%` }"
        ></div>
        <div
          class="indicator max"
          :style="{ left: `55%` }"
        ></div>
      </div>
      <div class="cents">{{ Math.round(stringStates[string]?.cents) }} cents</div>
    </div>
  </div>

  <div v-if="allTuned" class="complete">Instrument tuned!</div>
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
  border-color: #1e90ff;
}
.meter {
  height: 4px;
  background: #333;
  position: relative;
}
.meter.ideal {
  background: #00ff00;
}
.indicator {
  position: absolute;
  top: -5px;
  width: 4px;
  height: 15px;
  background: red;
  transform: translateX(50%);
}

.indicator.ideal, .indicator.min, .indicator.max {
  background: #747474;
}

.indicator.min, .indicator.max {
  width: 2px;
  top: -3px;
  height: 11px;
}

.complete {
  color: #00ff00;
  font-weight: bold;
  margin-top: 1rem;
}
</style>
