import { Alternatives, FingeringAlternatives, SoftConstraint, TrackStateStore } from "@/model/fingering/types";
import { TrackFingeringWithAlternatives } from "../types";
import { makeRandomTrackFingering } from "./fingering";
import { computeComplexity, setupSoftConstraints } from "./penalties";

export function mutateTrackFingering(trackFingering: TrackFingeringWithAlternatives, mutations: number) {
  const newTrackFingering = [...trackFingering];
  for (let i = 0; i < mutations; i++) {
    const randomIndex = Math.floor(Math.random() * newTrackFingering.length);
    const randomNote = newTrackFingering[randomIndex];
    const fingeringAlternatives = randomNote.fingeringAlternatives;
    newTrackFingering[randomIndex] = {
      ...newTrackFingering[randomIndex],
      fingering: fingeringAlternatives[Math.floor(Math.random() * fingeringAlternatives.length)]
    };
  }
  return newTrackFingering; 
}

export function mutateTrackState<S>(trackState: TrackStateStore<S>, alternatives: Alternatives<S>, mutations: number) {
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

export function revertTrackStateChanges<S>(trackState: TrackStateStore<S>, changes: { index: number, oldState: S, newState: S }[]) {
  for (const change of [...changes].reverse()) {
    trackState.change(change.index, change.newState, change.oldState);
  }
}

export function iterativeLocalSearch(trackFingering: TrackFingeringWithAlternatives, iterations: number, attemptsPerIteration: number, disruption: number) {
  
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

export function localSearchTrackFingering(trackFingering: TrackFingeringWithAlternatives, attempts: number, disruption: number) {

  const softConstraint = setupSoftConstraints(trackFingering);
  const alternatives = new FingeringAlternatives(trackFingering);
  const trackStateStore = new TrackStateStore(trackFingering.map(note => note.fingering), [
    softConstraint
  ]);

  localSearch(trackStateStore, softConstraint, alternatives, attempts, disruption);

  return trackFingering.map((note, i) => ({ ...note, fingering: trackStateStore.state[i] }));

}

export function localSearchSlow(trackFingering: TrackFingeringWithAlternatives, attempts: number, disruption: number) {

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

export function localSearch<S>(
  trackState: TrackStateStore<S>,
  softConstraint: SoftConstraint<S>,
  alternatives: Alternatives<S>,
  attempts: number, disruption: number
) {

  let trackFingeringComplexity = softConstraint.getPenalty();
  while (attempts--) {
    const changes = mutateTrackState(trackState, alternatives, disruption);
    const newTrackFingeringComplexity = softConstraint.getPenalty();
    if (newTrackFingeringComplexity <= trackFingeringComplexity) {
      trackFingeringComplexity = newTrackFingeringComplexity;
    } else {
      revertTrackStateChanges(trackState, changes);
    }
  }

}

export function slidingWindowExhaustiveSearch(
  trackFingering: TrackFingeringWithAlternatives,
  windowSize: number = 7,
  staticContextSize: number = 3,
  windowStep: number = 3,
  depth: number = 2
) {

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

export function exhaustiveSearch(trackFingering: TrackFingeringWithAlternatives, depth: number, start?: number, end?: number) {
  
  if (depth === 0) return trackFingering;
  if (start === undefined) start = 0;
  if (end === undefined) end = trackFingering.length;

  let trackFingeringComplexity = computeComplexity(trackFingering);
  let improvement = false;
  do {

    improvement = false;

    search: {
      for (let i = start; i < end; i++) {
        const note = trackFingering[i];

        for (const fingering of note.fingeringAlternatives) {

          let newTrackFingering = [...trackFingering];
          
          newTrackFingering[i] = { ...newTrackFingering[i], fingering };
  
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