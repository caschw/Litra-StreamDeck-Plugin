import { describe, expect, it } from "vitest";
import { DialBurstQueue } from "../src/litra/burst.js";

describe("dial burst coalescing", () => {
  it("coalesces compatible adjacent ticks and preserves order", () => {
    const queue = new DialBurstQueue();
    const target = { serialNumber: "A" };
    queue.push({ context: "C1", target, property: "frontBrightness", signedTicks: 1, sensitivity: 2, revision: 1 });
    queue.push({ context: "C1", target, property: "frontBrightness", signedTicks: -3, sensitivity: 2, revision: 1 });
    queue.push({ context: "C1", target, property: "frontBrightness", signedTicks: 2, sensitivity: 2, revision: 1 });
    expect(queue.take("C1")[0].signedTicks).toBe(0);
  });

  it("separates property, sensitivity, revision, context and target changes", () => {
    const queue = new DialBurstQueue();
    queue.push({ context: "C1", target: { serialNumber: "A" }, property: "frontBrightness", signedTicks: 1, sensitivity: 1, revision: 1 });
    queue.push({ context: "C1", target: { serialNumber: "A" }, property: "frontTemperature", signedTicks: 1, sensitivity: 1, revision: 1 });
    queue.push({ context: "C2", target: { serialNumber: "A" }, property: "frontTemperature", signedTicks: 1, sensitivity: 1, revision: 1 });
    queue.push({ context: "C2", target: { serialNumber: "B" }, property: "frontTemperature", signedTicks: 1, sensitivity: 1, revision: 1 });
    expect(queue.take("C1")).toHaveLength(2);
    expect(queue.take("C2")).toHaveLength(2);
  });
});
