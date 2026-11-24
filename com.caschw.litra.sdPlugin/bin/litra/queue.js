"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializedQueue = void 0;
class SerializedQueue {
    tail = Promise.resolve();
    enqueue(operation) {
        const result = this.tail.then(operation, operation);
        this.tail = result.then(() => undefined, () => undefined);
        return result;
    }
}
exports.SerializedQueue = SerializedQueue;
//# sourceMappingURL=queue.js.map