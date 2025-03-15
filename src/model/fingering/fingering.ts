import { exhaustiveSearch, iterativeLocalSearch, localSearchTrackFingering, slidingWindowExhaustiveSearch } from '@/model/fingering/search';
import { Instrument } from '@/model/instrument';
import { Fingering, MidiNote, MidiNoteToFingeringAlternatives, NoteEvent, NoteEventWithFingeringAlternatives, NoteEventWithHandPosition, NoteEventWithHandPositionAlternatives } from "@/model/types";

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

export function getNoteEventWithHandPositionAlternatives(
  noteEventWithFingeringAlternatives: NoteEventWithFingeringAlternatives[]
): NoteEventWithHandPositionAlternatives[] {
  return noteEventWithFingeringAlternatives.map(noteEvent => {
    const fingeringAlternatives = noteEvent.fingeringAlternatives;
    const handPositionAlternatives = [...new Set(fingeringAlternatives.map(fingering => {
      return Math.max(0, fingering.fret - fingering.finger + 1);
    }))];
    return { ...noteEvent, handPositionAlternatives };
  });
}

export function eliminateFingeringAlternativesBasedOnHandPosition(
  noteEvents: (NoteEventWithFingeringAlternatives & NoteEventWithHandPosition)[]
): NoteEventWithFingeringAlternatives[] {
  return noteEvents.map(noteEvent => {
    const handPosition = noteEvent.handPosition;
    const fingeringAlternatives = noteEvent.fingeringAlternatives.filter(fingering => {
      return Math.max(0, fingering.fret - fingering.finger + 1) === handPosition;
    });
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

  let lastTime = performance.now();
  const start = lastTime;

  const logInterval = (label: string) => {
    const now = performance.now();
    console.log(`${label}: ${now - lastTime}ms (Total: ${now - start}ms)`);
    lastTime = now;
  };

  logInterval('start');

  const transposition = instrument.findMostAccurateTranspositionWithSmallestFretRange(getUniqueNotes(noteEvents));
  noteEvents = transpose(noteEvents, transposition);
  logInterval('transposition');

  const notes = getUniqueNotes(noteEvents);

  const fingeringAlternatives = instrument.getCompactFingeringAlternativesForNotes(notes);

  const totalNumberOfPossibleFingerings = [...fingeringAlternatives.values()].flatMap(a => a).length;

  const noteEventsWithStringFretAlternatives = getNoteEventsWithFingeringAlternatives(noteEvents, fingeringAlternatives);

  const randomTrackFingering = makeRandomTrackFingering(noteEventsWithStringFretAlternatives);

  let bestTrackFingering = randomTrackFingering;

  let localSearchSteps = Math.round(20000 * (bestTrackFingering.length / 67) * (totalNumberOfPossibleFingerings / 26));
  
  logInterval('until search');

  bestTrackFingering = iterativeLocalSearch(randomTrackFingering, 10, Math.round(localSearchSteps / 10), 5);

  logInterval('iterativeLocalSearch');

  bestTrackFingering = localSearchTrackFingering(bestTrackFingering, localSearchSteps, 3);

  logInterval('localSearchTrackFingering');

  bestTrackFingering = slidingWindowExhaustiveSearch(bestTrackFingering);

  logInterval('slidingWindowExhaustiveSearch');

  bestTrackFingering = exhaustiveSearch(bestTrackFingering, 1);

  logInterval('exhaustiveSearch');

  return bestTrackFingering;
    
}