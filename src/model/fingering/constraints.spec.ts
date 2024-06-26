import { HandMovementPenalty } from '@/model/fingering/constraints';
import { handMovementPenalty } from '@/model/fingering/penalties';
import { Fingering, TrackFingering } from '@/model/types';
import { describe, expect, it } from 'vitest';

describe('HandMovementPenalty', () => {
  // Helper function to create a fingering
  const createFingering = (string: number, fret: number, finger: number): Fingering => ({
    string,
    fret,
    finger
  });

  // Helper function to create a track fingering
  const createTrackFingering = (fingerings: [number, number, number][]): TrackFingering => 
    fingerings.map(([string, fret, finger], index) => ({
      note: 0, // We don't need actual MIDI notes for this test
      startTimeMs: index * 1000,
      durationMs: 1000,
      fingering: createFingering(string, fret, finger)
    }));

  it('should return 0 for a single note', () => {
    const trackFingering = createTrackFingering([[1, 1, 1]]);
    const penalty = new HandMovementPenalty(trackFingering);
    expect(handMovementPenalty(trackFingering)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should return 0 for consecutive notes with matching fret and finger changes', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 2, 2],
      [1, 3, 3],
      [1, 4, 4]
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    expect(handMovementPenalty(trackFingering)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should calculate penalty for fret changes without finger changes', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 3, 1] // Moving 2 frets without changing finger
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    // Expected penalty: 5 + (2 - 0)^2 + 1^4 = 10
    expect(handMovementPenalty(trackFingering)).toBe(10);
    expect(penalty.getPenalty()).toBe(10);
  });

  it('should calculate penalty for finger changes without fret changes', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 1, 3] // Changing finger without moving fret
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    // Expected penalty: 5 + (0 - 2)^2 + 1^4 = 10
    expect(handMovementPenalty(trackFingering)).toBe(10);
    expect(penalty.getPenalty()).toBe(10);
  });

  it('should handle open strings correctly', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 0, 0], // Open string
      [1, 3, 3]
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    // No penalty because of open string in between
    expect(handMovementPenalty(trackFingering)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should handle multiple movements', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 3, 2], // Small movement
      [1, 7, 1], // Larger movement
      [1, 12, 4] // Another large movement
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    // Expected penalties:
    // 1st movement: 5 + (2 - 1)^2 + 1 = 6
    // 2nd movement: 5 + (4 - (-1))^2 + 1 = 30
    // 3rd movement: 5 + (5 - 3)^2 + 1 = 10
    // Total movement penalty: 3^4 = 81
    // Total: 6 + 30 + 10 + 81 = 127
    expect(handMovementPenalty(trackFingering)).toBe(126);
    expect(penalty.getPenalty()).toBe(126);
  });

  it('should handle edge cases with open strings', () => {
    const trackFingering = createTrackFingering([
      [1, 0, 0], // Open string at start
      [1, 1, 1],
      [1, 3, 3],
      [1, 0, 0] // Open string at end
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    // No penalty because open strings are at the edges
    expect(handMovementPenalty(trackFingering)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should update penalty when changing a fingering', () => {
    const trackFingering = createTrackFingering([
      [1, 1, 1],
      [1, 3, 2],
      [1, 5, 3]
    ]);
    const penalty = new HandMovementPenalty(trackFingering);
    const initialPenalty = penalty.getPenalty();

    // Change the middle fingering
    penalty.change(1, createFingering(1, 3, 2), createFingering(1, 3, 3));

    // Recalculate expected penalty
    // Before: [1,1,1] -> [1,3,2] -> [1,5,3]
    // After:  [1,1,1] -> [1,3,3] -> [1,5,3]
    // The penalty should be lower now as the finger progression is more natural
    expect(penalty.getPenalty()).toBeLessThan(initialPenalty);
  });

  const testTransition = (description: string, from: [number, number, number], to: [number, number, number], expectedPenalty: number) => {
    it(description, () => {
      const trackFingering = createTrackFingering([from, to]);
      const newPenalty = new HandMovementPenalty(trackFingering).getPenalty();
      const oldPenalty = handMovementPenalty(trackFingering);

      expect(newPenalty).toBe(oldPenalty);
      expect(newPenalty).toBe(expectedPenalty);
      expect(oldPenalty).toBe(expectedPenalty);
    });
  };

  testTransition(
    "fret 1 finger 1 -> fret 2 (+1) finger 2 (+1) =0",
    [1, 1, 1], [1, 2, 2], 0
  );

  testTransition(
    "fret 1 finger 1 -> fret 4 (+3) finger 4 (+3)",
    [1, 1, 1], [1, 4, 4], 0
  );

  testTransition(
    "fret 1 finger 1 -> fret 2 (+1) finger 1 (0)",
    [1, 1, 1], [1, 2, 1], 7
  );

  testTransition(
    "fret 1 finger 1 -> fret 1 (0) finger 2 (+1)",
    [1, 1, 1], [1, 1, 2], 7
  );

  testTransition(
    "fret 1 finger 1 -> fret 12 (+11) finger 1 (0)",
    [1, 1, 1], [1, 12, 1], 127
  );

  testTransition(
    "fret 1 finger 1 -> fret 7 (+6) finger 1 (0)",
    [1, 1, 1], [1, 7, 1], 42
  );

  testTransition(
    "fret 1 finger 1 -> fret 2 (+1) finger 3 (+2)",
    [1, 1, 1], [1, 2, 3], 7
  );

  testTransition(
    "fret 1 finger 1 -> fret 12 (+11) finger 4 (+3)",
    [1, 1, 1], [1, 12, 4], 70
  );

  it("fret 1 finger 1 -> fret 12 (+11) finger 4 (+3) = fret 1 finger 1 -> fret 9 (+8) finger 1 (0)", () => {
    const trackFingering1 = createTrackFingering([[1, 1, 1], [1, 12, 4]]);
    const trackFingering2 = createTrackFingering([[1, 1, 1], [1, 9, 1]]);

    const newPenalty1 = new HandMovementPenalty(trackFingering1).getPenalty();
    const newPenalty2 = new HandMovementPenalty(trackFingering2).getPenalty();
    const oldPenalty1 = handMovementPenalty(trackFingering1);
    const oldPenalty2 = handMovementPenalty(trackFingering2);

    expect(newPenalty1).toBe(oldPenalty1);
    expect(newPenalty2).toBe(oldPenalty2);

    expect(newPenalty1).toBe(70);
    expect(newPenalty2).toBe(70);
    expect(oldPenalty1).toBe(70);
    expect(oldPenalty2).toBe(70);

  });

  it("fret 1 finger 1 -> fret 9 (+8) finger 1 = fret 9 finger 1 -> fret 1 finger 1", () => {
    const trackFingering1 = createTrackFingering([[1, 1, 1], [1, 9, 1]]);
    const trackFingering2 = createTrackFingering([[1, 9, 1], [1, 1, 1]]);

    const newPenalty1 = new HandMovementPenalty(trackFingering1).getPenalty();
    const newPenalty2 = new HandMovementPenalty(trackFingering2).getPenalty();
    const oldPenalty1 = handMovementPenalty(trackFingering1);
    const oldPenalty2 = handMovementPenalty(trackFingering2);

    expect(newPenalty1).toBe(oldPenalty1);
    expect(newPenalty2).toBe(oldPenalty2);

    expect(newPenalty1).toBe(70);
    expect(newPenalty2).toBe(70);
    expect(oldPenalty1).toBe(70);
    expect(oldPenalty2).toBe(70);
  });

  testTransition(
    "fret 8 finger 1 -> fret 1 (-7) finger 1 (0)",
    [1, 8, 1], [1, 1, 1], 55
  );
  
});