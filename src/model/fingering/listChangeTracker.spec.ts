import { describe, expect, it } from 'vitest';

import { ListChangesTracker, ListChangesTrackerWithPlaceholders } from '@/model/fingering/listChangeTracker';

describe('ListChangesTracker', () => {

  it('should handle an empty list', () => {
    const tracker = new ListChangesTracker([]);
    expect(tracker.getChanges()).toEqual([]);
    expect(tracker.getList()).toEqual([]);
  });

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

  describe('placeholders', () => {

    describe('initialize', () => {
      
      it('should allow a single element list with a placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([null]);
        expect(tracker.getList()).toEqual([null]);
        expect(tracker.getChanges()).toEqual([]);
  
      });

      it('should allow two element list of placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([null, null]);
        expect(tracker.getList()).toEqual([null, null]);
        expect(tracker.getChanges()).toEqual([]);
  
      });

      it('should allow for a three element list of placeholders', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null]);
        expect(tracker.getChanges()).toEqual([]);
  
      });

      it('should use preceding value for a placeholders if the value is defined', () => {

        let tracker;

        tracker = new ListChangesTrackerWithPlaceholders([1, null, null]);
        expect(tracker.getList()).toEqual([1, 1, 1]);
        expect(tracker.getChanges()).toEqual([]);

        tracker = new ListChangesTrackerWithPlaceholders([null, 1, null]);
        expect(tracker.getList()).toEqual([null, 1, 1]);
        expect(tracker.getChanges()).toEqual([[1, null, 1]]);

        tracker = new ListChangesTrackerWithPlaceholders([null, null, 1]);
        expect(tracker.getList()).toEqual([null, null, 1]);
        expect(tracker.getChanges()).toEqual([[2, null, 1]]);

      });

      it('should handle change between actual values with placeholder in between', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 2]);
        expect(tracker.getList()).toEqual([1, 1, 2]);
        expect(tracker.getChanges()).toEqual([
          [2, 1, 2]
        ]);
  
      });

    });

    describe('->updateList() to value', () => {

      it('should update a single element list with a placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null]);
        expect(tracker.getList()).toEqual([null]);
        expect(tracker.getChanges()).toEqual([]);

        const updates = tracker.updateList(0, 1);
        expect(updates).toEqual([]);
        expect(tracker.getList()).toEqual([1]);

      });

      it('should update first element in list of two placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null]);
        expect(tracker.getList()).toEqual([null, null]);
        expect(tracker.getChanges()).toEqual([]);

        const updates = tracker.updateList(0, 1);
        expect(updates).toEqual([]);
        expect(tracker.getList()).toEqual([1, 1]);

      });

      it('should update second element in list of two placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null]);
        expect(tracker.getList()).toEqual([null, null]);
        expect(tracker.getChanges()).toEqual([]);

        const updates = tracker.updateList(1, 1);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [null, 1] }
        ]);
        expect(tracker.getList()).toEqual([null, 1]);

      });

      it('should update value in list of value followed by a placeholder', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, null]);
        expect(tracker.getList()).toEqual([1, 1]);
        expect(tracker.getChanges()).toEqual([]);

        const updates = tracker.updateList(0, 2);
        expect(tracker.getList()).toEqual([2, 2]);
        expect(updates).toEqual([]);

      });

      it('should update value in list of placeholder followed by a value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, 1]);
        expect(tracker.getList()).toEqual([null, 1]);
        expect(tracker.getChanges()).toEqual([
          [1, null, 1]
        ]);

        const updates = tracker.updateList(1, 2);
        expect(tracker.getList()).toEqual([null, 2]);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [null, 1] },
          { type: "add", index: 1, change: [null, 2] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [1, null, 2]
        ]);

      });

      it('should update first element in three element list of placeholders', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(0, 1);
        expect(tracker.getList()).toEqual([1, 1, 1]);
        expect(updates).toEqual([]);

      });
    
      it('should update second element in three element list of placeholders', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(1, 1);

        expect(tracker.getList()).toEqual([null, 1, 1]);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [null, 1] }
        ]);

      });
    
      it('should update third element in three element list of placeholders', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(2, 1);
        expect(updates).toEqual([
          { type: "add", index: 2, change: [null, 1] }
        ]);
        expect(tracker.getList()).toEqual([null, null, 1]);

      });

      it('should retain explicit value appearing after placeholders are replaced by equal value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 2]);
        expect(tracker.getList()).toEqual([1, 1, 2]);
        expect(tracker.getChanges()).toEqual([
          [2, 1, 2]
        ]);

        const updates = tracker.updateList(0, 2);
        expect(tracker.getList()).toEqual([2, 2, 2]);
        expect(tracker.getChanges()).toEqual([]);
        expect(updates).toEqual([
          { type: "remove", index: 2, change: [1, 2] }
        ]);

        const updates2 = tracker.updateList(0, 1);
        expect(tracker.getList()).toEqual([1, 1, 2]);
        expect(updates2).toEqual([
          { type: "add", index: 2, change: [1, 2] }
        ]);

      });

      it('should update second element in a list with 4 placeholders', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<null | number>([null, null, null, null]);
        const updates = tracker.updateList(1, 1);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [null, 1] }
        ]);
        expect(tracker.getList()).toEqual([null, 1, 1, 1]);
        expect(tracker.getChanges()).toEqual([
          [1, null, 1]
        ]);

      });

      it('should update first element in four element list of placeholders starting with value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([0, null, null, null]);
        expect(tracker.getList()).toEqual([0, 0, 0, 0]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(0, 1);
        expect(tracker.getList()).toEqual([1, 1, 1, 1]);
        expect(updates).toEqual([]);

      });
    
      it('should update second element in four element list of placeholders starting with value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([0, null, null, null]);
        expect(tracker.getList()).toEqual([0, 0, 0, 0]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(1, 1);

        expect(tracker.getList()).toEqual([0, 1, 1, 1]);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [0, 1] }
        ]);

      });
    
      it('should update third element in four element list of placeholders starting with value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([0, null, null, null]);
        expect(tracker.getList()).toEqual([0, 0, 0, 0]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(2, 1);
        expect(tracker.getList()).toEqual([0, 0, 1, 1]);
        expect(updates).toEqual([
          { type: "add", index: 2, change: [0, 1] }
        ]);

      });

      it('should update fourth element in four element list of placeholders starting with value', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([0, null, null, null]);
        expect(tracker.getList()).toEqual([0, 0, 0, 0]);
        expect(tracker.getChanges()).toEqual([]);
    
        const updates = tracker.updateList(3, 1);
        expect(tracker.getList()).toEqual([0, 0, 0, 1]);
        expect(updates).toEqual([
          { type: "add", index: 3, change: [0, 1] }
        ]);

      });

      it('should provide changes that need to be made to replace placeholder surrounded by 2 values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 3]);
        expect(tracker.getList()).toEqual([1, 1, 3]);

        const updates = tracker.updateList(1, 2);
        expect(tracker.getList()).toEqual([1, 2, 3]);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [1, 2] },
          { type: 'remove', index: 2, change: [1, 3] },
          { type: "add", index: 2, change: [2, 3] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2], [2, 2, 3]
        ]);

      });

      it('should provide changes that need to be made to replace 1st placeholder surrounded by 2 values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, null, 3]);
        expect(tracker.getList()).toEqual([1, 1, 1, 3]);

        const updates = tracker.updateList(1, 2);
        expect(tracker.getListWithPlaceholders()).toEqual([1, 2, null, 3]);
        expect(tracker.getList()).toEqual([1, 2, 2, 3]);
        expect(updates).toEqual([
          { type: "add", index: 1, change: [1, 2] },
          { type: 'remove', index: 3, change: [1, 3] },
          { type: "add", index: 3, change: [2, 3] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2], [3, 2, 3]
        ]);

      });

      it('should provide changes that need to be made to replace 2nd placeholder surrounded by 2 values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, null, 3]);
        expect(tracker.getList()).toEqual([1, 1, 1, 3]);

        const updates = tracker.updateList(2, 2);
        expect(tracker.getListWithPlaceholders()).toEqual([1, null, 2, 3]);
        expect(tracker.getList()).toEqual([1, 1, 2, 3]);
        expect(updates).toEqual([
          { type: "add", index: 2, change: [1, 2] },
          { type: 'remove', index: 3, change: [1, 3] },
          { type: "add", index: 3, change: [2, 3] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [2, 1, 2], [3, 2, 3]
        ]);

      });

      it('should update from [null, null, null, null, null] to [1, 2, 3, 4, 5] in specific order', () => {
        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([null, null, null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null, null, null]);
      
        const updates1 = tracker.updateList(1, 2);
        expect(tracker.getListWithPlaceholders()).toEqual([null, 2, null, null, null]);
        expect(tracker.getList()).toEqual([null, 2, 2, 2, 2]);
        expect(updates1).toEqual([
          { type: "add", index: 1, change: [null, 2] }
        ]);
      
        const updates2 = tracker.updateList(3, 4);
        expect(tracker.getListWithPlaceholders()).toEqual([null, 2, null, 4, null]);
        expect(tracker.getList()).toEqual([null, 2, 2, 4, 4]);
        expect(updates2).toEqual([
          { type: "add", index: 3, change: [2, 4] }
        ]);
      
        const updates3 = tracker.updateList(0, 1);
        expect(tracker.getListWithPlaceholders()).toEqual([1, 2, null, 4, null]);
        expect(tracker.getList()).toEqual([1, 2, 2, 4, 4]);
        expect(updates3).toEqual([
          { type: "remove", index: 1, change: [null, 2] },
          { type: "add", index: 1, change: [1, 2] }
        ]);
      
        const updates4 = tracker.updateList(4, 5);
        expect(tracker.getListWithPlaceholders()).toEqual([1, 2, null, 4, 5]);
        expect(tracker.getList()).toEqual([1, 2, 2, 4, 5]);
        expect(updates4).toEqual([
          { type: "add", index: 4, change: [4, 5] }
        ]);
      
        const updates5 = tracker.updateList(2, 3);
        expect(tracker.getListWithPlaceholders()).toEqual([1, 2, 3, 4, 5]);
        expect(tracker.getList()).toEqual([1, 2, 3, 4, 5]);
        expect(updates5).toEqual([
          { type: "add", index: 2, change: [2, 3] },
          { type: "remove", index: 3, change: [2, 4] },
          { type: "add", index: 3, change: [3, 4] }
        ]);
      
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2],
          [2, 2, 3],
          [3, 3, 4],
          [4, 4, 5]
        ]);
      });

    });

    describe('->updateList() to placeholder', () => {

      it('should update with a placeholder a single element list ', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1]);
        expect(tracker.getList()).toEqual([1]);
        expect(tracker.getChanges()).toEqual([]);

        const updates = tracker.updateList(0, null);
        expect(updates).toEqual([]);
        expect(tracker.getList()).toEqual([null]);

      });

      it('places placeholder at first element in list of two values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, 2]);
        expect(tracker.getList()).toEqual([1, 2]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2]
        ]);

        const updates = tracker.updateList(0, null);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [1, 2] },
          { type: "add", index: 1, change: [null, 2] }
        ]);
        expect(tracker.getList()).toEqual([null, 2]);
        expect(tracker.getChanges()).toEqual([
          [1, null, 2]
        ]);

      });

      it('places placeholder at second element in list of two values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, 2]);
        expect(tracker.getList()).toEqual([1, 2]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2]
        ]);

        const updates = tracker.updateList(1, null);
        expect(tracker.getList()).toEqual([1, 1]);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [1, 2] }
        ]);

      });

      it('puts placeholder in the first element in three element list of values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, 2, 3]);
        expect(tracker.getList()).toEqual([1, 2, 3]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2], [2, 2, 3]
        ]);
    
        const updates = tracker.updateList(0, null);
        expect(tracker.getList()).toEqual([null, 2, 3]);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [1, 2] },
          { type: "add", index: 1, change: [null, 2] }
        ]);

      });
    
      it('puts placeholder in the second element in three element list of values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, 2, 3]);
        expect(tracker.getList()).toEqual([1, 2, 3]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2], [2, 2, 3]
        ]);
    
        const updates = tracker.updateList(1, null);

        expect(tracker.getList()).toEqual([1, 1, 3]);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [1, 2] },
          { type: "remove", index: 2, change: [2, 3] },
          { type: "add", index: 2, change: [1, 3] }
        ]);

      });
    
      it('puts placeholder in the third element in three element list of values', () => {

        const tracker = new ListChangesTrackerWithPlaceholders<number | null>([1, 2, 3]);
        expect(tracker.getList()).toEqual([1, 2, 3]);
        expect(tracker.getChanges()).toEqual([
          [1, 1, 2], [2, 2, 3]
        ]);
    
        const updates = tracker.updateList(2, null);
        expect(tracker.getList()).toEqual([1, 2, 2]);
        expect(updates).toEqual([
          { type: "remove", index: 2, change: [2, 3] }
        ]);

      });

      it('should update from [1, 2, null, 4] to [1, null, null, 4]', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, 2, null, 4]);
        expect(tracker.getList()).toEqual([1, 2, 2, 4]);

        const updates = tracker.updateList(1, null);
        expect(tracker.getListWithPlaceholders()).toEqual([1, null, null, 4]);
        expect(tracker.getList()).toEqual([1, 1, 1, 4]);
        expect(updates).toEqual([
          { type: "remove", index: 1, change: [1, 2] },
          { type: 'remove', index: 3, change: [2, 4] },
          { type: "add", index: 3, change: [1, 4] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [3, 1, 4]
        ]);

      });

      it('should update from [1, null, 3, 4] to [1, null, null, 4]', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 3, 4]);
        expect(tracker.getList()).toEqual([1, 1, 3, 4]);

        const updates = tracker.updateList(2, null);
        expect(tracker.getListWithPlaceholders()).toEqual([1, null, null, 4]);
        expect(tracker.getList()).toEqual([1, 1, 1, 4]);
        expect(updates).toEqual([
          { type: "remove", index: 2, change: [1, 3] },
          { type: 'remove', index: 3, change: [3, 4] },
          { type: "add", index: 3, change: [1, 4] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [3, 1, 4]
        ]);

      });

      it('should update from [1, null, 2, null] to [1, null, null, null]', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 2, null]);
        expect(tracker.getList()).toEqual([1, 1, 2, 2])
        expect(tracker.getChanges()).toEqual([[2, 1, 2]]);
  
        const updates = tracker.updateList(2, null);
        expect(tracker.getList()).toEqual([1, 1, 1, 1]);
        expect(updates).toEqual([
          { type: "remove", index: 2, change: [1, 2] },
        ]);
        expect(tracker.getChanges()).toEqual([]);
  
      });

      it('should update from [1, null, 3, null, 5] to [1, null, null, null, 5]', () => {

        const tracker = new ListChangesTrackerWithPlaceholders([1, null, 3, null, 5]);
        expect(tracker.getList()).toEqual([1, 1, 3, 3, 5])
  
        const updates = tracker.updateList(2, null);
        expect(tracker.getList()).toEqual([1, 1, 1, 1, 5]);
        expect(updates).toEqual([
          { type: "remove", index: 2, change: [1, 3] },
          { type: "remove", index: 4, change: [3, 5] },
          { type: "add", index: 4, change: [1, 5] }
        ]);
        expect(tracker.getChanges()).toEqual([
          [4, 1, 5]
        ]);
  
      });

      it('should update from [1, 2, 3, 4, 5] to [null, null, null, null, null] in specific order', () => {
        const tracker = new ListChangesTrackerWithPlaceholders([1, 2, 3, 4, 5]);
        expect(tracker.getList()).toEqual([1, 2, 3, 4, 5]);
      
        const updates1 = tracker.updateList(1, null);
        expect(tracker.getListWithPlaceholders()).toEqual([1, null, 3, 4, 5]);
        expect(tracker.getList()).toEqual([1, 1, 3, 4, 5]);
        expect(updates1).toEqual([
          { type: "remove", index: 1, change: [1, 2] },
          { type: "remove", index: 2, change: [2, 3] },
          { type: "add", index: 2, change: [1, 3] }
        ]);
      
        const updates2 = tracker.updateList(3, null);
        expect(tracker.getListWithPlaceholders()).toEqual([1, null, 3, null, 5]);
        expect(tracker.getList()).toEqual([1, 1, 3, 3, 5]);
        expect(updates2).toEqual([
          { type: "remove", index: 3, change: [3, 4] },
          { type: "remove", index: 4, change: [4, 5] },
          { type: "add", index: 4, change: [3, 5] }
        ]);
      
        const updates3 = tracker.updateList(0, null);
        expect(tracker.getListWithPlaceholders()).toEqual([null, null, 3, null, 5]);
        expect(tracker.getList()).toEqual([null, null, 3, 3, 5]);
        expect(updates3).toEqual([
          { type: "remove", index: 2, change: [1, 3] },
          { type: "add", index: 2, change: [null, 3] }
        ]);
      
        const updates4 = tracker.updateList(4, null);
        expect(tracker.getListWithPlaceholders()).toEqual([null, null, 3, null, null]);
        expect(tracker.getList()).toEqual([null, null, 3, 3, 3]);
        expect(updates4).toEqual([
          { type: "remove", index: 4, change: [3, 5] }
        ]);
      
        const updates5 = tracker.updateList(2, null);
        expect(tracker.getListWithPlaceholders()).toEqual([null, null, null, null, null]);
        expect(tracker.getList()).toEqual([null, null, null, null, null]);
        expect(updates5).toEqual([
          { type: "remove", index: 2, change: [null, 3] }
        ]);
      
        expect(tracker.getChanges()).toEqual([]);
      });

    });

  });

  describe('Performance', () => {
    // Helper function to measure execution time
    const measureTime = (fn: () => void): number => {
      const start = process.hrtime.bigint();
      fn();
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e6; // Convert to milliseconds
    };
  
    // Helper function to create a list of specified length with all elements set to 0
    const createList = (length: number): number[] => new Array(length).fill(0);
  
    it('should scale logarithmically with the number of changes', { retry: 3 }, () => {
      const listLength = 100000; // Fixed large list length
      const changeCounts = [100, 1000, 10000, 10000];
      const times: number[] = [];
  
      for (const changeCount of changeCounts) {
        const list = createList(listLength);
        const tracker = new ListChangesTracker(list);
  
        const time = measureTime(() => {
          for (let i = 0; i < changeCount; i++) {
            tracker.updateList(i, 1);
          }
        });
  
        times.push(time / changeCount);
      }
  
      // Check if the time increases logarithmically
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i - 1];
        expect(ratio).toBeLessThan(2); // Logarithmic growth should be less than linear
      }
    });
  
    it('should be independent of list length', { retry: 3 }, () => {
      const changeCount = 1000; // Fixed number of changes
      const listLengths = [100, 1000, 10000, 100000, 1000000];
      const times: number[] = [];
  
      for (const listLength of listLengths) {
        const list = createList(listLength);
        const tracker = new ListChangesTracker(list);
  
        const time = measureTime(() => {
          for (let i = 0; i < changeCount; i++) {
            tracker.updateList(i % listLength, 1);
          }
        });
  
        times.push(time / changeCount);
      }
  
      // Check if the time remains relatively constant
      // allows for 2 orders of magnitude difference
      // across 5 orders of magnitude of list length
      const threshold = Math.sqrt(20);
  
      expect(times[times.length - 1]).toBeLessThan(times[0] * threshold);

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      for (const time of times) {
        expect(time).toBeLessThan(avgTime * threshold);
        expect(time).toBeGreaterThan(avgTime / threshold);
      }

    });
  });

});