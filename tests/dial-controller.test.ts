import { describe, expect, it, vi } from "vitest";
import { DialController } from "../src/litra/dial-controller.js";

describe("ordered dial operations", () => {
  it("coalesces only compatible same-direction adjacent ticks", () => {
    vi.useFakeTimers();
    const execute = vi.fn(async () => undefined);
    const controller = new DialController(execute);
    const target = { serialNumber: "A" };
    controller.rotate("C1", target, "frontBrightness", 2, 1);
    controller.rotate("C1", target, "frontBrightness", 2, 2);
    vi.advanceTimersByTime(50);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({ kind: "rotate", ticks: 3 });
    vi.useRealTimers();
  });

  it("does not coalesce direction changes or barriers", async () => {
    vi.useFakeTimers();
    const execute = vi.fn(async () => undefined);
    const controller = new DialController(execute);
    const target = { serialNumber: "A" };
    controller.rotate("C1", target, "frontBrightness", 1, 1);
    controller.rotate("C1", target, "frontBrightness", 1, -1);
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(execute.mock.calls.map(([op]) => op.ticks)).toEqual([1, -1]);
    vi.useRealTimers();
  });

  it("clears obsolete settings work and captures generation", () => {
    vi.useFakeTimers();
    const execute = vi.fn(async () => undefined);
    const controller = new DialController(execute);
    controller.rotate("C1", { serialNumber: "A" }, "frontBrightness", 1, 1);
    controller.settingsChanged("C1");
    controller.rotate("C1", { serialNumber: "B" }, "frontTemperature", 3, 2);
    vi.advanceTimersByTime(50);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({
      target: { serialNumber: "B" },
      property: "frontTemperature",
      sensitivity: 3,
      ticks: 2,
    });
    vi.useRealTimers();
  });

  it("flushes rotation before press and preserves press ordering", async () => {
    vi.useFakeTimers();
    const execute = vi.fn(async () => undefined);
    const controller = new DialController(execute);
    controller.rotate("C1", { devicePath: "P1" }, "rearBrightness", 1, 2);
    controller.press("C1", { devicePath: "P1" }, "rearBrightness");
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    await Promise.resolve();
    expect(execute.mock.calls.map(([op]) => op.kind)).toEqual(["rotate", "press"]);
    vi.useRealTimers();
  });
});
