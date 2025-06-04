export class FingeringAlternatives {
    constructor(trackFingeringWithAlternatives) {
        this.trackFingeringWithAlternatives = trackFingeringWithAlternatives;
    }
    getAlternatives(index) {
        return this.trackFingeringWithAlternatives[index].fingeringAlternatives;
    }
}
export class CompositeTrackState {
    constructor(states = []) {
        this.states = states;
    }
    change(index, oldState, newState) {
        this.states.forEach(state => {
            state.change(index, oldState, newState);
        });
    }
}
export class TrackStateStore extends CompositeTrackState {
    constructor(state = [], states = []) {
        super(states);
        this.state = state;
    }
    change(index, oldState, newState) {
        this.state[index] = newState;
        super.change(index, oldState, newState);
    }
}
export class CompositeSoftConstraint {
    constructor(constraints = []) {
        this.constraints = constraints;
    }
    getPenalty() {
        return this.constraints.reduce((totalPenalty, constraint) => {
            return totalPenalty + constraint.getPenalty();
        }, 0);
    }
    change(index, oldState, newState) {
        this.constraints.forEach(constraint => {
            constraint.change(index, oldState, newState);
        });
    }
}
export class CompositeHardConstraint {
    constructor(constraints = []) {
        this.constraints = constraints;
    }
    canChange(index, oldState, newState) {
        return this.constraints.every(constraint => {
            return constraint.canChange(index, oldState, newState);
        });
    }
}
export class WeightedSoftConstraint {
    constructor(constraint, weight) {
        this.constraint = constraint;
        this.weight = weight;
    }
    getPenalty() {
        return this.constraint.getPenalty() * this.weight;
    }
    change(index, oldState, newState) {
        this.constraint.change(index, oldState, newState);
    }
}
