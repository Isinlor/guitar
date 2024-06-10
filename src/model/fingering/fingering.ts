export function fingeringToString(fingering: Fingering) {
  return `${fingering.string}:${fingering.fret}:${fingering.finger}`;
}

export function fretFingerToString(fingering: Fingering) {
  return `${fingering.fret}:${fingering.finger}`;
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