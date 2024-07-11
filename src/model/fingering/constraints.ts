import { ListChangesTracker, ListChangesTrackerWithPlaceholders, ListChangesUpdate } from "@/model/fingering/listChangeTracker";
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

  private changeTracker: ListChangesTracker<number>;

  private penalty: number = 0;
  private movement: number = 0;

  constructor(trackFingering: TrackFingering) {
    this.changeTracker = new ListChangesTracker(
      trackFingering.map(({ fingering }) => this.getHandPosition(fingering))
    );
    this.calculateInitialPenalty();
  }

  private calculateInitialPenalty(): void {
    this.movement = this.changeTracker.getChanges().length;
    this.changeTracker.getChanges().forEach(([_, previous, next]) => {
      this.penalty += this.getChangePenalty(previous, next);
    });
  }

  getHandPosition(fingering: Fingering): number {
    return fingering.fret - fingering.finger + 1;
  }

  getChangePenalty(previous: number, next: number): number {
    return 5 + Math.abs(next - previous) ** 2;
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
    const newPosition = this.getHandPosition(newFingering);
    const updates = this.changeTracker.updateList(index, newPosition);
    updates.forEach(({ type, change }) => {
      const [previous, next] = change;
      if (type === "add") {
        this.movement += 1;
        this.penalty += this.getChangePenalty(previous, next);
      }
      if (type === "remove") {
        this.movement -= 1;
        this.penalty -= this.getChangePenalty(previous, next);
      }
    })
  }

  getPenalty(): number {
    return this.penalty + this.movement ** 4;
  }

  toString(): string {
    return this.changeTracker.getList().join(", ") + ';' + this.changeTracker.getChanges().map(([_, previous, next]) => `${previous} -> ${next}`).join(", ");
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