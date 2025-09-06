import { Instrument } from './instrument';
import { TrackFingering } from './types';

/**
 * Convert a TrackFingering into a simple ASCII tab representation.
 * Each note is represented as a slot of fixed width (two characters).
 * The highest string (string 1) is printed first, followed by the rest
 * in ascending order.
 */
export function trackFingeringToTab(track: TrackFingering, instrument: Instrument): string {
  const strings = instrument.strings; // ascending order starting from 1
  const slot = '--';
  const lines: string[][] = strings.map(() => []);

  for (const note of track) {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i] === note.fingering.string) {
        // place the fret number and pad with '-' so all slots are equal width
        lines[i].push(String(note.fingering.fret).padEnd(slot.length, '-'));
      } else {
        lines[i].push(slot);
      }
    }
  }

  return strings
    .map((stringNumber, idx) => `${stringNumber}|${lines[idx].join('')}`)
    .join('\n');
}
