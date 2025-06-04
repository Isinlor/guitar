import { FingeringAlternatives, TrackStateStore } from "@/model/fingering/types";
import { makeRandomTrackFingering } from "./fingering";
import { computeComplexity, setupSoftConstraints } from "./penalties";
export function mutateTrackFingering(trackFingering, mutations) {
    const newTrackFingering = [...trackFingering];
    for (let i = 0; i < mutations; i++) {
        const randomIndex = Math.floor(Math.random() * newTrackFingering.length);
        const randomNote = newTrackFingering[randomIndex];
        const fingeringAlternatives = randomNote.fingeringAlternatives;
        newTrackFingering[randomIndex] = Object.assign(Object.assign({}, newTrackFingering[randomIndex]), { fingering: fingeringAlternatives[Math.floor(Math.random() * fingeringAlternatives.length)] });
    }
    return newTrackFingering;
}
export function mutateTrackState(trackState, alternatives, mutations) {
    const changes = [];
    for (let i = 0; i < mutations; i++) {
        const randomIndex = Math.floor(Math.random() * trackState.state.length);
        const alternativesAtIndex = alternatives.getAlternatives(randomIndex);
        const change = {
            index: randomIndex,
            oldState: trackState.state[randomIndex],
            newState: alternativesAtIndex[Math.floor(Math.random() * alternativesAtIndex.length)]
        };
        changes.push(change);
        trackState.change(change.index, change.oldState, change.newState);
    }
    return changes;
}
export function revertTrackStateChanges(trackState, changes) {
    for (const change of [...changes].reverse()) {
        trackState.change(change.index, change.newState, change.oldState);
    }
}
export function iterativeLocalSearch(trackFingering, iterations, attemptsPerIteration, disruption) {
    trackFingering = [...trackFingering];
    let bestComplexity = Infinity;
    for (let i = 0; i < iterations; i++) {
        let candidateTrackFingering = localSearchTrackFingering(makeRandomTrackFingering(trackFingering), attemptsPerIteration, disruption);
        let candidateComplexity = computeComplexity(candidateTrackFingering);
        if (candidateComplexity < bestComplexity) {
            trackFingering = candidateTrackFingering;
            bestComplexity = candidateComplexity;
        }
    }
    return trackFingering;
}
export function localSearchTrackFingering(trackFingering, attempts, disruption) {
    const softConstraint = setupSoftConstraints(trackFingering);
    const alternatives = new FingeringAlternatives(trackFingering);
    const trackStateStore = new TrackStateStore(trackFingering.map(note => note.fingering), [
        softConstraint
    ]);
    localSearch(trackStateStore, softConstraint, alternatives, attempts, disruption);
    return trackFingering.map((note, i) => (Object.assign(Object.assign({}, note), { fingering: trackStateStore.state[i] })));
}
export function localSearchSlow(trackFingering, attempts, disruption) {
    trackFingering = [...trackFingering];
    let trackFingeringComplexity = computeComplexity(trackFingering);
    while (attempts--) {
        const newTrackFingering = mutateTrackFingering(trackFingering, disruption);
        const newTrackFingeringComplexity = computeComplexity(newTrackFingering);
        if (newTrackFingeringComplexity <= trackFingeringComplexity) {
            trackFingering = newTrackFingering;
            trackFingeringComplexity = newTrackFingeringComplexity;
        }
    }
    return trackFingering;
}
export function localSearch(trackState, softConstraint, alternatives, attempts, disruption) {
    let trackFingeringComplexity = softConstraint.getPenalty();
    while (attempts--) {
        const changes = mutateTrackState(trackState, alternatives, disruption);
        const newTrackFingeringComplexity = softConstraint.getPenalty();
        if (newTrackFingeringComplexity <= trackFingeringComplexity) {
            trackFingeringComplexity = newTrackFingeringComplexity;
        }
        else {
            revertTrackStateChanges(trackState, changes);
        }
    }
}
export function slidingWindowExhaustiveSearch(trackFingering, windowSize = 7, staticContextSize = 3, windowStep = 3, depth = 2) {
    trackFingering = [...trackFingering];
    for (let i = 0; i < trackFingering.length - windowSize; i += windowStep) {
        let trackFingeringWindow = trackFingering.slice(i, i + windowSize);
        trackFingeringWindow = exhaustiveSearch(trackFingeringWindow, depth, i === 0 ? 0 : staticContextSize - 1, windowSize);
        let trackFingeringCandidate = [...trackFingering];
        trackFingeringCandidate.splice(i, windowSize, ...trackFingeringWindow);
        if (computeComplexity(trackFingeringCandidate) <= computeComplexity(trackFingering)) {
            trackFingering = trackFingeringCandidate;
        }
    }
    return trackFingering;
}
export function exhaustiveSearch(trackFingering, depth, start, end) {
    if (depth === 0)
        return trackFingering;
    if (start === undefined)
        start = 0;
    if (end === undefined)
        end = trackFingering.length;
    let trackFingeringComplexity = computeComplexity(trackFingering);
    let improvement = false;
    do {
        improvement = false;
        search: {
            for (let i = start; i < end; i++) {
                const note = trackFingering[i];
                for (const fingering of note.fingeringAlternatives) {
                    let newTrackFingering = [...trackFingering];
                    newTrackFingering[i] = Object.assign(Object.assign({}, newTrackFingering[i]), { fingering });
                    newTrackFingering = exhaustiveSearch(newTrackFingering, depth - 1, start, end);
                    const newTrackFingeringComplexity = computeComplexity(newTrackFingering);
                    if (newTrackFingeringComplexity < trackFingeringComplexity) {
                        trackFingering = newTrackFingering;
                        trackFingeringComplexity = newTrackFingeringComplexity;
                        improvement = true;
                        break search;
                    }
                }
            }
        }
    } while (improvement);
    return trackFingering;
}
