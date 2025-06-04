import { ListChangesTracker, ListChangesTrackerWithPlaceholders } from "@/model/fingering/listChangeTracker";
export class FingersCrossingPenalty {
    constructor(trackFingering) {
        this.penalty = 0;
        this.trackFingering = trackFingering;
        this.calculateInitialPenalty();
    }
    calculateInitialPenalty() {
        for (let i = 0; i < this.trackFingering.length - 1; i++) {
            this.penalty += this.getPenaltyBetweenNotes(i, i + 1);
        }
    }
    getPenaltyBetweenNotes(index1, index2) {
        const currentFingering = this.trackFingering[index1].fingering;
        const nextFingering = this.trackFingering[index2].fingering;
        const moveToHigherFret = currentFingering.fret < nextFingering.fret;
        const moveToHigherFinger = currentFingering.finger < nextFingering.finger;
        if (moveToHigherFret && !moveToHigherFinger)
            return 1;
        if (!moveToHigherFret && moveToHigherFinger)
            return 1;
        return 0;
    }
    change(index, oldFingering, newFingering) {
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
    getPenalty() {
        return this.penalty;
    }
}
export class HandMovementPenalty {
    constructor(trackFingering) {
        this.penalty = 0;
        this.movement = 0;
        this.changeTracker = new ListChangesTracker(trackFingering.map(({ fingering }) => this.getHandPosition(fingering)));
        this.calculateInitialPenalty();
    }
    calculateInitialPenalty() {
        this.movement = this.changeTracker.getChanges().length;
        this.changeTracker.getChanges().forEach(([_, previous, next]) => {
            this.penalty += this.getChangePenalty(previous, next);
        });
    }
    getHandPosition(fingering) {
        return fingering.fret - fingering.finger + 1;
    }
    getChangePenalty(previous, next) {
        return 5 + Math.abs(next - previous) ** 2;
    }
    change(index, oldFingering, newFingering) {
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
        });
    }
    getPenalty() {
        return this.penalty + this.movement ** 4;
    }
    toString() {
        return this.changeTracker.getList().join(", ") + ';' + this.changeTracker.getChanges().map(([_, previous, next]) => `${previous} -> ${next}`).join(", ");
    }
}
export class FingerStringJumpingPenalty {
    constructor(trackFingering) {
        this.stringChangeTrackerPerFinger = {};
        this.penaltyPerFinger = {
            1: 0, 2: 0, 3: 0, 4: 0,
        };
        this.initializeFingerStringChanges(trackFingering);
    }
    initializeFingerStringChanges(trackFingering) {
        const fingerPositionsAcrossTrack = [[], [], [], [],];
        const fingersPositions = {
            1: null, 2: null, 3: null, 4: null,
        };
        trackFingering.forEach(({ fingering }) => {
            const { finger, string } = fingering;
            const currentFingerPositions = Object.assign({}, fingersPositions);
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
    change(index, oldState, newState) {
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
    updatePenalty(finger, updates) {
        const penaltyChange = updates.reduce((sum, update) => {
            const [oldString, newString] = update.change;
            const distance = this.getDistance(oldString, newString);
            if (update.type === "add")
                return sum + distance;
            if (update.type === "remove")
                return sum - distance;
            throw new Error(`Unexpected update type: ${update.type} for update: ${update}`);
        }, 0);
        this.penaltyPerFinger[finger] += penaltyChange;
    }
    getPenalty() {
        return Object.values(this.penaltyPerFinger).reduce((sum, penalty) => sum + penalty, 0);
    }
    getDistance(oldString, newString) {
        if (oldString === newString)
            return 0; // nothing happens
        if (oldString === null || newString === null)
            return 0; // 1 for lifting finger or placing finger
        return Math.abs(newString - oldString); // + 2; // the distance + lifting and placing
    }
    toString() {
        return Object.entries(this.penaltyPerFinger).map(([finger, penalty]) => {
            return `Finger ${finger}: ${penalty}: ${this.stringChangeTrackerPerFinger[Number(finger)].getList()}`;
        }).join("\n");
    }
}
export class SimpleSoftConstraint {
    constructor(computePenalty, initialTrackFingering = []) {
        this.computePenalty = computePenalty;
        this.trackFingering = [...initialTrackFingering];
    }
    change(index, oldFingering, newFingering) {
        this.trackFingering[index].fingering = newFingering;
    }
    getPenalty() {
        return this.computePenalty(this.trackFingering);
    }
}
