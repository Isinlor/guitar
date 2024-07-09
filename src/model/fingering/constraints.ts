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

export class FingerStringJumpingPenalty implements SoftConstraint<Fingering> {
  
  private stringChangeTrackerPerFinger: Record<number, ListChangesTracker<number | null>> = {};

  private penaltyPerFinger: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0,
  };
  
  constructor(trackFingering: TrackFingering) {
    this.initializeFingerStringChanges(trackFingering);
  }

  private initializeFingerStringChanges(trackFingering: TrackFingering): void {
    const fingerPositionsAcrossTrack: (number | null)[][] = [[], [], [], [],];
    const fingersPositions: Record<number, number | null> = {
      1: null, 2: null, 3: null, 4: null,
    };
    trackFingering.forEach(({ fingering }) => {
      const { finger, string } = fingering;
      const currentFingerPositions = { ...fingersPositions };
      currentFingerPositions[finger] = string;
      Object.values(currentFingerPositions).forEach((string, finger) => {
        fingerPositionsAcrossTrack[finger].push(string);
      });
    });
    fingerPositionsAcrossTrack.forEach((strings, finger) => {
      finger = finger + 1; // 0 index to 1 index
      this.stringChangeTrackerPerFinger[finger] = new ListChangesTrackerWithPlaceholders(strings);
    });
    Object.values(this.stringChangeTrackerPerFinger).forEach((tracker, finger) => {
      finger = finger + 1; // 0 index to 1 index
      const changes = tracker.getChanges();
      this.penaltyPerFinger[finger] = changes.reduce((sum, [_, oldString, newString]) => {
        return sum + this.getDistance(oldString, newString);
      }, 0);
    });
  }

  change(index: number, oldState: Fingering, newState: Fingering): void {
    
    if (oldState.finger === newState.finger && oldState.string === newState.string) {
      return; // No change, exit early
    }

    const newFingerTracker = this.stringChangeTrackerPerFinger[newState.finger];

    if (oldState.finger !== newState.finger) {
      
      const oldFingerTracker = this.stringChangeTrackerPerFinger[oldState.finger];

      this.updatePenalty(oldState.finger, oldFingerTracker.updateList(index, null));
      this.updatePenalty(newState.finger, newFingerTracker.updateList(index, newState.string));
      
      return;

    }

    this.updatePenalty(newState.finger, newFingerTracker.updateList(index, newState.string));
    
  }

  private updatePenalty(finger: number, updates: ListChangesUpdate<number | null>[]) {

    const penaltyChange = updates.reduce((sum, update) => {
      const [oldString, newString] = update.change;
      const distance = this.getDistance(oldString, newString);
      if (update.type === "add") return sum + distance;
      if (update.type === "remove") return sum - distance;
      throw new Error(`Unexpected update type: ${update.type} for update: ${update}`);
    }, 0);

    this.penaltyPerFinger[finger] += penaltyChange;

  }

  getPenalty(): number {
    return Object.values(this.penaltyPerFinger).reduce((sum, penalty) => sum + penalty, 0);
  }

  getDistance(oldString: number | null, newString: number | null): number {
    if (oldString === newString) return 0; // nothing happens
    if (oldString === null || newString === null) return 0; // 1 for lifting finger or placing finger
    return Math.abs(newString - oldString); // + 2; // the distance + lifting and placing
  }

  toString(): string {
    return Object.entries(this.penaltyPerFinger).map(([finger, penalty]) => {
      return `Finger ${finger}: ${penalty}: ${this.stringChangeTrackerPerFinger[Number(finger)].getList()}`;
    }).join("\n");
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