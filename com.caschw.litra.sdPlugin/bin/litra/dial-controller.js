"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialController = void 0;
class DialController {
    execute;
    generations = new Map();
    queues = new Map();
    pending = new Map();
    drains = new Map();
    constructor(execute) {
        this.execute = execute;
    }
    generation(context) {
        return this.generations.get(context) ?? 0;
    }
    settingsChanged(context) {
        this.generations.set(context, this.generation(context) + 1);
        this.clear(context);
    }
    disappeared(context) {
        this.settingsChanged(context);
    }
    press(context, target, property) {
        const queue = this.queues.get(context) ?? [];
        const pending = this.pending.get(context);
        if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(context);
            queue.push(pending.operation);
        }
        queue.push({ kind: "press", context, target, property, generation: this.generation(context) });
        this.queues.set(context, queue);
        void this.drain(context);
    }
    rotate(context, target, property, sensitivity, ticks) {
        if (!Number.isInteger(ticks) || ticks === 0)
            return;
        const generation = this.generation(context);
        const direction = ticks > 0 ? 1 : -1;
        const pending = this.pending.get(context);
        const compatible = pending
            && pending.direction === direction
            && pending.operation.generation === generation
            && pending.operation.property === property
            && pending.operation.sensitivity === sensitivity
            && sameTarget(pending.operation.target, target);
        if (compatible) {
            clearTimeout(pending.timer);
            pending.operation.ticks += ticks;
            pending.timer = setTimeout(() => this.flushPending(context), 50);
            return;
        }
        this.flushPending(context);
        const operation = {
            kind: "rotate",
            context,
            target,
            property,
            sensitivity,
            ticks,
            generation,
        };
        const timer = setTimeout(() => this.flushPending(context), 50);
        this.pending.set(context, { operation, timer, direction });
    }
    flushPending(context) {
        const pending = this.pending.get(context);
        if (!pending)
            return;
        clearTimeout(pending.timer);
        this.pending.delete(context);
        const queue = this.queues.get(context) ?? [];
        queue.push(pending.operation);
        this.queues.set(context, queue);
        void this.drain(context);
    }
    clear(context) {
        const pending = this.pending.get(context);
        if (pending)
            clearTimeout(pending.timer);
        this.pending.delete(context);
        this.queues.delete(context);
    }
    stop() {
        for (const context of this.pending.keys())
            this.clear(context);
    }
    async drain(context) {
        const existing = this.drains.get(context);
        if (existing)
            return existing;
        const drain = this.runQueue(context).finally(() => this.drains.delete(context));
        this.drains.set(context, drain);
        await drain;
    }
    async runQueue(context) {
        while (true) {
            const queue = this.queues.get(context);
            const operation = queue?.shift();
            if (!operation) {
                this.queues.delete(context);
                return;
            }
            if (operation.generation !== this.generation(context))
                continue;
            try {
                await this.execute(operation);
            }
            catch (error) {
                console.error("Litra dial operation failed", error);
            }
        }
    }
}
exports.DialController = DialController;
function sameTarget(a, b) {
    return (a.serialNumber !== undefined && a.serialNumber === b.serialNumber)
        || (a.devicePath !== undefined && a.devicePath === b.devicePath);
}
//# sourceMappingURL=dial-controller.js.map