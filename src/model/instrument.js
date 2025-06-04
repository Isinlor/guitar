import { getRange } from "@/model/fingering/fingering";
import { noteNumberFromFrequency } from "./midi";
export class Instrument {
    constructor(name, fretsAmount, baseFrequencies) {
        this.name = name;
        this.fretsAmount = fretsAmount;
        this.baseFrequencies = baseFrequencies;
    }
    static get(name) {
        switch (name) {
            case "ukulele": return Instrument.ukulele();
            case "guitar": return Instrument.guitar();
            default: throw new Error(`No instrument found with name ${name}!`);
        }
    }
    static ukulele() {
        return new Instrument("ukulele", 12, // the soprano ukulele tuning
        {
            1: 440, // A string (1st, highest)
            2: 329.63, // E string
            3: 261.63, // C string
            4: 392 // G string (4th, highest pitch in reentrant tuning)
        });
    }
    static guitar() {
        return new Instrument("guitar", 12, {
            1: 329.63, // E string (1st, thinnest)
            2: 246.94, // B string
            3: 196.00, // G string
            4: 146.83, // D string
            5: 110.00, // A string
            6: 82.41 // E string (6th, thickest)
        });
    }
    get strings() {
        return Object.keys(this.baseFrequencies).map(Number);
    }
    get frets() {
        return Array.from({ length: this.fretsAmount + 1 }, (_, i) => i);
    }
    get midiNotes() {
        return [...this.midiNoteToStringFretAlternatives.keys()];
    }
    get range() {
        return {
            lowest: Math.min(...this.midiNotes),
            highest: Math.max(...this.midiNotes),
            range: Math.max(...this.midiNotes) - Math.min(...this.midiNotes) + 1
        };
    }
    get midiNoteToStringFretAlternatives() {
        const midiNoteToStringFretAlternatives = new Map();
        for (const string of this.strings) {
            for (const fret of this.frets) {
                const note = this.stringFretToMidiNote({ string, fret });
                if (!midiNoteToStringFretAlternatives.has(note)) {
                    midiNoteToStringFretAlternatives.set(note, []);
                }
                midiNoteToStringFretAlternatives.get(note).push({ string, fret });
            }
        }
        return new Map([...midiNoteToStringFretAlternatives.entries()].sort((a, b) => a[0] - b[0]));
    }
    getStringFretAlternatives(note) {
        if (!this.midiNoteToStringFretAlternatives.has(note))
            throw new Error(`No string fret alternatives available for note ${note} on the ${this.name}!`);
        return this.midiNoteToStringFretAlternatives.get(note);
    }
    getFretAlternatives(note) {
        return this.getStringFretAlternatives(note).map(({ fret }) => fret);
    }
    canBePlayedOnOpenString(note) {
        return this.getFretAlternatives(note).some(fret => fret === 0);
    }
    /**
     * Compute the viable fret ranges allowing to play the notes on a given instrument.
     */
    getViableFretRangesForNotes(notes) {
        notes = [...new Set(notes)]; // remove duplicates
        const fretAlternativesPerNote = notes.reduce((acc, note) => {
            acc[note] = this.getFretAlternatives(note);
            return acc;
        }, {});
        const fretAlternativesPerNoteEntries = Object.entries(fretAlternativesPerNote);
        const fretsAlternatives = new Set(Object.values(fretAlternativesPerNote).flat());
        const min = Math.min(...fretsAlternatives);
        const max = Math.max(...fretsAlternatives);
        const viableRangeAlternatives = [];
        for (let i = min; i <= max; i++) {
            for (let j = min; j <= max; j++) {
                const range = j - i + 1;
                if (range < 1)
                    continue; // skip invalid ranges
                const isViableRange = fretAlternativesPerNoteEntries.every(([_, frets]) => frets.some(fret => fret === 0 || (fret >= i && fret <= j)));
                if (!isViableRange)
                    continue;
                viableRangeAlternatives.push({ min: i, max: j, range });
            }
        }
        if (viableRangeAlternatives.length === 0)
            throw new Error(`No viable fret ranges available for notes ${notes} on the ${this.name}!`);
        return viableRangeAlternatives;
    }
    /**
     * Compute the smallest fret ranges allowing to play the notes on a given instrument.
     * Open strings are assumed to be always available.
     */
    getSmallestFretRangesForNotes(notes) {
        const fretRanges = this.getViableFretRangesForNotes(notes);
        const smallestRange = Math.min(...fretRanges.map(({ range }) => range));
        return fretRanges.filter(({ range }) => range === smallestRange);
    }
    getLowestSmallestFretRangeForNotes(notes) {
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
    getCompactFingeringAlternativesForNotes(notes, fingers) {
        notes = [...new Set(notes)]; // remove duplicates
        let { min: minFretNeeded, max: maxFretNeeded, range } = this.getLowestSmallestFretRangeForNotes(notes);
        if (fingers === undefined)
            fingers = Array.from({ length: Math.max(Math.min(4, range), 1) }, (_, i) => i + 1);
        const smallestNeededFretRange = fingers.length;
        // Increase the highest fret needed to allow for the smallest needed fret range
        // If the needed fret range is 2 - 2, and the smallest needed fret range is 3
        // We decrease min fret needed until fret 1 is included and then we include higher frets
        while (range < smallestNeededFretRange) {
            if (minFretNeeded > 1) {
                minFretNeeded--;
            }
            else {
                maxFretNeeded++;
            }
        }
        const compactFingeringAlternatives = new Map();
        for (let note of notes) {
            if (!compactFingeringAlternatives.has(note)) {
                compactFingeringAlternatives.set(note, []);
            }
            const stringFretAlternativesInRange = this.getStringFretAlternatives(note)
                .filter(({ fret }) => fret === 0 || (fret >= minFretNeeded && fret <= maxFretNeeded));
            if (stringFretAlternativesInRange.length === 0)
                throw new Error(`No fret positions available for note ${note} in the range ${minFretNeeded} - ${maxFretNeeded} on the ${this.name}!`);
            for (const finger of fingers) {
                stringFretAlternativesInRange.forEach(({ string, fret }) => {
                    if (fret === 0 && finger !== 0)
                        return; // open string can only be played with finger 0
                    compactFingeringAlternatives.get(note).push({ string, fret, finger });
                });
            }
            stringFretAlternativesInRange.forEach(({ string, fret }) => {
                if (fret !== 0)
                    return; // skip fretted notes
                compactFingeringAlternatives.get(note).push({ string, fret, finger: 0 });
            });
            if (compactFingeringAlternatives.get(note).length === 0)
                throw new Error(`No fret positions available for note ${note} with fingers ${fingers} in the range ${minFretNeeded} - ${maxFretNeeded} on the ${this.name}!`);
        }
        return compactFingeringAlternatives;
    }
    findLowestTranspositionWithSmallestFretRange(notes) {
        return Math.min(...this.findTranspositionsWithSmallestFretRange(notes));
    }
    findMostAccurateTranspositionWithSmallestFretRange(notes) {
        const transpositionsWithSmallestFretRange = this.findTranspositionsWithSmallestFretRange(notes);
        const mostAccurateTransposition = transpositionsWithSmallestFretRange.reduce((acc, transposition) => {
            return Math.abs(transposition) < Math.abs(acc) ? transposition : acc;
        }, transpositionsWithSmallestFretRange[0]);
        return mostAccurateTransposition;
    }
    findLowestTransposition(notes) {
        return this.range.lowest - Math.min(...notes);
    }
    findHighestTransposition(notes) {
        return this.range.highest - Math.max(...notes);
    }
    getAllPossibleTranspositions(notes) {
        if (notes.length === 0)
            throw new Error('No notes provided for which to find transpositions.');
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
    findTranspositionsWithSmallestFretRange(notes) {
        notes = [...new Set(notes)]; // remove duplicates
        let transpositionsWithSmallestFretRange = [];
        let smallestFoundFretRange = Infinity;
        for (let transposition of this.getAllPossibleTranspositions(notes)) {
            const transposedNotes = notes.map(note => note + transposition);
            const fretRanges = this.getViableFretRangesForNotes(transposedNotes);
            const smallestFretRange = Math.min(...fretRanges.map(({ range }) => range));
            if (smallestFretRange < smallestFoundFretRange) {
                smallestFoundFretRange = smallestFretRange;
                transpositionsWithSmallestFretRange = [transposition];
            }
            else if (smallestFretRange === smallestFoundFretRange) {
                transpositionsWithSmallestFretRange.push(transposition);
            }
        }
        return transpositionsWithSmallestFretRange;
    }
    findMostAccurateTransposition(notes) {
        const midiRange = getRange(notes);
        const instrumentRange = this.range;
        // check if transposition is needed
        if (midiRange.min > instrumentRange.lowest && midiRange.max < instrumentRange.highest) {
            return 0;
        }
        // check if transposition is possible
        if (midiRange.range > instrumentRange.range)
            throw new Error(`The midi has range ${midiRange.range} of notes, which is greater than the range of the ${this.name} notes.`);
        const lowestNotesDistance = instrumentRange.lowest - midiRange.min;
        const highestNotesDistance = instrumentRange.highest - midiRange.max;
        // return the smallest distance
        return Math.abs(lowestNotesDistance) < Math.abs(highestNotesDistance)
            ? lowestNotesDistance
            : highestNotesDistance;
    }
    ;
    /**
     * Converts a string number and fret number to the corresponding frequency for a string instrument.
     *
     * @returns {number} The frequency in Hz for the given string and fret combination.
     */
    stringFretToFrequency(stringFret) {
        const openStringBaseFrequency = this.baseFrequencies[stringFret.string];
        return openStringBaseFrequency * Math.pow(2, stringFret.fret / 12);
    }
    /**
     * Converts a string number and fret number to the corresponding MIDI note number for a string instrument.
     *
     * @returns {MidiNote} The MIDI note number for the given string and fret combination.
     */
    stringFretToMidiNote(stringFret) {
        return noteNumberFromFrequency(this.stringFretToFrequency(stringFret));
    }
}
