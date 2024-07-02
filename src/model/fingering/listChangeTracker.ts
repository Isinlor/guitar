export type ListChangesUpdate = {
  type: "add" | "remove";
  index: number;
  change: [number, number];
};

export class ListChangesTracker {

  private length: number;
  private initialValue: number;
  private changes: [number, number, number][];

  constructor(initialList: number[]) {
    this.changes = [];
    this.length = initialList.length;
    this.initialValue = initialList[0];
    this.initializeChanges(initialList);
  }

  private initializeChanges(initialList: number[]) {
    for (let i = 1; i < this.length; i++) {
      if (initialList[i] !== initialList[i - 1]) {
        this.changes.push([i, initialList[i - 1], initialList[i]]);
      }
    }
  }

  updateList(listIndex: number, to: number): ListChangesUpdate[] {
    if (listIndex < 0 || listIndex > this.length - 1) throw new Error(
      `Index ${listIndex} out of bounds. List length is ${this.length}.`
    );

    const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
    const next = listIndex < this.length - 1 ? this.getValue(listIndex + 1) : undefined;

    if (listIndex === 0) this.initialValue = to;

    return this.updateChanges(listIndex, prev, to, next);
  }

  private updateChanges(listIndex: number, prev: number | undefined, to: number, next: number | undefined): ListChangesUpdate[] {

    const updates: ListChangesUpdate[] = [];

    if (prev !== undefined) {
      updates.push(...this.updateChange(listIndex, prev, to));
    }

    if (next !== undefined) {
      updates.push(...this.updateChange(listIndex + 1, to, next));
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
      const newChange = [listIndex, prev, current] as [number, number, number];
      const insertIndex = this.changes.findIndex(change => change[0] > listIndex);
      if (insertIndex === -1) {
        this.changes.push(newChange);
      } else {
        this.changes.splice(insertIndex, 0, newChange);
      }
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

    if (index < 0 || index > this.length - 1) throw new Error(
      `Index ${index} out of bounds. List length is ${this.length}.`
    );

    const lastChangeIndex = this.getChangeIndex(index);
  
    let value;
    if (lastChangeIndex === undefined) {
      value = this.initialValue;
    } else {
      value = this.changes[lastChangeIndex][2];
    }
  
    return value;
  }

  getChanges(): [number, number, number][] {
    return [...this.changes];
  }

  getList(): number[] {
    return Array.from({ length: this.length }, (_, i) => this.getValue(i));
  }
}