// load all midi files in the folder

import { getUniqueNotes } from '@/model/fingering/fingering';
import { Instrument } from '@/model/instrument';
import { getNoteEvents, readMidiFile, transpose } from '@/model/midi';
import fs from 'fs';

const directory = '/home/isinlor/Downloads/classtab/';
const files = fs.readdirSync(directory);
const midiFiles = files.filter(file => file.endsWith('.mid')).map(file => ({ directory, file }));

const guitar = Instrument.guitar();

const midis = midiFiles.map(({directory, file}) => {
  try {
    const midiFile = readMidiFile(directory + file);
    const tempo = midiFile.header.tempos.reduce((acc, tempo) => acc + tempo.bpm, 0) / midiFile.header.tempos.length;
    const tracks = midiFile.tracks.filter(t => t.notes.length > 0).map(track => {
      const noteEvents = getNoteEvents(track);
      const uniqueNotes = getUniqueNotes(noteEvents);
      // const transposition = guitar.findMostAccurateTranspositionWithSmallestFretRange(uniqueNotes);
      const mostAccurateTransposition = guitar.findMostAccurateTransposition(uniqueNotes);
      transpose(track, mostAccurateTransposition);
      const transposedNoteEvents = getNoteEvents(track);
      const transposedUniqueNotes = getUniqueNotes(transposedNoteEvents);
      const smallestFretRange = guitar.getSmallestFretRangesForNotes(transposedUniqueNotes);
      const smallestRange = Math.min(...smallestFretRange.map(range => range.range));
      return {
        name: track.name,
        instrument: track.instrument.name,
        notes: track.notes.length,
        uniqueNotes: transposedUniqueNotes.length,
        mostAccurateTransposition,
        smallestFretRange,
        difficulty: Math.round(tempo * (uniqueNotes.length / 37 + smallestRange / 12))
      };
    });
    return {
      file,
      // midi: midiFile,
      tempo,
      duration: midiFile.duration,
      tracks: midiFile.tracks.filter(t => t.notes.length > 0).length,
      // tracks,
      uniqueNotes: Math.max(...tracks.map(t => t.uniqueNotes)),
      smallestFretRange: Math.max(...tracks.map(t => t.smallestFretRange.map(range => range.range)[0])),
      difficulty: Math.max(...tracks.map(t => t.difficulty))
    };
  } catch (e) {
    // console.error(e);
    return null;
  }
}).filter(midi => midi && midi.difficulty);

midis.sort((a, b) => b.difficulty - a.difficulty);

// copy midi files to /home/isinlor/Projects/guitar-vue/music/classtab

midis.forEach(midi => {
  if (!midi) return;
  fs.copyFileSync(directory + midi.file, `/home/isinlor/Projects/guitar-vue/music/classtab/${midi.difficulty}-${midi.file}`);
});

// console.log(JSON.stringify(midis, null, 4));
// const track = midi.tracks.filter(track => track.notes.length > 0)[0];
// const noteEvents = getNoteEvents(track);