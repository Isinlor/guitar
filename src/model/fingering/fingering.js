import { exhaustiveSearch, iterativeLocalSearch, localSearchTrackFingering, slidingWindowExhaustiveSearch } from '@/model/fingering/search';
export function fingeringToString(fingering) {
    return `${fingering.string}:${fingering.fret}:${fingering.finger}`;
}
export function fretFingerToString(fingering) {
    return `${fingering.fret}:${fingering.finger}`;
}
export function getUniqueNotes(noteEvents) {
    return [...new Set(noteEvents.map(({ note }) => note))].sort((a, b) => a - b);
}
export function getRange(notes) {
    const min = Math.min(...notes);
    const max = Math.max(...notes);
    return { min, max, range: max - min + 1 };
}
export function transpose(noteEvents, transposition) {
    return noteEvents.map(note => {
        return Object.assign(Object.assign({}, note), { note: note.note + transposition });
    });
}
export function getNoteEventsWithFingeringAlternatives(noteEvents, midiNoteToFingeringAlternatives) {
    return noteEvents.map(noteEvent => {
        const fingeringAlternatives = midiNoteToFingeringAlternatives.get(noteEvent.note);
        if (!fingeringAlternatives)
            throw new Error(`No string fret alternatives available for note ${noteEvent.note}!`);
        return Object.assign(Object.assign({}, noteEvent), { fingeringAlternatives });
    });
}
export function makeRandomTrackFingering(noteEvents) {
    return noteEvents.map(note => {
        const fingeringAlternatives = note.fingeringAlternatives;
        return Object.assign(Object.assign({}, note), { fingering: note.fingeringAlternatives[Math.floor(Math.random() * fingeringAlternatives.length)] });
    });
}
export function createTrackFingering(instrument, noteEvents) {
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
