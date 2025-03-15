import { getNoteEventsWithFingeringAlternatives, getNoteEventWithHandPositionAlternatives, getUniqueNotes, makeRandomTrackFingering, transpose } from '../model/fingering/fingering';
import { computeComplexity } from '../model/fingering/penalties';
import { exhaustiveSearch, iterativeLocalSearch, localSearch, slidingWindowExhaustiveSearch } from '../model/fingering/search';
import { Instrument } from '../model/instrument';
import { getNoteEvents, readFile } from '../model/midi';

// const filename = './music/HarryPotter.mid';
// const filename = './music/hejsokoly.mid';
// const filename = './music/czerwonekorale.mid';
// const filename = './music/DragonBall-MakafushigiAdventure.mid';
// const filename = './music/movingcastle.mid';
// const filename = './music/dragon.xml';
const filename = './music/rising.mid';

const midi = readFile(`${filename}`);

console.log(midi.tracks.map(track => `${track.name} - ${track.instrument.name} - ${track.notes.length} notes`));

const track = midi.tracks.filter(track => track.notes.length > 0)[0];

const originalNoteEvents = getNoteEvents(track);
const originalNotes = getUniqueNotes(originalNoteEvents);

const instrument = Instrument.guitar();

const transposition = instrument.findLowestTranspositionWithSmallestFretRange(originalNotes);

// transpose(track, transposition);

const noteEvents = transpose(originalNoteEvents, transposition);

// adjust instrument to Acoustic Guitar (nylon)
track.instrument.number = 24;

const notes = getUniqueNotes(noteEvents);

instrument.getSmallestFretRangesForNotes(notes);

const fingeringAlternatives = instrument.getCompactFingeringAlternativesForNotes(notes);

const totalNumberOfPossibleFingerings = [...fingeringAlternatives.values()].flatMap(a => a).length;

const noteEventsWithStringFretAlternatives = getNoteEventsWithFingeringAlternatives(noteEvents, fingeringAlternatives);

const noteEventWithHandPositionAlternatives = getNoteEventWithHandPositionAlternatives(noteEventsWithStringFretAlternatives);

console.log('noteEventWithHandPositionAlternatives', noteEventWithHandPositionAlternatives);



process.exit(0);

const randomTrackFingering = makeRandomTrackFingering(noteEventsWithStringFretAlternatives);

let bestTrackFingering = randomTrackFingering;

let localSearchSteps = Math.round(20000 * (bestTrackFingering.length / 67) * (totalNumberOfPossibleFingerings / 26));

console.log('localSearchSteps', localSearchSteps);

bestTrackFingering = iterativeLocalSearch(randomTrackFingering, 10, Math.round(localSearchSteps / 10), 5);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = localSearch(bestTrackFingering, localSearchSteps, 3);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = slidingWindowExhaustiveSearch(bestTrackFingering);

console.log('complexity', computeComplexity(bestTrackFingering));

bestTrackFingering = exhaustiveSearch(bestTrackFingering, 1);

console.log('complexity', computeComplexity(bestTrackFingering));

// fs.writeFileSync(
//   `${filename}-${instrument.name}-${computeComplexity(bestTrackFingering)}.json`,
//   JSON.stringify(bestTrackFingering, null, 2)
// );

// const newMidi = new Midi();

// const newTrack = newMidi.addTrack();
// newTrack.instrument = track.instrument;
// newTrack.notes = track.notes;

// writeMidiFile(newMidi, `${filename}-${instrument.name}-transposed-simplified.mid`);


