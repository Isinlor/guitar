import { fingeringToString, fretFingerToString } from "@/model/fingering/fingering";
class Counter {
    constructor() {
        this.counts = new Map();
    }
    add(key) {
        this.counts.set(key, (this.counts.get(key) || 0) + 1);
    }
    remove(key) {
        const count = this.counts.get(key);
        if (count === 1) {
            this.counts.delete(key);
        }
        else if (count) {
            this.counts.set(key, count - 1);
        }
    }
    getCount(key) {
        return this.counts.get(key) || 0;
    }
    getUniqueCount() {
        return this.counts.size;
    }
    getKeys() {
        return Array.from(this.counts.keys());
    }
}
export class CountFrets {
    constructor(trackFingering) {
        this.counter = new Counter();
        trackFingering.forEach(note => this.counter.add(note.fingering.fret));
    }
    change(index, oldFingering, newFingering) {
        this.counter.remove(oldFingering.fret);
        this.counter.add(newFingering.fret);
    }
    getPenalty() {
        return this.counter.getUniqueCount();
    }
}
export class HighFrets {
    constructor(trackFingering) {
        this.counter = new Counter();
        this.fretSum = 0;
        trackFingering.forEach(note => this.add(note.fingering.fret));
    }
    add(fret) {
        if (this.counter.getCount(fret) === 0) {
            this.fretSum += fret;
        }
        this.counter.add(fret);
    }
    remove(fret) {
        if (this.counter.getCount(fret) === 1) {
            this.fretSum -= fret;
        }
        this.counter.remove(fret);
    }
    change(index, oldFingering, newFingering) {
        this.remove(oldFingering.fret);
        this.add(newFingering.fret);
    }
    getPenalty() {
        return this.fretSum;
    }
}
export class HighFingers {
    constructor(trackFingering) {
        this.counter = new Counter();
        this.fingerSum = 0;
        trackFingering.forEach(note => this.add(note.fingering.finger));
    }
    add(finger) {
        if (this.counter.getCount(finger) === 0) {
            this.fingerSum += finger;
        }
        this.counter.add(finger);
    }
    remove(finger) {
        if (this.counter.getCount(finger) === 1) {
            this.fingerSum -= finger;
        }
        this.counter.remove(finger);
    }
    change(index, oldFingering, newFingering) {
        this.remove(oldFingering.finger);
        this.add(newFingering.finger);
    }
    getPenalty() {
        return this.fingerSum;
    }
}
export class CountStrings {
    constructor(trackFingering) {
        this.counter = new Counter();
        trackFingering.forEach(note => this.counter.add(note.fingering.string));
    }
    change(index, oldFingering, newFingering) {
        this.counter.remove(oldFingering.string);
        this.counter.add(newFingering.string);
    }
    getPenalty() {
        return this.counter.getUniqueCount();
    }
}
export class CountFingers {
    constructor(trackFingering) {
        this.counter = new Counter();
        trackFingering.forEach(note => this.counter.add(note.fingering.finger));
    }
    change(index, oldFingering, newFingering) {
        this.counter.remove(oldFingering.finger);
        this.counter.add(newFingering.finger);
    }
    getPenalty() {
        return this.counter.getUniqueCount();
    }
}
export class CountUniqueFretFinger {
    constructor(trackFingering) {
        this.counter = new Counter();
        trackFingering.forEach(note => this.counter.add(this.getKey(note.fingering)));
    }
    getKey(fingering) {
        return fretFingerToString(fingering);
    }
    change(index, oldFingering, newFingering) {
        this.counter.remove(this.getKey(oldFingering));
        this.counter.add(this.getKey(newFingering));
    }
    getPenalty() {
        return this.counter.getUniqueCount();
    }
}
export class CountUniqueFingerings {
    constructor(trackFingering) {
        this.counter = new Counter();
        trackFingering.forEach(note => this.counter.add(this.getKey(note.fingering)));
    }
    getKey(fingering) {
        return fingeringToString(fingering);
    }
    change(index, oldFingering, newFingering) {
        this.counter.remove(this.getKey(oldFingering));
        this.counter.add(this.getKey(newFingering));
    }
    getPenalty() {
        return this.counter.getUniqueCount();
    }
}
export class CountLessUsedFingeringsPerNote {
    constructor(trackFingering) {
        this.counters = new Map();
        trackFingering.forEach(note => this.add(note.note, note.fingering));
        this.notes = trackFingering.map(note => note.note);
    }
    add(note, fingering) {
        if (!this.counters.has(note)) {
            this.counters.set(note, new Counter());
        }
        this.counters.get(note).add(this.getKey(fingering));
    }
    remove(note, fingering) {
        var _a;
        (_a = this.counters.get(note)) === null || _a === void 0 ? void 0 : _a.remove(this.getKey(fingering));
    }
    getKey(fingering) {
        return fingeringToString(fingering);
    }
    change(index, oldFingering, newFingering) {
        const note = this.notes[index];
        this.remove(note, oldFingering);
        this.add(note, newFingering);
    }
    getPenalty() {
        let penalty = 0;
        for (const counter of this.counters.values()) {
            const counts = counter.getKeys().map(key => counter.getCount(key));
            const maxCount = Math.max(...counts);
            penalty += counts.reduce((acc, count) => acc + count, 0) - maxCount;
        }
        return penalty;
    }
}
