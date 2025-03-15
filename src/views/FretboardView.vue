<script setup lang="ts">

import TrackComponent from '@/components/TrackComponent.vue';
import { getNoteEvents } from '@/model/midi';
import { Midi } from '@tonejs/midi';
import { ref } from 'vue';

import { Settings, importer, midi } from '@coderline/alphatab';

import FingeringWorker from '@/model/worker?worker';

const ukulele = {
  strings: 4,
  frets: 12
};

const guitar = {
  strings: 6,
  frets: 12
};

const music = ref<any>([]); // Initialize music ref

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {

      console.log(file.type);
      if (file.type === 'audio/midi') {
        console.log('MIDI file detected');
        const midi = new Midi(await file.arrayBuffer());
        console.log(midi);
        const track = midi.tracks.filter(track => track.notes.length > 0)[0];
        const noteEvents = getNoteEvents(track);
        const worker = new FingeringWorker();
        const time = performance.now();
        worker.onmessage = (e) => {
          music.value = e.data;
          console.log('Time taken:', performance.now() - time);
        };
        worker.postMessage({ noteEvents, instrumentName: 'guitar' });
        return;
      }

      const score = importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer()))

      const settings = new Settings();

      // Setup generator and midi file handler
      const midiFile = new midi.MidiFile();
      const handler = new midi.AlphaSynthMidiFileHandler(midiFile, true /* For SMF1.0 export */);
      const generator = new midi.MidiFileGenerator(score, settings, handler);

      // start generation
      generator.generate();

      const midiScore = new Midi(midiFile.toBinary().buffer);
      console.log(midiScore);

      const track = midiScore.tracks.filter(track => track.notes.length > 0)[0];
      const noteEvents = getNoteEvents(track);
      const worker = new FingeringWorker();

      const time = performance.now();
      worker.onmessage = (e) => {
        music.value = e.data;
        console.log('Time taken:', performance.now() - time);
      };
      worker.postMessage({ noteEvents, instrumentName: 'guitar' });
      return;

    };
    reader.readAsText(file);
  }
};

</script>

<template>
  <input type="file" accept=".json,.mid" @change="handleFileUpload" />
  <track-component :music="music" :instrument="guitar" />  
  <div class="detected-note"></div>
</template>
