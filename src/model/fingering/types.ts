import { Fingering, TrackFingeringWithAlternatives } from "@/model/types";

export interface TrackState<S> {
  change(index: number, oldState: S, newState: S): void;
}

export interface HardConstraint<S> {
  canChange(index: number, oldState: S, newState: S): boolean;
}

export interface SoftConstraint<S> extends TrackState<S> {
  getPenalty(): number;
}

export interface Alternatives<S> {
  getAlternatives(index: number): S[];
}

export class FingeringAlternatives implements Alternatives<Fingering> {

  constructor(
    private trackFingeringWithAlternatives: TrackFingeringWithAlternatives
  ) { }
  
  getAlternatives(index: number): Fingering[] {
    return this.trackFingeringWithAlternatives[index].fingeringAlternatives;
  }

}

export class CompositeTrackState<S> implements TrackState<S> {
  private states: TrackState<S>[];

  constructor(states: TrackState<S>[] = []) {
    this.states = states;
  }

  change(index: number, oldState: S, newState: S): void {
    this.states.forEach(state => {
      state.change(index, oldState, newState);
    });
  }
}

export class TrackStateStore<S> extends CompositeTrackState<S> implements TrackState<S> {
  public readonly state: S[];

  constructor(state: S[] = [], states: TrackState<S>[] = []) {
    super(states);
    this.state = state;
  }

  change(index: number, oldState: S, newState: S): void {
    this.state[index] = newState;
    super.change(index, oldState, newState);
  }
}

export class CompositeSoftConstraint<S> implements SoftConstraint<S> {
  private constraints: SoftConstraint<S>[];

  constructor(constraints: SoftConstraint<S>[] = []) {
    this.constraints = constraints;
  }

  getPenalty(): number {
    return this.constraints.reduce((totalPenalty, constraint) => {
      return totalPenalty + constraint.getPenalty();
    }, 0);
  }

  change(index: number, oldState: S, newState: S): void {
    this.constraints.forEach(constraint => {
      constraint.change(index, oldState, newState);
    });
  }
}

export class CompositeHardConstraint<S> implements HardConstraint<S> {
  private constraints: HardConstraint<S>[];

  constructor(constraints: HardConstraint<S>[] = []) {
    this.constraints = constraints;
  }

  canChange(index: number, oldState: S, newState: S): boolean {
    return this.constraints.every(constraint => {
      return constraint.canChange(index, oldState, newState);
    });
  }
}

export class WeightedSoftConstraint<S> implements SoftConstraint<S> {
  constructor(
    private constraint: SoftConstraint<S>,
    private weight: number
  ) {}

  getPenalty(): number {
    return this.constraint.getPenalty() * this.weight;
  }

  change(index: number, oldState: S, newState: S): void {
    this.constraint.change(index, oldState, newState);
  }
}