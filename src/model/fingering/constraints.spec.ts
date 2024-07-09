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

describe('FingerStringJumpingPenalty', () => {
  it('should return 0 for an empty track', () => {
    const emptyTrack: TrackFingering = [];
    const penalty = new FingerStringJumpingPenalty(emptyTrack);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(emptyTrack));
    expect(penalty.getPenalty()).toBe(0);
    expect(fingerStringJumpingPenalty(emptyTrack)).toBe(0);
  });

  it('should return 0 for a track with one note and no string jumps', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(fingerStringJumpingPenalty(track)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should return 0 for a track with two notes and no string jumps', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(fingerStringJumpingPenalty(track)).toBe(0);
    expect(penalty.getPenalty()).toBe(0);
  });

  it('should calculate correct penalty for a simple string jump', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 2, string: 3 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);
    expect(fingerStringJumpingPenalty(track)).toBe(2);
  });

  it('should calculate correct penalty for multiple string jumps', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 2, fret: 2, string: 2 }),
      createNoteEvent({ finger: 1, fret: 3, string: 4 }),
      createNoteEvent({ finger: 2, fret: 4, string: 1 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(4);
    expect(fingerStringJumpingPenalty(track)).toBe(4);
  });

  it('should calculate correct penalty correctly across fingers', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 4, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 2, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 3 }),
      createNoteEvent({ finger: 3, fret: 1, string: 1 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);
  });

  it('should calculate correct penalty in complex scenario', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }), // first occurrence
      createNoteEvent({ finger: 2, fret: 2, string: 2 }), // first occurrence
      createNoteEvent({ finger: 1, fret: 3, string: 4 }), // change by 3
      createNoteEvent({ finger: 3, fret: 4, string: 3 }), // first occurrence
      createNoteEvent({ finger: 2, fret: 5, string: 1 }), // change by 1
      createNoteEvent({ finger: 1, fret: 6, string: 2 }), // change by 2
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(6);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
  });
  
  it('should handle changes correctly on the first index', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 2, string: 3 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);

    // Change the fist fingering to reduce the jump
    penalty.change(0, track[0].fingering, { finger: 1, fret: 1, string: 2 });
    expect(penalty.getPenalty()).toBe(1);

    // Change it back
    penalty.change(0, { finger: 1, fret: 1, string: 2 }, { finger: 1, fret: 1, string: 1 });
    expect(penalty.getPenalty()).toBe(2);
  });

  it('should handle changes correctly on the second index', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 2, string: 3 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);

    // Change the second fingering to reduce the jump
    penalty.change(1, track[1].fingering, { finger: 1, fret: 2, string: 2 });
    expect(penalty.getPenalty()).toBe(1);

    // Change it back
    penalty.change(1, { finger: 1, fret: 2, string: 2 }, { finger: 1, fret: 2, string: 3 });
    expect(penalty.getPenalty()).toBe(2);
  });

  it('should handle changes correctly across fingers (3 fingerings)', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 2, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 3 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);

    // Change the second fingering for finger 1 to reduce the jump
    penalty.change(2, track[2].fingering, { finger: 1, fret: 1, string: 2 });
    expect(penalty.getPenalty()).toBe(1);

    // Change it again
    penalty.change(2, { finger: 1, fret: 1, string: 2 }, { finger: 1, fret: 1, string: 3 });
    expect(penalty.getPenalty()).toBe(2);
  });

  it('should handle changes correctly across fingers (5 fingerings)', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 4, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 2, fret: 1, string: 1 }),
      createNoteEvent({ finger: 1, fret: 1, string: 3 }),
      createNoteEvent({ finger: 3, fret: 1, string: 1 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
    expect(penalty.getPenalty()).toBe(2);

    // Change the second fingering for finger 1 to reduce the jump
    penalty.change(3, track[3].fingering, { finger: 1, fret: 1, string: 2 });
    track[3].fingering = { finger: 1, fret: 1, string: 2 };

    expect(fingerStringJumpingPenalty(track)).toBe(1);
    expect(penalty.getPenalty()).toBe(1);

    // Change it again
    penalty.change(3, { finger: 1, fret: 1, string: 2 }, { finger: 1, fret: 1, string: 3 });
    expect(penalty.getPenalty()).toBe(2);
  });

  it('should handle complex scenarios correctly', () => {
    const track: TrackFingering = [
      createNoteEvent({ finger: 1, fret: 1, string: 1 }),
      createNoteEvent({ finger: 2, fret: 2, string: 2 }),
      createNoteEvent({ finger: 1, fret: 3, string: 4 }),
      createNoteEvent({ finger: 3, fret: 4, string: 3 }),
      createNoteEvent({ finger: 2, fret: 5, string: 1 }),
      createNoteEvent({ finger: 1, fret: 6, string: 2 }),
    ];
    const penalty = new FingerStringJumpingPenalty(track);
    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));

    // Make some changes
    penalty.change(2, track[2].fingering, { finger: 1, fret: 3, string: 3 });
    track[2].fingering = { finger: 1, fret: 3, string: 3 };
    
    penalty.change(4, track[4].fingering, { finger: 2, fret: 5, string: 2 });
    track[4].fingering = { finger: 2, fret: 5, string: 2 };

    expect(penalty.getPenalty()).toBe(fingerStringJumpingPenalty(track));
  });
});

// Helper function to create a NoteEventWithFingering
function createNoteEvent(fingering: Fingering): NoteEventWithFingering {
  return {
    note: 60, // Arbitrary MIDI note
    startTimeMs: 0,
    durationMs: 1000,
    fingering: fingering
  };
}