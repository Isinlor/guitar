import { getRange } from "@/model/fingering/fingering";
import { noteNumberFromFrequency } from "./midi";
import { MidiNote, MidiNoteToFingeringAlternatives, MidiNoteToStringFretAlternatives, NumberRange, StringFret, StringFretAlternatives } from "./types";

export class Instrument {

  constructor(
    public readonly name: string,
    public readonly fretsAmount: number,
    public readonly baseFrequencies: Record<number, number>,
  ) {
  }

  public static get(name: string): Instrument {
    switch (name) {
      case "ukulele": return Instrument.ukulele();
      case "guitar": return Instrument.guitar();
      case "kantele": return Instrument.kantele();
      default: throw new Error(`No instrument found with name ${name}!`);
    }
  }

  public static ukulele(): Instrument {
    return new Instrument(
      "ukulele", 12, // the soprano ukulele tuning
      {
        1: 440,    // A string (1st, highest)
        2: 329.63, // E string
        3: 261.63, // C string
        4: 392     // G string (4th, highest pitch in reentrant tuning)
      }
    );
  }

  public static guitar(): Instrument {
    return new Instrument(
      "guitar", 12,
      {
        1: 329.63, // E string (1st, thinnest)
        2: 246.94, // B string
        3: 196.00, // G string
        4: 146.83, // D string
        5: 110.00, // A string
        6: 82.41   // E string (6th, thickest)
      }
    );
  }

  public static kantele(): Instrument {
    return new Instrument(
      "kantele", 0,
      {
        1: 783.99, // G5
        2: 739.99, // F#5
        3: 659.26, // E5
        4: 587.33, // D5
        5: 554.37, // C#5
        6: 493.88, // B4
        7: 440.00, // A4
        8: 392.00, // G4
        9: 369.99, // F#4
        10: 329.63, // E4
        11: 293.66  // D4
      }
    );
  }

  public get strings(): number[] {
    return Object.keys(this.baseFrequencies).map(Number);
  }

  public get frets(): number[] {
    return Array.from({ length: this.fretsAmount + 1 }, (_, i) => i);
  }

  public get midiNotes(): MidiNote[] {
    return [...this.midiNoteToStringFretAlternatives.keys()];
  }

  public get range(): { lowest: MidiNote, highest: MidiNote, range: number } {
    return {
      lowest: Math.min(...this.midiNotes),
      highest: Math.max(...this.midiNotes),
      range: Math.max(...this.midiNotes) - Math.min(...this.midiNotes) + 1
    };
  }

  public get midiNoteToStringFretAlternatives(): MidiNoteToStringFretAlternatives {
    const midiNoteToStringFretAlternatives = new Map<number, StringFretAlternatives>();
    for (const string of this.strings) {
      for (const fret of this.frets) {
        const note = this.stringFretToMidiNote({ string, fret });
        if (!midiNoteToStringFretAlternatives.has(note)) {
          midiNoteToStringFretAlternatives.set(note, []);
        }
        midiNoteToStringFretAlternatives.get(note)!.push({ string, fret });
      }
    }
    
    return new Map(
      [...midiNoteToStringFretAlternatives.entries()].sort((a, b) => a[0] - b[0])
    );
  }

  public getStringFretAlternatives(note: MidiNote): StringFretAlternatives {
    if (!this.midiNoteToStringFretAlternatives.has(note)) throw new Error(
      `No string fret alternatives available for note ${note} on the ${this.name}!`
    );
    return this.midiNoteToStringFretAlternatives.get(note)!;
  }

  public getFretAlternatives(note: MidiNote): number[] {
    return this.getStringFretAlternatives(note).map(({ fret }) => fret);
  }

  public canBePlayedOnOpenString(note: MidiNote): boolean {
    return this.getFretAlternatives(note).some(fret => fret === 0);
  }

  /**
   * Compute the viable fret ranges allowing to play the notes on a given instrument.
   */
  public getViableFretRangesForNotes(notes: MidiNote[]): NumberRange[] {

    notes = [...new Set(notes)]; // remove duplicates

    const fretAlternativesPerNote = notes.reduce((acc, note) => {
      acc[note] = this.getFretAlternatives(note);
      return acc;
    }, {} as Record<MidiNote, number[]>);

    const fretAlternativesPerNoteEntries = Object.entries(fretAlternativesPerNote);

    const fretsAlternatives = new Set<number>(Object.values(fretAlternativesPerNote).flat())
      
    const min = Math.min(...fretsAlternatives);
    const max = Math.max(...fretsAlternatives);

    const viableRangeAlternatives: NumberRange[] = [];
    for (let i = min; i <= max; i++) {
      for (let j = min; j <= max; j++) {
        
        const range = j - i + 1;
        if(range < 1) continue; // skip invalid ranges
        
        const isViableRange = fretAlternativesPerNoteEntries.every(
          ([, frets]) => frets.some(fret => fret === 0 || (fret >= i && fret <= j))
        );

        if (!isViableRange) continue;
        
        viableRangeAlternatives.push({ min: i, max: j, range });

      }
    }

    if (viableRangeAlternatives.length === 0) throw new Error(
      `No viable fret ranges available for notes ${notes} on the ${this.name}!`
    );

    return viableRangeAlternatives;

  }

  /**
   * Compute the smallest fret ranges allowing to play the notes on a given instrument.
   * Open strings are assumed to be always available.
   */
  public getSmallestFretRangesForNotes(notes: MidiNote[]): NumberRange[] {

    const fretRanges = this.getViableFretRangesForNotes(notes);
    const smallestRange = Math.min(...fretRanges.map(({ range }) => range));

    return fretRanges.filter(({ range }) => range === smallestRange);

  }

  public getLowestSmallestFretRangeForNotes(notes: MidiNote[]): NumberRange {
    
    const smallestFretRanges = this.getSmallestFretRangesForNotes(notes);
    return smallestFretRanges.reduce((acc, range) => {
      return range.min < acc.min ? range : acc;
    }, { min: Infinity, max: -Infinity, range: Infinity });

  }

  /**
   * Computes a compact fingerings for a range of notes on a given instrument.
   * We minimize the range of frets needed to play the notes to reduce hand movement.
   * Sometimes you will need 3 frets or less, removing the need for pinky finger.
   * You can increase the smallest needed fret range to allow for pinky use.
   * The open strings are always included in the fingerings.
   * 
   * @param {*} notes - An array of MIDI note numbers that have to be played.
   * @param {*} smallestNeededFretRange - The smallest fret range requested.
   */
  public getCompactFingeringAlternativesForNotes(notes: MidiNote[], fingers?: number[]): MidiNoteToFingeringAlternatives {

    notes = [...new Set(notes)]; // remove duplicates

    const { min: minFretNeededInitial, max: maxFretNeededInitial, range } = this.getLowestSmallestFretRangeForNotes(notes);
    let minFretNeeded = minFretNeededInitial;
    let maxFretNeeded = maxFretNeededInitial;

    if (fingers === undefined) fingers = Array.from({ length: Math.max(Math.min(4, range), 1) }, (_, i) => i + 1);
    
    const smallestNeededFretRange = fingers.length;

    // Increase the highest fret needed to allow for the smallest needed fret range
    // If the needed fret range is 2 - 2, and the smallest needed fret range is 3
    // We decrease min fret needed until fret 1 is included and then we include higher frets
    while (range < smallestNeededFretRange) {
      if (minFretNeeded > 1) {
        minFretNeeded--;
      } else {
        maxFretNeeded++;
      }
    }

    const compactFingeringAlternatives = new Map();
    for (const note of notes) {

      if (!compactFingeringAlternatives.has(note)) {
        compactFingeringAlternatives.set(note, []);
      }

      const stringFretAlternativesInRange = this.getStringFretAlternatives(note)
        .filter(({ fret }) => fret === 0 || (fret >= minFretNeeded && fret <= maxFretNeeded));
      
      if (stringFretAlternativesInRange.length === 0) throw new Error(
        `No fret positions available for note ${note} in the range ${minFretNeeded} - ${maxFretNeeded} on the ${this.name}!`
      );

      for (const finger of fingers) {
        stringFretAlternativesInRange.forEach(({ string, fret }) => {
          if(fret === 0 && finger !== 0) return; // open string can only be played with finger 0
          compactFingeringAlternatives.get(note).push({ string, fret, finger });
        });
      }

      stringFretAlternativesInRange.forEach(({ string, fret }) => {
        if (fret !== 0) return; // skip fretted notes
        compactFingeringAlternatives.get(note).push({ string, fret, finger: 0 });
      });

      if(compactFingeringAlternatives.get(note).length === 0) throw new Error(
        `No fret positions available for note ${note} with fingers ${fingers} in the range ${minFretNeeded} - ${maxFretNeeded} on the ${this.name}!`
      );

    }

    return compactFingeringAlternatives;

  }

  public findLowestTranspositionWithSmallestFretRange(notes: MidiNote[]) {
    return Math.min(...this.findTranspositionsWithSmallestFretRange(notes));
  }

  public findMostAccurateTranspositionWithSmallestFretRange(notes: MidiNote[]) {
    const transpositionsWithSmallestFretRange = this.findTranspositionsWithSmallestFretRange(notes);
    const mostAccurateTransposition = transpositionsWithSmallestFretRange.reduce((acc, transposition) => {
      return Math.abs(transposition) < Math.abs(acc) ? transposition : acc;
    }, transpositionsWithSmallestFretRange[0]);
    return mostAccurateTransposition;
  }

  public findLowestTransposition(notes: MidiNote[]) {
    return this.range.lowest - Math.min(...notes);
  }

  public findHighestTransposition(notes: MidiNote[]) {
    return this.range.highest - Math.max(...notes);
  }

  public getAllPossibleTranspositions(notes: MidiNote[]) {

    if(notes.length === 0) throw new Error('No notes provided for which to find transpositions.');
  
    const lowestTransposition = this.findLowestTransposition(notes);
    const highestTransposition = this.findHighestTransposition(notes);

    const startTransposition = Math.min(lowestTransposition, highestTransposition);
    const endTransposition = Math.max(lowestTransposition, highestTransposition);

    const transpositions = [];
    for (let i = startTransposition; i <= endTransposition; i++) {
      transpositions.push(i);
    }

    return transpositions;

  }

  public findTranspositionsWithSmallestFretRange(notes: MidiNote[]) {

    notes = [...new Set(notes)]; // remove duplicates

    let transpositionsWithSmallestFretRange: number[] = [];
    let smallestFoundFretRange = Infinity;
    for (const transposition of this.getAllPossibleTranspositions(notes)) {
      
      const transposedNotes = notes.map(note => note + transposition);
      const fretRanges = this.getViableFretRangesForNotes(transposedNotes);
      const smallestFretRange = Math.min(...fretRanges.map(({ range }) => range));
      
      if (smallestFretRange < smallestFoundFretRange) {
        smallestFoundFretRange = smallestFretRange;
        transpositionsWithSmallestFretRange = [transposition];
      } else if (smallestFretRange === smallestFoundFretRange) {
        transpositionsWithSmallestFretRange.push(transposition);
      }
      
    }

    return transpositionsWithSmallestFretRange;
    
  }

  public findMostAccurateTransposition(notes: MidiNote[]) {

    const midiRange = getRange(notes);
  
    const instrumentRange = this.range;
  
    // check if transposition is needed
    if (midiRange.min > instrumentRange.lowest && midiRange.max < instrumentRange.highest) {
      return 0; 
    }
  
    // check if transposition is possible
    if (midiRange.range > instrumentRange.range) throw new Error(
      `The midi has range ${midiRange.range} of notes, which is greater than the range of the ${this.name} notes.`
    );
  
    const lowestNotesDistance = instrumentRange.lowest - midiRange.min;
    const highestNotesDistance = instrumentRange.highest - midiRange.max;
  
    // return the smallest distance
    return Math.abs(lowestNotesDistance) < Math.abs(highestNotesDistance)
      ? lowestNotesDistance
      : highestNotesDistance;
  
  };

  /**
   * Converts a string number and fret number to the corresponding frequency for a string instrument.
   * 
   * @returns {number} The frequency in Hz for the given string and fret combination.
   */
  public stringFretToFrequency(stringFret: StringFret): number {
    const openStringBaseFrequency = this.baseFrequencies[stringFret.string];
    return openStringBaseFrequency * Math.pow(2, stringFret.fret / 12);
  }

  /**
   * Converts a string number and fret number to the corresponding MIDI note number for a string instrument.
   * 
   * @returns {MidiNote} The MIDI note number for the given string and fret combination.
   */
  public stringFretToMidiNote(stringFret: StringFret): MidiNote {
    return noteNumberFromFrequency(this.stringFretToFrequency(stringFret));
  }
  
}