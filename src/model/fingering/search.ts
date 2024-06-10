import { TrackFingeringWithAlternatives } from "../types";
import { makeRandomTrackFingering } from "./fingering";
import { computeComplexity } from "./penalties";

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

export function iterativeLocalSearch(trackFingering: TrackFingeringWithAlternatives, iterations: number, attemptsPerIteration: number, disruption: number) {
  
  trackFingering = [...trackFingering];

  let bestComplexity = Infinity;
  for (let i = 0; i < iterations; i++) {
    let candidateTrackFingering = localSearch(makeRandomTrackFingering(trackFingering), attemptsPerIteration, disruption);
    let candidateComplexity = computeComplexity(candidateTrackFingering);
    if (candidateComplexity < bestComplexity) {
      trackFingering = candidateTrackFingering;
      bestComplexity = candidateComplexity;
    }
  }

  return trackFingering;
  
}

export function localSearch(trackFingering: TrackFingeringWithAlternatives, attempts: number, disruption: number) {

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