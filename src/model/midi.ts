import { Midi, Track } from "@tonejs/midi";
import fs from 'fs';
import { MidiNote, NoteEvent } from "./types";

export function readMidiFile(filename: string) {
  return new Midi(fs.readFileSync(filename));
}

export function writeMidiFile(midi: Midi, filename: string) {
  fs.writeFileSync(filename, Buffer.from(midi.toArray()));
}

export function transpose(track: Track, transposition: number) {
  return track.notes.map(note => {
    return {
      ...note,
      midi: note.midi + transposition
    }
  });
}

export function getNoteEvents(track: Track): NoteEvent[] {
  return track.notes.map(note => ({
    note: note.midi,
    startTimeMs: Math.round(note.time * 1000),
    durationMs: Math.round(note.duration * 1000)
  }));
}

/**
 * Converts a frequency in Hz to the nearest MIDI note number.
 * This function uses the logarithmic relationship between frequencies and MIDI note numbers based on the equal temperament scale.
 * A4 (440 Hz) is used as the reference point and has a MIDI note number of 69.
 * 
 * @param {number} frequency - The frequency in Hz to convert to a MIDI note number.
 * @returns {MidiNote} The closest MIDI note number corresponding to the input frequency.
 */
export function noteNumberFromFrequency(frequency: number): MidiNote {
  var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

/**
* Calculates the frequency in Hz for a given MIDI note number.
* This is the inverse function of noteFromPitch, and it uses the same reference point of A4 (440 Hz) at MIDI note number 69.
* It calculates frequency by determining the number of semitones away from A4 and adjusting the frequency accordingly.
* 
* @param {number} note - The MIDI note number to convert to frequency.
* @returns {number} The frequency in Hz corresponding to the MIDI note number.
*/
export function frequencyFromNoteNumber(note: MidiNote): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
* Calculates how many cents a given frequency is off from a specified MIDI note number.
* A cent is one hundredth of a semitone. This function provides a precise measure of tuning accuracy,
* useful for fine-tuning musical instruments.
* It calculates the difference in cents by comparing the logarithm of the ratio of the given frequency
* to the expected frequency of the MIDI note.
* 
* @param {number} frequency - The frequency in Hz to be evaluated.
* @param {number} note - The MIDI note number used as the reference for tuning accuracy.
* @returns {number} The number of cents the frequency is off from the given MIDI note.
*/
export function centsOffFromNote(frequency: number, note: MidiNote): number {
  return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}