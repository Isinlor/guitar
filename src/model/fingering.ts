import { makeRandomTrackFingering } from './fingering/fingering';
import { computeComplexity, reportComplexity } from './fingering/penalties';
import { exhaustiveSearch, iterativeLocalSearch, localSearchTrackFingering, slidingWindowExhaustiveSearch } from './fingering/search';
import { Instrument } from './instrument';
import { readMidiFile, transpose, writeMidiFile, getNoteEvents } from './midi';
import { getUniqueNotes, getNoteEventsWithFingeringAlternatives } from './fingering/fingering';
import fs from 'fs';
import { Midi } from '@tonejs/midi';

// const filename = './music/HarryPotter';
// const filename = './music/hejsokoly';
// const filename = './music/czerwonekorale';
const filename = './music/DragonBall-MakafushigiAdventure';
// const filename = './music/movingcastle';
const midi = readMidiFile(`${filename}.mid`);

console.log(midi.tracks.map(track => `${track.name} - ${track.instrument.name} - ${track.notes.length} notes`));

const track = midi.tracks.filter(track => track.notes.length > 0)[0];

const noteEvents = getNoteEvents(track);
const originalNotes = getUniqueNotes(noteEvents);

const instrument = Instrument.guitar();

const transposition = instrument.findLowestTranspositionWithSmallestFretRange(originalNotes);

transpose(track, transposition);

// adjust instrument to Acoustic Guitar (nylon)
track.instrument.number = 24;

const notes = getUniqueNotes(noteEvents);

const fingeringAlternatives = instrument.getCompactFingeringAlternativesForNotes(notes);

const totalNumberOfPossibleFingerings = [...fingeringAlternatives.values()].flatMap(a => a).length;

const noteEventsWithStringFretAlternatives = getNoteEventsWithFingeringAlternatives(noteEvents, fingeringAlternatives);

const randomTrackFingering = makeRandomTrackFingering(noteEventsWithStringFretAlternatives);

let bestTrackFingering = randomTrackFingering;

let localSearchSteps = Math.round(20000 * (bestTrackFingering.length / 67) * (totalNumberOfPossibleFingerings / 26));

console.log('localSearchSteps', localSearchSteps);

bestTrackFingering = iterativeLocalSearch(randomTrackFingering, 10, Math.round(localSearchSteps / 10), 5);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = localSearchTrackFingering(bestTrackFingering, localSearchSteps, 3);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = slidingWindowExhaustiveSearch(bestTrackFingering);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = exhaustiveSearch(bestTrackFingering, 1);

console.log('complexity', computeComplexity(bestTrackFingering));

fs.writeFileSync(
  `${filename}-${instrument.name}-${computeComplexity(bestTrackFingering)}.json`,
  JSON.stringify(bestTrackFingering, null, 2)
);

const newMidi = new Midi();

const newTrack = newMidi.addTrack();
newTrack.instrument = track.instrument;
newTrack.notes = track.notes;

writeMidiFile(newMidi, `${filename}-${instrument.name}-transposed-simplified.mid`);