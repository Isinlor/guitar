#!/usr/bin/env node
import { readMidiFile, getNoteEvents } from './model/midi';
import { createTrackFingering } from './model/fingering/fingering';
import { Instrument } from './model/instrument';
import { trackFingeringToTab } from './model/tabs';

const [, , midiPath, instrumentName = 'guitar'] = process.argv;

if (!midiPath) {
  console.error('Usage: node cli.js <midi-file> [instrument]');
  process.exit(1);
}

const midi = readMidiFile(midiPath);
const track = midi.tracks.find(t => t.notes.length > 0);
if (!track) {
  console.error('No track with notes found in MIDI file');
  process.exit(1);
}

const noteEvents = getNoteEvents(track);
const instrument = Instrument.get(instrumentName);
const fingering = createTrackFingering(instrument, noteEvents);

console.log(trackFingeringToTab(fingering, instrument));
