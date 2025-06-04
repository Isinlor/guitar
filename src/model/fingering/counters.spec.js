import { FingersCrossingPenalty } from '@/model/fingering/constraints';
import { CountFingers, CountFrets, CountLessUsedFingeringsPerNote, CountStrings, CountUniqueFingerings, CountUniqueFretFinger, HighFingers, HighFrets } from '@/model/fingering/counters';
import { beforeEach, describe, expect, it } from 'vitest';
describe('Fingering Penalty Classes', () => {
    const irrelevant = { startTimeMs: 0, durationMs: 0 };
    let trackFingering;
    beforeEach(() => {
        trackFingering = [
            Object.assign({ note: 60, fingering: { fret: 1, finger: 1, string: 1 } }, irrelevant),
            Object.assign({ note: 62, fingering: { fret: 3, finger: 2, string: 1 } }, irrelevant),
            Object.assign({ note: 64, fingering: { fret: 5, finger: 3, string: 2 } }, irrelevant),
        ];
    });
    describe('CountFrets', () => {
        it('should count unique frets', () => {
            const counter = new CountFrets(trackFingering);
            expect(counter.getPenalty()).toBe(3);
        });
        it('should update count on change', () => {
            const counter = new CountFrets(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 3, finger: 1, string: 1 });
            expect(counter.getPenalty()).toBe(2);
        });
    });
    describe('HighFrets', () => {
        it('should sum unique frets', () => {
            const counter = new HighFrets(trackFingering);
            expect(counter.getPenalty()).toBe(9); // 1 + 3 + 5
        });
        it('should update sum on change', () => {
            const counter = new HighFrets(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 7, finger: 1, string: 1 });
            expect(counter.getPenalty()).toBe(15); // 3 + 5 + 7
        });
    });
    describe('HighFingers', () => {
        it('should sum unique fingers', () => {
            const counter = new HighFingers(trackFingering);
            expect(counter.getPenalty()).toBe(6); // 1 + 2 + 3
        });
        it('should update sum on change', () => {
            const counter = new HighFingers(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 1, finger: 4, string: 1 });
            expect(counter.getPenalty()).toBe(9); // 2 + 3 + 4
        });
    });
    describe('CountStrings', () => {
        it('should count unique strings', () => {
            const counter = new CountStrings(trackFingering);
            expect(counter.getPenalty()).toBe(2);
        });
        it('should update count on change', () => {
            const counter = new CountStrings(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 1, finger: 1, string: 3 });
            expect(counter.getPenalty()).toBe(3);
        });
    });
    describe('CountFingers', () => {
        it('should count unique fingers', () => {
            const counter = new CountFingers(trackFingering);
            expect(counter.getPenalty()).toBe(3);
        });
        it('should update count on change', () => {
            const counter = new CountFingers(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 1, finger: 2, string: 1 });
            expect(counter.getPenalty()).toBe(2);
        });
    });
    describe('CountUniqueFretFinger', () => {
        it('should count unique fret-finger combinations', () => {
            const counter = new CountUniqueFretFinger(trackFingering);
            expect(counter.getPenalty()).toBe(3);
        });
        it('should update count on change', () => {
            const counter = new CountUniqueFretFinger(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 3, finger: 2, string: 1 });
            expect(counter.getPenalty()).toBe(2);
        });
    });
    describe('CountUniqueFingerings', () => {
        it('should count unique fingerings', () => {
            const counter = new CountUniqueFingerings(trackFingering);
            expect(counter.getPenalty()).toBe(3);
        });
        it('should update count on change', () => {
            const counter = new CountUniqueFingerings(trackFingering);
            counter.change(0, { fret: 1, finger: 1, string: 1 }, { fret: 3, finger: 2, string: 1 });
            expect(counter.getPenalty()).toBe(2);
        });
    });
    describe('CountLessUsedFingeringsPerNote', () => {
        it('should calculate penalty for less used fingerings', () => {
            const extendedTrack = [
                ...trackFingering,
                Object.assign({ note: 60, fingering: { fret: 2, finger: 2, string: 2 } }, irrelevant)
            ];
            const counter = new CountLessUsedFingeringsPerNote(extendedTrack);
            expect(counter.getPenalty()).toBe(1); // One less used fingering for note 60
        });
        it('should update penalty on change', () => {
            const extendedTrack = [
                ...trackFingering,
                Object.assign({ note: 60, fingering: { fret: 2, finger: 2, string: 2 } }, irrelevant)
            ];
            const counter = new CountLessUsedFingeringsPerNote(extendedTrack);
            counter.change(3, { fret: 2, finger: 2, string: 2 }, { fret: 1, finger: 1, string: 1 });
            expect(counter.getPenalty()).toBe(0); // No less used fingerings after change
        });
    });
    describe('FingersCrossingPenalty', () => {
        it('should calculate fingers crossing penalty', () => {
            const counter = new FingersCrossingPenalty(trackFingering);
            expect(counter.getPenalty()).toBe(0); // No crossing in this example
        });
        it('should update penalty on change', () => {
            const counter = new FingersCrossingPenalty(trackFingering);
            counter.change(1, { fret: 3, finger: 2, string: 1 }, { fret: 2, finger: 3, string: 1 });
            expect(counter.getPenalty()).toBe(1); // Crossing introduced
        });
    });
});
