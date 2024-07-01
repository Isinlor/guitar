export type ListChangesUpdate = {
  type: "add" | "remove";
  index: number;
  change: [number, number];
};

export class ListChangesTracker {
  private list: number[];
  private changes: [number, number, number][];

  constructor(initialList: number[]) {
    this.list = [...initialList];
    this.changes = [];
    this.initializeChanges();
  }

  private initializeChanges() {
    for (let i = 1; i < this.list.length; i++) {
      if (this.list[i] !== this.list[i - 1]) {
        this.changes.push([i, this.list[i - 1], this.list[i]]);
      }
    }
  }

  updateList(index: number, to: number): ListChangesUpdate[] {
    if (index < 0 || index >= this.list.length) throw new Error(
      "Index out of bounds"
    );

    this.getValue(index);

    this.list[index] = to;

    return this.updateChanges(index);
  }

  private updateChanges(index: number): ListChangesUpdate[] {
    const prev = index > 0 ? this.list[index - 1] : null;
    const current = this.list[index];
    const next = index < this.list.length - 1 ? this.list[index + 1] : null;

    const updates: ListChangesUpdate[] = [];

    if (prev !== null) {
      updates.push(...this.updateChange(index, prev, current));
    }

    if (next !== null) {
      updates.push(...this.updateChange(index + 1, current, next));
    }

    return updates;
  }

  private updateChange(listIndex: number, prev: number, current: number): ListChangesUpdate[] {
    const updates: ListChangesUpdate[] = [];
    const changeIndex = this.getChangeIndex(listIndex);
    
    // Remove old change if it exists
    if (changeIndex !== undefined && this.changes[changeIndex][0] === listIndex) {
      const oldChange = this.changes[changeIndex];
      updates.push({ type: "remove", index: listIndex, change: [oldChange[1], oldChange[2]] });
      this.changes.splice(changeIndex, 1);
    }
  
    // Add new change if values are different
    if (prev !== current) {
      const insertIndex = changeIndex === undefined ? 0 : changeIndex + 1;
      this.changes.splice(insertIndex, 0, [listIndex, prev, current]);
      updates.push({ type: "add", index: listIndex, change: [prev, current] });
    }
  
    return updates;
  }

  private getChangeIndex(listIndex: number): number | undefined {
    let low = 0, high = this.changes.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.changes[mid][0] <= listIndex) {
        if (mid === this.changes.length - 1 || this.changes[mid + 1][0] > listIndex) {
          return mid; // Found the last change <= listIndex
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  
    return undefined;
  }

  private getValue(index: number): number {
    const lastChangeIndex = this.getChangeIndex(index);
  
    let value;
    if (lastChangeIndex === undefined) {
      value = this.list[0];
    } else {
      value = this.changes[lastChangeIndex][2];
    }
  
    if (value !== this.list[index]) {
      throw new Error(`Calculated value ${value} at index ${lastChangeIndex} of ${JSON.stringify(this.changes)} does not match list value ${this.list} at index ${index}`);
    }
  
    return value;
  }

  getChanges(): [number, number, number][] {
    return [...this.changes];
  }

  getList(): number[] {
    return [...this.list];
  }
}