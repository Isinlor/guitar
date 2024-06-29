export type ListChangesUpdate = {
  type: "add" | "remove";
  index: number;
  change: [number, number];
};

export class ListChangesTracker {
  private list: number[];
  private changes: Map<number, [number, number]>;

  constructor(initialList: number[]) {
    // A copy is created to ensure the original list isn't modified, maintaining immutability
    this.list = [...initialList];
    this.changes = new Map();
    this.initializeChanges();
  }

  private initializeChanges() {
    for (let i = 1; i < this.list.length; i++) {
      if (this.list[i] !== this.list[i - 1]) {
        this.changes.set(i, [this.list[i - 1], this.list[i]]);
      }
    }
  }

  updateList(index: number, to: number): ListChangesUpdate[] {
    if (index < 0 || index >= this.list.length) throw new Error(
      "Index out of bounds"
    );

    this.list[index] = to;

    return this.updateChanges(index);
  }

  private updateChanges(index: number): ListChangesUpdate[] {
    // We consider the previous, current, and next elements to properly handle transitions
    const prev = index > 0 ? this.list[index - 1] : null;
    const current = this.list[index];
    const next = index < this.list.length - 1 ? this.list[index + 1] : null;

    const updates: ListChangesUpdate[] = [];

    // We only record a change if there's a transition.
    if (prev !== null) {
      updates.push(...this.updateChange(index, prev, current));
    }

    // Similarly, we update or remove the change for the next index based on whether there's a transition
    if (next !== null) {
      updates.push(...this.updateChange(index  + 1, current, next));
    }

    return updates;
  }

  private updateChange(index: number, prev: number, current: number): ListChangesUpdate[] {
    const updates: ListChangesUpdate[] = [];
    const oldChange = this.changes.get(index);
    if (oldChange) updates.push({ type: "remove", index, change: oldChange });
    if (prev !== current) {
      this.changes.set(index, [prev, current]);
      updates.push({ type: "add", index, change: [prev, current] });
    } else if(oldChange !== undefined) {
      // If elements become the same, we remove the old change.
      this.changes.delete(index);
    }
    return updates;
  }

  getChanges(): [number, number, number][] {
    // We convert the Map to an array for easier consumption by the user
    return Array.from(this.changes.entries()).map(([index, [from, to]]) => [index, from, to]);
  }

  getList(): number[] {
    // We return a copy to prevent external modification of the internal state
    return [...this.list];
  }
}