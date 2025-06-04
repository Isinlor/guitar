<script setup lang="ts">
import TrackComponent from '@/components/TrackComponent.vue'
import { getNoteEvents } from '@/model/midi'
import { Midi } from '@tonejs/midi'
import { ref, computed } from 'vue'

import FingeringWorker from '@/model/worker?worker'

const instruments = {
  ukulele: {
    strings: 4,
    frets: 12
  },
  guitar: {
    strings: 6,
    frets: 12
  }
}

const selectedInstrument = ref<'ukulele' | 'guitar'>('guitar')
const instrument = computed(() => instruments[selectedInstrument.value])

const music = ref<any>([]) // Initialize music ref

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      console.log(file.type)
      if (file.type === 'audio/midi') {
        console.log('MIDI file detected')
        const midi = new Midi(await file.arrayBuffer())
        console.log(midi)
        const track = midi.tracks.filter((track) => track.notes.length > 0)[0]
        const noteEvents = getNoteEvents(track)
        const worker = new FingeringWorker()
        worker.onmessage = (e) => {
          music.value = e.data
        }
        worker.postMessage({ noteEvents, instrumentName: selectedInstrument.value })
        return
      }

      try {
        music.value = JSON.parse(e.target?.result as string)
      } catch (error) {
        console.error('Error parsing JSON:', error)
      }
    }
    reader.readAsText(file)
  }
}
</script>

<template>
  <label>
    Instrument
    <select v-model="selectedInstrument">
      <option value="guitar">Guitar</option>
      <option value="ukulele">Ukulele</option>
    </select>
  </label>
  <input type="file" accept=".json,.mid" @change="handleFileUpload" />
  <track-component :music="music" :instrument="instrument" />
  <div class="detected-note"></div>
</template>
