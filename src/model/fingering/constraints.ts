import { SoftConstraint, TrackState } from "@/model/fingering/types";
import { Fingering, TrackFingering } from "@/model/types";

export class FingersCrossingPenalty implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private trackFingering: TrackFingering;
  private penalty: number = 0;

  constructor(trackFingering: TrackFingering) {
      this.trackFingering = trackFingering;
      this.calculateInitialPenalty();
  }

  private calculateInitialPenalty(): void {
      for (let i = 0; i < this.trackFingering.length - 1; i++) {
          this.penalty += this.getPenaltyBetweenNotes(i, i + 1);
      }
  }

  private getPenaltyBetweenNotes(index1: number, index2: number): number {
      const currentFingering = this.trackFingering[index1].fingering;
      const nextFingering = this.trackFingering[index2].fingering;
      const moveToHigherFret = currentFingering.fret < nextFingering.fret;
      const moveToHigherFinger = currentFingering.finger < nextFingering.finger;
      if (moveToHigherFret && !moveToHigherFinger) return 1;
      if (!moveToHigherFret && moveToHigherFinger) return 1;
      return 0;
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      // Remove old penalties
      if (index > 0) {
          this.penalty -= this.getPenaltyBetweenNotes(index - 1, index);
      }
      if (index < this.trackFingering.length - 1) {
          this.penalty -= this.getPenaltyBetweenNotes(index, index + 1);
      }

      // Update fingering
      this.trackFingering[index].fingering = newFingering;

      // Add new penalties
      if (index > 0) {
          this.penalty += this.getPenaltyBetweenNotes(index - 1, index);
      }
      if (index < this.trackFingering.length - 1) {
          this.penalty += this.getPenaltyBetweenNotes(index, index + 1);
      }
  }

  getPenalty(): number {
      return this.penalty;
  }
}

export class HandMovementPenalty implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private trackFingering: TrackFingering;
  private penalty: number = 0;
  private movement: number = 0;

  constructor(trackFingering: TrackFingering) {
    this.trackFingering = trackFingering;
    this.calculateInitialPenalty();
  }

  private calculateInitialPenalty(): void {
    for (let i = 0; i < this.trackFingering.length - 1; i++) {
      this.addPenaltyBetweenNotes(i, i + 1);
    }
  }

  private addPenaltyBetweenNotes(index1: number, index2: number): void {
    let currentFingering = this.trackFingering[index1].fingering;
    let nextFingering = this.trackFingering[index2].fingering;

    if (currentFingering.fret === 0 || nextFingering.fret === 0) {
      let j = 1;
      while (currentFingering.fret === 0 && index1 - j >= 0) {
        currentFingering = this.trackFingering[index1 - j].fingering;
        j++;
      }
      let k = 2;
      while (nextFingering.fret === 0 && index2 + k < this.trackFingering.length) {
        nextFingering = this.trackFingering[index2 + k].fingering;
        k++;
      }
      if (currentFingering.fret === 0 || nextFingering.fret === 0) return;
    }

    const fretChange = nextFingering.fret - currentFingering.fret;
    const fingerChange = nextFingering.finger - currentFingering.finger;
    if (fretChange === fingerChange) return;

    this.penalty += 5 + Math.abs(fretChange - fingerChange) ** 2;
    this.movement += 1;
  }

  private removePenaltyBetweenNotes(index1: number, index2: number): void {
    let currentFingering = this.trackFingering[index1].fingering;
    let nextFingering = this.trackFingering[index2].fingering;

    if (currentFingering.fret === 0 || nextFingering.fret === 0) {
      let j = 1;
      while (currentFingering.fret === 0 && index1 - j >= 0) {
        currentFingering = this.trackFingering[index1 - j].fingering;
        j++;
      }
      let k = 2;
      while (nextFingering.fret === 0 && index2 + k < this.trackFingering.length) {
        nextFingering = this.trackFingering[index2 + k].fingering;
        k++;
      }
      if (currentFingering.fret === 0 || nextFingering.fret === 0) return;
    }

    const fretChange = nextFingering.fret - currentFingering.fret;
    const fingerChange = nextFingering.finger - currentFingering.finger;
    if (fretChange === fingerChange) return;

    this.penalty -= 5 + Math.abs(fretChange - fingerChange) ** 2;
    this.movement -= 1;
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
    // Remove old penalties
    if (index > 0) {
      this.removePenaltyBetweenNotes(index - 1, index);
    }
    if (index < this.trackFingering.length - 1) {
      this.removePenaltyBetweenNotes(index, index + 1);
    }

    // Update fingering
    this.trackFingering[index].fingering = newFingering;

    // Add new penalties
    if (index > 0) {
      this.addPenaltyBetweenNotes(index - 1, index);
    }
    if (index < this.trackFingering.length - 1) {
      this.addPenaltyBetweenNotes(index, index + 1);
    }
  }

  getPenalty(): number {
    return this.penalty + this.movement ** 4;
  }
}

export class FingerStringJumpingPenalty implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private trackFingering: TrackFingering;
  private penalty: number = 0;
  private fingersPositions: Record<number, { string: number }> = {};

  constructor(trackFingering: TrackFingering) {
    this.trackFingering = trackFingering;
    this.calculateInitialPenalty();
  }

  private calculateInitialPenalty(): void {
    for (let i = 0; i < this.trackFingering.length; i++) {
      this.addPenaltyForNote(i);
    }
  }

  private addPenaltyForNote(index: number): void {
    const currentFingering = this.trackFingering[index].fingering;
    const previousFingerPosition = this.fingersPositions[currentFingering.finger];

    if (!previousFingerPosition) {
      this.fingersPositions[currentFingering.finger] = { string: currentFingering.string };
      return;
    }

    if (previousFingerPosition.string !== currentFingering.string) {
      this.penalty += Math.abs(previousFingerPosition.string - currentFingering.string);
    }

    this.fingersPositions[currentFingering.finger] = { string: currentFingering.string };
  }

  private removePenaltyForNote(index: number): void {
    const currentFingering = this.trackFingering[index].fingering;
    const previousFingerPosition = this.fingersPositions[currentFingering.finger];

    if (previousFingerPosition && previousFingerPosition.string !== currentFingering.string) {
      this.penalty -= Math.abs(previousFingerPosition.string - currentFingering.string);
    }
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
    this.removePenaltyForNote(index);
    this.trackFingering[index].fingering = newFingering;
    this.addPenaltyForNote(index);

    // Reset finger positions for the changed finger
    delete this.fingersPositions[oldFingering.finger];
    delete this.fingersPositions[newFingering.finger];

    // Recalculate penalties for subsequent notes
    for (let i = index + 1; i < this.trackFingering.length; i++) {
      this.removePenaltyForNote(i);
      this.addPenaltyForNote(i);
    }
  }

  getPenalty(): number {
    return this.penalty;
  }
}

export class SimpleSoftConstraint implements SoftConstraint<Fingering> {
  private trackFingering: TrackFingering;

  constructor(
    private computePenalty: (trackFingering: TrackFingering) => number,
    initialTrackFingering: TrackFingering = []
  ) {
    this.trackFingering = [...initialTrackFingering];
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
    this.trackFingering[index].fingering = newFingering;
  }

  getPenalty(): number {
    return this.computePenalty(this.trackFingering);
  }
}