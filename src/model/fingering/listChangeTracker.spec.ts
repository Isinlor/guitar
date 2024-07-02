import { describe, expect, it } from 'vitest';

import { ListChangesTracker } from '@/model/fingering/listChangeTracker';

describe('ListChangesTracker', () => {
  it('should handle a list with one element and update it', () => {
    const tracker = new ListChangesTracker([0]);
    expect(tracker.getChanges()).toEqual([]);
    const updates = tracker.updateList(0, 1);
    expect(updates).toEqual([]);
    expect(tracker.getList()).toEqual([1]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should handle a list with two same elements and update first', () => {
    const tracker = new ListChangesTracker([0, 0]);
    const updates = tracker.updateList(0, 1);
    expect(updates).toEqual([{ type: "add", index: 1, change: [1, 0] }]);
    expect(tracker.getList()).toEqual([1, 0]);
    expect(tracker.getChanges()).toEqual([[1, 1, 0]]);
  });

  it('should handle a list with two same elements and update second', () => {
    const tracker = new ListChangesTracker([0, 0]);
    const updates = tracker.updateList(1, 1);
    expect(updates).toEqual([{ type: "add", index: 1, change: [0, 1] }]);
    expect(tracker.getList()).toEqual([0, 1]);
    expect(tracker.getChanges()).toEqual([[1, 0, 1]]);
  });

  it('should handle a list with two different elements and update first to be the same', () => {
    const tracker = new ListChangesTracker([0, 1]);
    const updates = tracker.updateList(0, 1);
    expect(updates).toEqual([{ type: "remove", index: 1, change: [0, 1] }]);
    expect(tracker.getList()).toEqual([1, 1]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should handle a list with two different elements and update second to be the same', () => {
    const tracker = new ListChangesTracker([0, 1]);
    const updates = tracker.updateList(1, 0);
    expect(updates).toEqual([{ type: "remove", index: 1, change: [0, 1] }]);
    expect(tracker.getList()).toEqual([0, 0]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should handle a list with three same elements and update first', () => {
    const tracker = new ListChangesTracker([0, 0, 0]);
    const updates = tracker.updateList(0, 1);
    expect(updates).toEqual([{ type: "add", index: 1, change: [1, 0] }]);
    expect(tracker.getList()).toEqual([1, 0, 0]);
    expect(tracker.getChanges()).toEqual([[1, 1, 0]]);
  });

  it('should handle a list with three same elements and update second', () => {
    const tracker = new ListChangesTracker([0, 0, 0]);
    const updates = tracker.updateList(1, 1);
    expect(updates).toEqual([
      { type: "add", index: 1, change: [0, 1] },
      { type: "add", index: 2, change: [1, 0] }
    ]);
    expect(tracker.getList()).toEqual([0, 1, 0]);
    expect(tracker.getChanges()).toEqual([[1, 0, 1], [2, 1, 0]]);
  });

  it('should handle a list with three same elements and update third', () => {
    const tracker = new ListChangesTracker([0, 0, 0]);
    const updates = tracker.updateList(2, 1);
    expect(updates).toEqual([{ type: "add", index: 2, change: [0, 1] }]);
    expect(tracker.getList()).toEqual([0, 0, 1]);
    expect(tracker.getChanges()).toEqual([[2, 0, 1]]);
  });

  it('should handle a list with three elements, one different, and update first to be the same', () => {
    const tracker = new ListChangesTracker([1, 0, 0]);
    const updates = tracker.updateList(0, 0);
    expect(updates).toEqual([{ type: "remove", index: 1, change: [1, 0] }]);
    expect(tracker.getList()).toEqual([0, 0, 0]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should handle a list with three elements, one different, and update second to be the same', () => {
    const tracker = new ListChangesTracker([0, 1, 0]);
    const updates = tracker.updateList(1, 0);
    expect(updates).toEqual([
      { type: "remove", index: 1, change: [0, 1] },
      { type: "remove", index: 2, change: [1, 0] }
    ]);
    expect(tracker.getList()).toEqual([0, 0, 0]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should handle a list with three elements, one different, and update third to be the same', () => {
    const tracker = new ListChangesTracker([0, 0, 1]);
    const updates = tracker.updateList(2, 0);
    expect(updates).toEqual([{ type: "remove", index: 2, change: [0, 1] }]);
    expect(tracker.getList()).toEqual([0, 0, 0]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should initialize a list with all different elements', () => {
    const tracker = new ListChangesTracker([7, 8, 9]);
    expect(tracker.getList()).toEqual([7, 8, 9]);
    expect(tracker.getChanges()).toEqual([
      [1, 7, 8],
      [2, 8, 9],
    ]);
  });

  it('should allow to change all elements', () => {
    const tracker = new ListChangesTracker([0, 0, 0]);
    const updates1 = tracker.updateList(0, 1);
    expect(updates1).toEqual([{ type: "add", index: 1, change: [1, 0] }]);
    const updates2 = tracker.updateList(1, 1);
    expect(updates2).toEqual([
      { type: "remove", index: 1, change: [1, 0] },
      { type: "add", index: 2, change: [1, 0] }
    ]);
    const updates3 = tracker.updateList(2, 1);
    expect(updates3).toEqual([{ type: "remove", index: 2, change: [1, 0] }]);
    expect(tracker.getList()).toEqual([1, 1, 1]);
    expect(tracker.getChanges()).toEqual([]);
  });

  it('should allow to change three same elements to three different elements', () => {
    const tracker = new ListChangesTracker([0, 0, 0]);
    const updates1 = tracker.updateList(0, 7);
    expect(updates1).toEqual([{ type: "add", index: 1, change: [7, 0] }]);
    const updates2 = tracker.updateList(1, 8);
    expect(updates2).toEqual([
      { type: "remove", index: 1, change: [7, 0] },
      { type: "add", index: 1, change: [7, 8] },
      { type: "add", index: 2, change: [8, 0] }
    ]);
    const updates3 = tracker.updateList(2, 9);
    expect(updates3).toEqual([
      { type: "remove", index: 2, change: [8, 0] },
      { type: "add", index: 2, change: [8, 9] }
    ]);
    expect(tracker.getList()).toEqual([7, 8, 9]);
    expect(tracker.getChanges()).toEqual([
      [1, 7, 8],
      [2, 8, 9],
    ]);
  });

  it('should allow to change three same elements to three different elements in any order', () => {
    
    const tracker = new ListChangesTracker([0, 0, 0]);
    
    const updates1 = tracker.updateList(2, 9);
    expect(updates1).toEqual([{ type: "add", index: 2, change: [0, 9] }]);
    expect(tracker.getList()).toEqual([0, 0, 9]);
    expect(tracker.getChanges()).toEqual([
      [2, 0, 9],
    ]);

    const updates2 = tracker.updateList(1, 8);
    expect(updates2).toEqual([
      { type: "add", index: 1, change: [0, 8] },
      { type: "remove", index: 2, change: [0, 9] },
      { type: "add", index: 2, change: [8, 9] }
    ]);
    expect(tracker.getList()).toEqual([0, 8, 9]);
    expect(tracker.getChanges()).toEqual([
      [1, 0, 8],
      [2, 8, 9],
    ]);

    const updates3 = tracker.updateList(0, 7);
    expect(updates3).toEqual([
      { type: "remove", index: 1, change: [0, 8] },
      { type: "add", index: 1, change: [7, 8] }
    ]);
    expect(tracker.getList()).toEqual([7, 8, 9]);
    expect(tracker.getChanges()).toEqual([
      [1, 7, 8],
      [2, 8, 9],
    ]);

  });
});