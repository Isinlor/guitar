import { FingersCrossingPenalty, HandMovementPenalty, SimpleSoftConstraint } from "@/model/fingering/constraints";
import { CountFrets, CountLessUsedFingeringsPerNote, CountUniqueFingerings, CountUniqueFretFinger, HighFingers, HighFrets } from "@/model/fingering/counters";
import { CompositeSoftConstraint, SoftConstraint, WeightedSoftConstraint } from "@/model/fingering/types";
import { Fingering, MidiNote, TrackFingering } from "../types";
import { fingeringToString, fretFingerToString } from "./fingering";

export function countFrets(trackFingering: TrackFingering) {
  return new Set(trackFingering.map(note => note.fingering.fret)).size;
}

export function highFrets(trackFingering: TrackFingering) {
  return [...new Set(trackFingering.map(note => note.fingering.fret))].reduce((acc, fret) => acc + fret, 0);
}

export function highFingers(trackFingering: TrackFingering) {
  return [...new Set(trackFingering.map(note => note.fingering.finger))].reduce((acc, finger) => acc + finger, 0);
}

export function countStrings(trackFingering: TrackFingering) {
  return new Set(trackFingering.map(note => note.fingering.string)).size;
}

export function countFingers(trackFingering: TrackFingering) {
  return new Set(trackFingering.map(note => note.fingering.finger)).size;
}

export function countUniqueFretFinger(trackFingering: TrackFingering) {
  return new Set(trackFingering.map(note => fretFingerToString(note.fingering))).size;
}

export function countUniqueFingerings(trackFingering: TrackFingering) {
  return new Set(trackFingering.map(note => fingeringToString(note.fingering))).size;
}

export function countLessUsedFingeringsPerNote(trackFingering: TrackFingering) {

  const countFingeringsPerNote: Record<MidiNote, Record<string, number>> = {};
  trackFingering.forEach((note) => {
    
    const fingeringString = fingeringToString(note.fingering);
    if (!countFingeringsPerNote[note.note]) {
      countFingeringsPerNote[note.note] = {};
    }

    if (!countFingeringsPerNote[note.note][fingeringString]) {
      countFingeringsPerNote[note.note][fingeringString] = 1;
    } else {
      countFingeringsPerNote[note.note][fingeringString]++;
    }

  });

  let penalty = 0;
  for (const note in countFingeringsPerNote) {
    const fingerings = countFingeringsPerNote[note];
    const maxCount = Math.max(...Object.values(fingerings));
    penalty += Object.values(fingerings).reduce((acc, count) => acc + count, 0) - maxCount;
  }

  return penalty;

}

export function fingersCrossingPenalty(trackFingering: TrackFingering) {
  let penalty = 0;
  for (let i = 0; i < trackFingering.length - 1; i++) {
    const currentFingering = trackFingering[i].fingering;
    const nextFingering = trackFingering[i + 1].fingering;
    const moveToHigherFret = currentFingering.fret < nextFingering.fret;
    const moveToHigherFinger = currentFingering.finger < nextFingering.finger;
    if (moveToHigherFret && !moveToHigherFinger) penalty += 1;
    if (!moveToHigherFret && moveToHigherFinger) penalty += 1;
  }
  return penalty;
}

// export function sameFretFingerPenalty(trackFingering: TrackFingerings) {
//   let penalty = 0;
//   for (let i = 0; i < trackFingering.length - 1; i++) {
//     const currentFingering = trackFingering[i].fingering;
//     const nextFingering = trackFingering[i + 1].fingering;
//     const moveToHigherFret = currentFingering.fret < nextFingering.fret;
//     const moveToHigherFinger = currentFingering.finger < nextFingering.finger;
//     if (moveToHigherFret && !moveToHigherFinger) penalty += 1;
//     if (!moveToHigherFret && moveToHigherFinger) penalty += 1;
//   }
//   return penalty;
// }

export function stringFretVelocityPenalty(trackFingering: TrackFingering) {
  let penalty = 0;
  for (let i = 0; i < trackFingering.length - 1; i++) {
    const currentFingering = trackFingering[i].fingering;
    const nextFingering = trackFingering[i + 1].fingering;
    const distance = Math.abs(currentFingering.fret - nextFingering.fret) * 5 + Math.abs(currentFingering.string - nextFingering.string);
    const time = trackFingering[i + 1].startTimeMs - trackFingering[i].startTimeMs;
    penalty += distance / time;
  }
  return Math.ceil(penalty * 100);
}

// TODO: improve by using last known position of the finger and ignore if far enough
export function fingerVelocityPenalty(trackFingering: TrackFingering) {
  let penalty = 0;
  for (let i = 0; i < trackFingering.length - 1; i++) {
    const currentFingering = trackFingering[i].fingering;
    const nextFingering = trackFingering[i + 1].fingering;
    if (currentFingering.fret === 0 || nextFingering.fret === 0) continue;
    if (currentFingering.finger !== nextFingering.finger) continue;
    const distance = Math.abs(currentFingering.fret - nextFingering.fret) * 5 + Math.abs(currentFingering.string - nextFingering.string);
    const time = trackFingering[i + 1].startTimeMs - trackFingering[i].startTimeMs;
    penalty += distance / time;
  }
  return Math.ceil(penalty * 1000);
}

export function fingerStringJumpingPenalty(trackFingering: TrackFingering) {
  let penalty = 0;
  const fingersPositions: Record<number, { string: number }> = {};
  trackFingering.forEach((noteEvent) => {
    const { finger, string } = noteEvent.fingering;
    const previousFingerPosition = fingersPositions[finger];
    if (previousFingerPosition) {
      penalty += Math.abs(string - previousFingerPosition.string);
    }
    if (!previousFingerPosition || previousFingerPosition.string !== string) {
      fingersPositions[finger] = { string };
    }
  });
  return penalty;
}

export function handMovementPenalty(trackFingering: TrackFingering) {
  let penalty = 0;
  let movement = 0;
  for (let i = 0; i < trackFingering.length - 1; i++) {
    let currentFingering = trackFingering[i].fingering;
    let nextFingering = trackFingering[i + 1].fingering;
    if (currentFingering.fret === 0 || nextFingering.fret === 0) {
      let j = 1;
      while (currentFingering.fret === 0 && i - j >= 0) {
        currentFingering = trackFingering[i - j].fingering;
        j++;
      }
      let k = 2 
      while (nextFingering.fret === 0 && i + k < trackFingering.length) {
        nextFingering = trackFingering[i + k].fingering;
        k++;
      }
      // we have open notes at the edge of the track; no penalty for that
      if (currentFingering.fret === 0 || nextFingering.fret === 0) continue;
    }
    const fretChange = nextFingering.fret - currentFingering.fret;
    const fingerChange = nextFingering.finger - currentFingering.finger;
    if (fretChange === fingerChange) continue;
    // fret 1 finger 1 -> fret 2 (+1) finger 2 (+1) = 0 // 2 - 1 - 1 = 0
    // fret 1 finger 1 -> fret 4 (+3) finger 4 (+3) = 0
    // fret 1 finger 1 -> fret 2 (+1) finger 1 (0) = 1 // 2 - 0 - 1 = 1
    // fret 1 finger 1 -> fret 1 (0) finger 2 (+1) = 1 // 1 - 1 - 1 = -1
    // fret 1 finger 1 -> fret 12 (+11) finger 1 (0) = 11 // 12 - 0 - 1 = 11
    // fret 1 finger 1 -> fret 7 (+6) finger 1 (0) = 7 // 7 - 0 - 1 = 6
    // fret 1 finger 1 -> fret 2 (+1) finger 3 (+2) = 1 // 2 - 2 - 1 = -1
    // fret 1 finger 1 -> fret 12 (+11) finger 4 (+3) // 12 - 3 - 1 = 7
    // fret 1 finger 1 -> fret 12 (+11) finger 4 (+3) = fret 1 finger 1 -> fret 9 (+8) finger 1 (0) = 7
    // fret 1 finger 1 -> fret 9 (+8) finger 1 = fret 9 finger 1 -> fret 1 finger 1 = 7
    // fret 8 finger 1 -> fret 1 (-7) finger 1 (0) = // -8 - 0 + 8 = 1
    penalty += 5 + Math.abs(fretChange - fingerChange) ** 2;
    movement += 1;
  }
  return penalty + movement ** 4;
}

// console.log(
//   "handMovementPenalties ",
//   handMovementPenalty([
//     { fingering: { fret: 1, finger: 1 } },
//     { fingering: { fret: 3, finger: 4 } },
//   ]), // 1 or 6
//   handMovementPenalty([
//     { fingering: { fret: 1, finger: 2 } },
//     { fingering: { fret: 3, finger: 3 } },
//   ]) // 1 or 6
// );

// exit process
// process.exit(0);

export function computeComplexity(trackFingering: TrackFingering) {
  return countFrets(trackFingering) * 2
    + Math.floor(highFrets(trackFingering))
    + Math.floor(highFingers(trackFingering))
    // + countStrings(trackFingering)
    // + countFingers(trackFingering)
    + countLessUsedFingeringsPerNote(trackFingering)
    + countUniqueFretFinger(trackFingering) * 3
    + countUniqueFingerings(trackFingering) * 5
    + fingersCrossingPenalty(trackFingering) * 100
    // + stringFretVelocityPenalty(trackFingering)
    + fingerVelocityPenalty(trackFingering)
    + fingerStringJumpingPenalty(trackFingering)
    + handMovementPenalty(trackFingering) * 10;
}

export function reportComplexity(trackFingering: TrackFingering) {
  return {
    countStrings: countStrings(trackFingering),
    countFrets: countFrets(trackFingering),
    highFrets: highFrets(trackFingering),
    highFingers: highFingers(trackFingering),
    countLessUsedFingeringsPerNote: countLessUsedFingeringsPerNote(trackFingering),
    countFretFinger: countUniqueFretFinger(trackFingering),
    countFingerings: countUniqueFingerings(trackFingering),
    fingersCrossingPenalty: fingersCrossingPenalty(trackFingering),
    fingerStringJumpingPenalty: fingerStringJumpingPenalty(trackFingering),
    fingerVelocityPenalty: fingerVelocityPenalty(trackFingering),
    handMovementPenalty: handMovementPenalty(trackFingering)
  };
};

export function setupSoftConstraints(trackFingering: TrackFingering): SoftConstraint<Fingering>  {
  const softConstraints = [
    new WeightedSoftConstraint(new CountFrets(trackFingering), 2),
    new WeightedSoftConstraint(new HighFrets(trackFingering), 1),
    new WeightedSoftConstraint(new HighFingers(trackFingering), 1),
    new WeightedSoftConstraint(new CountLessUsedFingeringsPerNote(trackFingering), 1),
    new WeightedSoftConstraint(new CountUniqueFretFinger(trackFingering), 3),
    new WeightedSoftConstraint(new CountUniqueFingerings(trackFingering), 5),
    new WeightedSoftConstraint(new FingersCrossingPenalty(trackFingering), 100),
    new WeightedSoftConstraint(new SimpleSoftConstraint((trackFingering: TrackFingering) => fingerVelocityPenalty(trackFingering), trackFingering), 1),
    new WeightedSoftConstraint(new SimpleSoftConstraint((trackFingering: TrackFingering) => fingerStringJumpingPenalty(trackFingering), trackFingering), 1),
    new WeightedSoftConstraint(new HandMovementPenalty(trackFingering), 10)
  ];
  return new CompositeSoftConstraint(softConstraints);
}