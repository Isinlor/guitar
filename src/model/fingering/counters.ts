import { fingeringToString, fretFingerToString } from "@/model/fingering/fingering";
import { SoftConstraint, TrackState } from "@/model/fingering/types";
import { Fingering, MidiNote, TrackFingering } from "@/model/types";

class Counter<T> {
  protected counts = new Map<T, number>();

  add(key: T): void {
      this.counts.set(key, (this.counts.get(key) || 0) + 1);
  }

  remove(key: T): void {
      const count = this.counts.get(key);
      if (count === 1) {
          this.counts.delete(key);
      } else if (count) {
          this.counts.set(key, count - 1);
      }
  }

  getCount(key: T): number {
      return this.counts.get(key) || 0;
  }

  getUniqueCount(): number {
      return this.counts.size;
  }

  getKeys(): T[] {
      return Array.from(this.counts.keys());
  }
}

export class CountFrets implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<number>;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<number>();
      trackFingering.forEach(note => this.counter.add(note.fingering.fret));
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.counter.remove(oldFingering.fret);
      this.counter.add(newFingering.fret);
  }

  getPenalty(): number {
      return this.counter.getUniqueCount();
  }
}

export class HighFrets implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<number>;
  private fretSum: number;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<number>();
      this.fretSum = 0;
      trackFingering.forEach(note => this.add(note.fingering.fret));
  }

  private add(fret: number): void {
      if (this.counter.getCount(fret) === 0) {
          this.fretSum += fret;
      }
      this.counter.add(fret);
  }

  private remove(fret: number): void {
      if (this.counter.getCount(fret) === 1) {
          this.fretSum -= fret;
      }
      this.counter.remove(fret);
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.remove(oldFingering.fret);
      this.add(newFingering.fret);
  }

  getPenalty(): number {
      return this.fretSum;
  }
}

export class HighFingers implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<number>;
  private fingerSum: number;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<number>();
      this.fingerSum = 0;
      trackFingering.forEach(note => this.add(note.fingering.finger));
  }

  private add(finger: number): void {
      if (this.counter.getCount(finger) === 0) {
          this.fingerSum += finger;
      }
      this.counter.add(finger);
  }

  private remove(finger: number): void {
      if (this.counter.getCount(finger) === 1) {
          this.fingerSum -= finger;
      }
      this.counter.remove(finger);
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.remove(oldFingering.finger);
      this.add(newFingering.finger);
  }

  getPenalty(): number {
      return this.fingerSum;
  }
}

export class CountStrings implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<number>;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<number>();
      trackFingering.forEach(note => this.counter.add(note.fingering.string));
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.counter.remove(oldFingering.string);
      this.counter.add(newFingering.string);
  }

  getPenalty(): number {
      return this.counter.getUniqueCount();
  }
}

export class CountFingers implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<number>;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<number>();
      trackFingering.forEach(note => this.counter.add(note.fingering.finger));
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.counter.remove(oldFingering.finger);
      this.counter.add(newFingering.finger);
  }

  getPenalty(): number {
      return this.counter.getUniqueCount();
  }
}

export class CountUniqueFretFinger implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<string>;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<string>();
      trackFingering.forEach(note => this.counter.add(this.getKey(note.fingering)));
  }

  private getKey(fingering: Fingering): string {
      return fretFingerToString(fingering);
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.counter.remove(this.getKey(oldFingering));
      this.counter.add(this.getKey(newFingering));
  }

  getPenalty(): number {
      return this.counter.getUniqueCount();
  }
}

export class CountUniqueFingerings implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counter: Counter<string>;

  constructor(trackFingering: TrackFingering) {
      this.counter = new Counter<string>();
      trackFingering.forEach(note => this.counter.add(this.getKey(note.fingering)));
  }

  private getKey(fingering: Fingering): string {
      return fingeringToString(fingering);
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      this.counter.remove(this.getKey(oldFingering));
      this.counter.add(this.getKey(newFingering));
  }

  getPenalty(): number {
      return this.counter.getUniqueCount();
  }
}

export class CountLessUsedFingeringsPerNote implements SoftConstraint<Fingering>, TrackState<Fingering> {
  private counters: Map<MidiNote, Counter<string>>;
  private notes: MidiNote[];

  constructor(trackFingering: TrackFingering) {
      this.counters = new Map();
      trackFingering.forEach(note => this.add(note.note, note.fingering));
      this.notes = trackFingering.map(note => note.note);
  }

  private add(note: MidiNote, fingering: Fingering ): void {
      if (!this.counters.has(note)) {
          this.counters.set(note, new Counter<string>());
      }
      this.counters.get(note)!.add(this.getKey(fingering));
  }

  private remove(note: MidiNote, fingering: Fingering ): void {
      this.counters.get(note)?.remove(this.getKey(fingering));
  }

  private getKey(fingering: Fingering): string {
      return fingeringToString(fingering);
  }

  change(index: number, oldFingering: Fingering, newFingering: Fingering): void {
      const note = this.notes[index];
      this.remove(note, oldFingering);
      this.add(note, newFingering);
  }

  getPenalty(): number {
      let penalty = 0;
      for (const counter of this.counters.values()) {
          const counts = counter.getKeys().map(key => counter.getCount(key));
          const maxCount = Math.max(...counts);
          penalty += counts.reduce((acc, count) => acc + count, 0) - maxCount;
      }
      return penalty;
  }
}