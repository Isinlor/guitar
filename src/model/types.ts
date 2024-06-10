export type MidiNote = number;

export type NumberRange = { min: number, max: number, range: number };

export type NoteEvent = {
  note: MidiNote;
  startTimeMs: number;
  durationMs: number;
};

export type NoteEventWithFingering = NoteEvent & {
  fingering: Fingering;
}

export type NoteEventWithFingeringAlternatives = NoteEvent & {
  fingeringAlternatives: FingeringAlternatives;
}

export type NoteEventWithFingeringAndAlternatives = NoteEventWithFingering & NoteEventWithFingeringAlternatives;

export type TrackFingering = NoteEventWithFingering[];

export type TrackFingeringWithAlternatives = NoteEventWithFingeringAndAlternatives[];

export type StringFret = {
  string: number; // The number of the string (1-indexed).
  fret: number; // The number of the fret (0 for open string).
};

export type StringFretAlternatives = StringFret[];

export type MidiNoteToStringFretAlternatives = Map<MidiNote, StringFretAlternatives>;

export type MidiNoteToFingeringAlternatives = Map<MidiNote, FingeringAlternatives>;

export type Fingering = StringFret & {
  finger: number;  // Finger used to press the string
};

export type FingeringAlternatives = Fingering[];