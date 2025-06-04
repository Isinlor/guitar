import { AvlTree } from '@datastructures-js/binary-search-tree';
export class ListChangesTracker {
    constructor(initialList) {
        this.changes = new AvlTree((a, b) => a[0] - b[0]);
        this.length = initialList.length;
        this.initialValue = initialList[0];
        this.initializeChanges(initialList);
    }
    initializeChanges(initialList) {
        for (let i = 1; i < this.length; i++) {
            if (initialList[i] !== initialList[i - 1]) {
                this.changes.insert([i, initialList[i - 1], initialList[i]]);
            }
        }
    }
    updateList(listIndex, to) {
        if (listIndex < 0 || listIndex > this.length - 1)
            throw new Error(`Index ${listIndex} out of bounds. List length is ${this.length}.`);
        const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
        const next = listIndex < this.length - 1 ? this.getValue(listIndex + 1) : undefined;
        if (listIndex === 0)
            this.initialValue = to;
        const updates = [];
        if (prev !== undefined) {
            updates.push(...this.updateChange(listIndex, prev, to));
        }
        if (next !== undefined) {
            updates.push(...this.updateChange(listIndex + 1, to, next));
        }
        return updates;
    }
    updateChange(listIndex, left, right) {
        const updates = [];
        const changeNode = this.changes.find([listIndex, undefined, undefined]);
        // Remove old change if it exists
        if (changeNode && changeNode.getValue()[0] === listIndex) {
            const oldChange = changeNode.getValue();
            updates.push({ type: "remove", index: listIndex, change: [oldChange[1], oldChange[2]] });
            this.changes.remove(oldChange);
        }
        // Add new change if values are different
        if (left !== right) {
            const newChange = [listIndex, left, right];
            this.changes.insert(newChange);
            updates.push({ type: "add", index: listIndex, change: [left, right] });
        }
        return updates;
    }
    getValue(listIndex) {
        if (listIndex < 0 || listIndex > this.length - 1)
            throw new Error(`Index ${listIndex} out of bounds. List length is ${this.length}.`);
        const lastChangeBeforeIndex = this.changes.lowerBound([listIndex, undefined, undefined]);
        if (!lastChangeBeforeIndex)
            return this.initialValue;
        return lastChangeBeforeIndex.getValue()[2];
    }
    getChangeAfter(listIndex) {
        const change = this.changes.upperBound([listIndex, undefined, undefined], false);
        return change ? change.getValue() : undefined;
    }
    getChangeBefore(listIndex) {
        const change = this.changes.lowerBound([listIndex, undefined, undefined], false);
        return change ? change.getValue() : undefined;
    }
    getChanges() {
        const result = [];
        this.changes.traverseInOrder((node) => {
            result.push(node.getValue());
        });
        return result;
    }
    getList() {
        return Array.from({ length: this.length }, (_, i) => this.getValue(i));
    }
}
export class ListChangesTrackerWithPlaceholders extends ListChangesTracker {
    constructor(initialList) {
        var _a;
        let oldValue = (_a = initialList[0]) !== null && _a !== void 0 ? _a : null;
        const secondaryList = initialList.map((v) => {
            if (v !== null && v !== undefined)
                oldValue = v;
            return v !== null && v !== void 0 ? v : oldValue;
        });
        super(secondaryList);
        this.primaryTracker = new ListChangesTracker(initialList);
    }
    updateList(listIndex, to) {
        const updates = [];
        this.primaryTracker.updateList(listIndex, to);
        if (to !== null) {
            const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
            const nextChange = this.primaryTracker.getChangeAfter(listIndex);
            const endOfPlaceholdersChange = nextChange && nextChange[2] === null ?
                this.primaryTracker.getChangeAfter(nextChange[0]) : undefined;
            if (listIndex === 0)
                this.initialValue = to;
            if (prev !== undefined) {
                updates.push(...this.updateChange(listIndex, prev, to));
            }
            if (nextChange) {
                updates.push(...this.updateChange(nextChange[0], to, nextChange[2] !== null ? nextChange[2] : to));
            }
            if (endOfPlaceholdersChange) {
                updates.push(...this.updateChange(endOfPlaceholdersChange[0], to, endOfPlaceholdersChange[2]));
            }
        }
        else {
            const prev = listIndex > 0 ? this.getValue(listIndex - 1) : undefined;
            const nextChange = this.primaryTracker.getChangeAfter(listIndex);
            const endOfPlaceholdersChange = nextChange && nextChange[2] === null ?
                this.primaryTracker.getChangeAfter(nextChange[0]) : undefined;
            if (listIndex === 0)
                this.initialValue = to;
            if (prev !== undefined) {
                updates.push(...this.updateChange(listIndex, prev, prev));
            }
            if (nextChange && nextChange[2] == null) {
                updates.push(...this.updateChange(nextChange[0], null, null));
                if (endOfPlaceholdersChange) {
                    updates.push(...this.updateChange(endOfPlaceholdersChange[0], prev !== null && prev !== void 0 ? prev : null, endOfPlaceholdersChange[2]));
                }
            }
            if (nextChange && nextChange[2] !== null) {
                updates.push(...this.updateChange(nextChange[0], prev !== null && prev !== void 0 ? prev : null, nextChange[2]));
            }
        }
        return updates;
    }
    getListWithPlaceholders() {
        return this.primaryTracker.getList();
    }
}
