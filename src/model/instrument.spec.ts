import { describe, it, expect } from 'vitest'

import { Instrument } from './instrument'

describe('Instrument', () => {

  describe('kantele', () => {
    it('should create an 15-string kantele', () => {
      const instrument = Instrument.kantele();
      expect(instrument.strings).toHaveLength(15);
      expect(instrument.fretsAmount).toBe(0);
      expect(instrument.baseFrequencies[1]).toBeCloseTo(783.99);
      expect(instrument.baseFrequencies[11]).toBeCloseTo(293.66);
    });

    it('should be retrievable via Instrument.get', () => {
      const instrument = Instrument.get('kantele');
      expect(instrument.strings).toHaveLength(15);
    });
  });

  describe('getStringFretAlternatives', () => {

    it('should return the string and fret alternatives for a single note', () => {
      const instrument = Instrument.guitar();
      const alternatives = instrument.getStringFretAlternatives(40);
      expect(alternatives).toEqual([
        { string: 6, fret: 0 },
      ]);
    });

  });

  describe('getSmallestFretRangesForNotes', () => {

    it('should return the smallest fret range for a single note', () => {
      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([40]);
      expect(fretRanges).toEqual([{ min: 0, max: 0, range: 1 }]);
    });

    it('should return the smallest fret range for a single duplicated note', () => {
      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([40, 40]);
      expect(fretRanges).toEqual([{ min: 0, max: 0, range: 1 }]);
    });

    it('should assume that open string can alway be played', () => {
      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([40, 41]);
      expect(fretRanges).toEqual([{ min: 1, max: 1, range: 1 }]);
    });

    it('should return six of one fret ranges (one open) for note 45', () => {
      
      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([
        45,
      ]);
    
      expect(fretRanges).toEqual([
        { min: 0, max: 0, range: 1 },
        { min: 1, max: 1, range: 1 },
        { min: 2, max: 2, range: 1 },
        { min: 3, max: 3, range: 1 },
        { min: 4, max: 4, range: 1 },
        { min: 5, max: 5, range: 1 },
      ]);

    });

    it('should return two of one fret ranges for note 46', () => {

      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([
        46,
      ]);
    
      expect(fretRanges).toEqual([
        { min: 1, max: 1, range: 1 },
        { min: 6, max: 6, range: 1 },
      ]);

    });

    it('should return the smallest fret ranges for many notes', () => {

      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([
        44, 46, 47, 49, 51, 52, 54, 56,
      ]);
    
      expect(fretRanges).toEqual([
        { min: 1, max: 4, range: 4 },
        { min: 4, max: 7, range: 4 },
      ]);

    });

    it('should return the last fret for the most extreme notes', () => {

      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([
        40, 76,
      ]);
    
      expect(fretRanges).toEqual([{ min: 12, max: 12, range: 1 }]);

    });

    it('should return the whole fret range for the notes 41, 76', () => {

      const instrument = Instrument.guitar();
      const fretRanges = instrument.getSmallestFretRangesForNotes([
        41, 76,
      ]);
    
      expect(fretRanges).toEqual([{ min: 1, max: 12, range: 12 }]);

    });

  });

  describe('getCompactFingeringAlternativesForNotes', () => {

    it('should return the compact fingering alternatives for a single note', () => {
      const instrument = Instrument.guitar();
      const alternatives = instrument.getCompactFingeringAlternativesForNotes([40]);
      expect(alternatives).toEqual(new Map([
        [40, [{ string: 6, fret: 0, finger: 0 }]],
      ]));
    });
    
  });

  describe('findTranspositionsWithSmallestFretRange', () => {

    it('should return the whole range of transpositions for the lowest note', () => {

      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([40]);

      expect(transpositions).toEqual(Array.from({ length: 37 }, (_, i) => i));
    
    });

    it('should return the whole range of transpositions for the highest note', () => {

      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([76]);

      expect(transpositions).toEqual(Array.from({ length: 37 }, (_, i) => i === 0 ? 0 : -i).reverse());
    
    });

    it('should return 0 transposition for the most extreme notes', () => {

      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([
        40, 76,
      ]);

      expect(transpositions).toEqual([0]);

    });

    it('should return the transpositions for notes with highest fret range', () => {
      
      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([41, 76]);
      
      expect(transpositions).toEqual([-1]);

    });

    it('should return the transpositions for middle open strings', () => {

      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([
        45, 50, 55, 59
      ]);

      expect(transpositions).toEqual([
        -5, -4, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
      ]);

    });

    it('should return the transpositions for many notes', () => {

      const instrument = Instrument.guitar();
      const transpositions = instrument.findTranspositionsWithSmallestFretRange([
        44, 46, 47, 49, 51, 52, 54, 56,
      ]);

      expect(transpositions).toEqual([-4, 1]);

    });

  });

});