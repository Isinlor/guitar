import { exhaustiveSearch, iterativeLocalSearch, localSearchTrackFingering, slidingWindowExhaustiveSearch } from '@/model/fingering/search';
import { Instrument } from '@/model/instrument';
import { Fingering, MidiNote, MidiNoteToFingeringAlternatives, NoteEvent, NoteEventWithFingeringAlternatives } from "@/model/types";

export function fingeringToString(fingering: Fingering) {
  return `${fingering.string}:${fingering.fret}:${fingering.finger}`;
}

export function fretFingerToString(fingering: Fingering) {
  return `${fingering.fret}:${fingering.finger}`;
}

export function getUniqueNotes(noteEvents: NoteEvent[]): MidiNote[] {
  return [...new Set(noteEvents.map(({ note }) => note))].sort((a, b) => a - b);
}

export function getRange(notes: MidiNote[]): { min: MidiNote, max: MidiNote, range: number } {
  const min = Math.min(...notes);
  const max = Math.max(...notes);
  return { min, max, range: max - min + 1 };
}

export function transpose(noteEvents: NoteEvent[], transposition: number) {
  return noteEvents.map(note => {
    return {
      ...note,
      note: note.note + transposition
    }
  });
}

export function getNoteEventsWithFingeringAlternatives(
  noteEvents: NoteEvent[],
  midiNoteToFingeringAlternatives: MidiNoteToFingeringAlternatives
) {
  return noteEvents.map(noteEvent => {
    const fingeringAlternatives = midiNoteToFingeringAlternatives.get(noteEvent.note);
    if (!fingeringAlternatives) throw new Error(
      `No string fret alternatives available for note ${noteEvent.note}!`
    );
    return { ...noteEvent, fingeringAlternatives };
  });
}

export function makeRandomTrackFingering(noteEvents: NoteEventWithFingeringAlternatives[]) {
  return noteEvents.map(note => {
    const fingeringAlternatives = note.fingeringAlternatives;
    return {
      ...note,
      fingering: note.fingeringAlternatives[Math.floor(Math.random() * fingeringAlternatives.length)]
    };
  });
}

export function createTrackFingering(instrument: Instrument, noteEvents: NoteEvent[]) {

  const transposition = instrument.findMostAccurateTranspositionWithSmallestFretRange(getUniqueNotes(noteEvents));

  noteEvents = transpose(noteEvents, transposition);
  
  const notes = getUniqueNotes(noteEvents);

  const fingeringAlternatives = instrument.getCompactFingeringAlternativesForNotes(notes);

  const totalNumberOfPossibleFingerings = [...fingeringAlternatives.values()].flatMap(a => a).length;

  const noteEventsWithStringFretAlternatives = getNoteEventsWithFingeringAlternatives(noteEvents, fingeringAlternatives);

  const randomTrackFingering = makeRandomTrackFingering(noteEventsWithStringFretAlternatives);

  let bestTrackFingering = randomTrackFingering;

  let localSearchSteps = Math.round(20000 * (bestTrackFingering.length / 67) * (totalNumberOfPossibleFingerings / 26));

  bestTrackFingering = iterativeLocalSearch(randomTrackFingering, 10, Math.round(localSearchSteps / 10), 5);
  bestTrackFingering = localSearchTrackFingering(bestTrackFingering, localSearchSteps, 3);
  bestTrackFingering = slidingWindowExhaustiveSearch(bestTrackFingering);
  bestTrackFingering = exhaustiveSearch(bestTrackFingering, 1);

  return bestTrackFingering;
    
}