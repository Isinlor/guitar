import { BinarySearchTree } from '@datastructures-js/binary-search-tree';

export type ListChangesUpdate = {
  type: "add" | "remove";
  index: number;
  change: [number, number];
};

export class ListChangesTracker {
  private length: number;
  private initialValue: number;
  private changes: BinarySearchTree<[number, number, number]>;

  constructor(initialList: number[]) {
    this.changes = new BinarySearchTree<[number, number, number]>((a, b) => a[0] - b[0]);
    this.length = initialList.length;
    this.initialValue = initialList[0];
    this.initializeChanges(initialList);
  }

  private initializeChanges(initialList: number[]) {
    for (let i = 1; i < this.length; i++) {
      if (initialList[i] !== initialList[i - 1]) {
        this.changes.insert([i, initialList[i - 1], initialList[i]]);
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
    const changeNode = this.changes.find([listIndex, 0, 0]);
    
    // Remove old change if it exists
    if (changeNode && changeNode.getValue()[0] === listIndex) {
      const oldChange = changeNode.getValue();
      updates.push({ type: "remove", index: listIndex, change: [oldChange[1], oldChange[2]] });
      this.changes.remove(oldChange);
    }
  
    // Add new change if values are different
    if (prev !== current) {
      const newChange: [number, number, number] = [listIndex, prev, current];
      this.changes.insert(newChange);
      updates.push({ type: "add", index: listIndex, change: [prev, current] });
    }
  
    return updates;
  }

  private getValue(listIndex: number): number {
    if (listIndex < 0 || listIndex > this.length - 1) throw new Error(
      `Index ${listIndex} out of bounds. List length is ${this.length}.`
    );

    const lastChangeBeforeIndex = this.changes.lowerBound([listIndex, 0, 0]);
  
    if (!lastChangeBeforeIndex) return this.initialValue;

    return lastChangeBeforeIndex.getValue()[2];
  }

  getChanges(): [number, number, number][] {
    const result: [number, number, number][] = [];
    this.changes.traverseInOrder((node) => {
      result.push(node.getValue());
    });
    return result;
  }

  getList(): number[] {
    return Array.from({ length: this.length }, (_, i) => this.getValue(i));
  }
}