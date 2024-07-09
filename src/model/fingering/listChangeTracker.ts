import { BinarySearchTree } from '@datastructures-js/binary-search-tree';

export type ListChangesUpdate<T> = {
  type: "add" | "remove";
  index: number;
  change: [T, T];
};

export class ListChangesTracker<T> {
  protected length: number;
  protected initialValue: T | undefined;
  protected changes: BinarySearchTree<[number, T, T]>;

  constructor(initialList: T[]) {
    this.changes = new BinarySearchTree((a, b) => a[0] - b[0]);
    this.length = initialList.length;
    this.initialValue = initialList[0];
    this.initializeChanges(initialList);
  }

  private initializeChanges(initialList: T[]) {
    for (let i = 1; i < this.length; i++) {
      if (initialList[i] !== initialList[i - 1]) {
        this.changes.insert([i, initialList[i - 1], initialList[i]]);
      }
    }
  }

  updateList(listIndex: number, to: T): ListChangesUpdate<T>[] {
    if (listIndex < 0 || listIndex > this.length - 1) throw new Error(
      `Index ${listIndex} out of bounds. List length is ${this.length}.`
    );

    const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
    const next = listIndex < this.length - 1 ? this.getValue(listIndex + 1) : undefined;

    if (listIndex === 0) this.initialValue = to;

    const updates: ListChangesUpdate<T>[] = [];

    if (prev !== undefined) {
      updates.push(...this.updateChange(listIndex, prev, to));
    }

    if (next !== undefined) {
      updates.push(...this.updateChange(listIndex + 1, to, next));
    }

    return updates;
  }

  /**
   * Reset element at the given index.
   * 
   * Resetting means that the element at the given index will take value of the previous element.
   * If the element is the first element, it will take the value of the next element.
   * If there are no other elements the set value will be undefined.
   */
  reset(listIndex: number): ListChangesUpdate<T>[] {
    if (listIndex < 0 || listIndex > this.length - 1) throw new Error(
      `Index ${listIndex} out of bounds. List length is ${this.length}.`
    );

    const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
    if (prev !== undefined) return this.updateList(listIndex, prev);

    const next = listIndex < this.length - 1 ? this.getValue(listIndex + 1) : undefined;
    if (next !== undefined) return this.updateList(listIndex, next);

    this.initialValue = undefined;

    return [];
  }

  private updateChange(listIndex: number, left: T, right: T): ListChangesUpdate<T>[] {
    const updates: ListChangesUpdate<T>[] = [];
    const changeNode = this.changes.find([listIndex, undefined as any, undefined as any]);

    // Remove old change if it exists
    if (changeNode && changeNode.getValue()[0] === listIndex) {
      const oldChange = changeNode.getValue();
      updates.push({ type: "remove", index: listIndex, change: [oldChange[1], oldChange[2]] });
      this.changes.remove(oldChange);
    }

    // Add new change if values are different
    if (left !== right) {
      const newChange: [number, T, T] = [listIndex, left, right];
      this.changes.insert(newChange);
      updates.push({ type: "add", index: listIndex, change: [left, right] });
    }

    return updates;
  }

  getValue(listIndex: number): T | undefined {
    if (listIndex < 0 || listIndex > this.length - 1) throw new Error(
      `Index ${listIndex} out of bounds. List length is ${this.length}.`
    );

    const lastChangeBeforeIndex = this.changes.lowerBound([listIndex, undefined as any, undefined as any]);

    if (!lastChangeBeforeIndex) return this.initialValue;

    return lastChangeBeforeIndex.getValue()[2];
  }

  getChanges(): [number, T, T][] {
    const result: [number, T, T][] = [];
    this.changes.traverseInOrder((node) => {
      result.push(node.getValue());
    });
    return result;
  }

  getList(): (T | undefined)[] {
    return Array.from({ length: this.length }, (_, i) => this.getValue(i));
  }
}