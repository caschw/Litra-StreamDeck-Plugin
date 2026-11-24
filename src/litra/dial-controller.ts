import type { ActionSettings } from "./targeting.js";
import type { DeviceTarget } from "./identity.js";

export type DialOperation =
  | { kind: "rotate"; context: string; target: DeviceTarget; property: NonNullable<ActionSettings["property"]>; sensitivity: number; ticks: number; generation: number }
  | { kind: "press"; context: string; target: DeviceTarget; property: NonNullable<ActionSettings["property"]>; generation: number };

interface PendingRotation {
  operation: Extract<DialOperation, { kind: "rotate" }>;
  timer: NodeJS.Timeout;
  direction: 1 | -1;
}

export class DialController {
  private generations = new Map<string, number>();
  private queues = new Map<string, DialOperation[]>();
  private pending = new Map<string, PendingRotation>();
  private drains = new Map<string, Promise<void>>();

  constructor(private readonly execute: (operation: DialOperation) => Promise<void>) {}

  generation(context: string): number {
    return this.generations.get(context) ?? 0;
  }

  settingsChanged(context: string): void {
    this.generations.set(context, this.generation(context) + 1);
    this.clear(context);
  }

  disappeared(context: string): void {
    this.settingsChanged(context);
  }

  press(context: string, target: DeviceTarget, property: NonNullable<ActionSettings["property"]>): void {
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

  rotate(
    context: string,
    target: DeviceTarget,
    property: NonNullable<ActionSettings["property"]>,
    sensitivity: number,
    ticks: number,
  ): void {
    if (!Number.isInteger(ticks) || ticks === 0) return;
    const generation = this.generation(context);
    const direction: 1 | -1 = ticks > 0 ? 1 : -1;
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
    const operation: Extract<DialOperation, { kind: "rotate" }> = {
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

  flushPending(context: string): void {
    const pending = this.pending.get(context);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(context);
    const queue = this.queues.get(context) ?? [];
    queue.push(pending.operation);
    this.queues.set(context, queue);
    void this.drain(context);
  }

  clear(context: string): void {
    const pending = this.pending.get(context);
    if (pending) clearTimeout(pending.timer);
    this.pending.delete(context);
    this.queues.delete(context);
  }

  stop(): void {
    for (const context of this.pending.keys()) this.clear(context);
  }

  private async drain(context: string): Promise<void> {
    const existing = this.drains.get(context);
    if (existing) return existing;
    const drain = this.runQueue(context).finally(() => this.drains.delete(context));
    this.drains.set(context, drain);
    await drain;
  }

  private async runQueue(context: string): Promise<void> {
    while (true) {
      const queue = this.queues.get(context);
      const operation = queue?.shift();
      if (!operation) {
        this.queues.delete(context);
        return;
      }
      if (operation.generation !== this.generation(context)) continue;
      try {
        await this.execute(operation);
      } catch (error) {
        console.error("Litra dial operation failed", error);
      }
    }
  }
}

function sameTarget(a: DeviceTarget, b: DeviceTarget): boolean {
  return (a.serialNumber !== undefined && a.serialNumber === b.serialNumber)
    || (a.devicePath !== undefined && a.devicePath === b.devicePath);
}
