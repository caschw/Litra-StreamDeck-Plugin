import { describe, expect, it, vi } from "vitest";
import { LitraState } from "../src/litra/state.js";
import type { LitraDevice } from "../src/litra/types.js";

const device = (on = true, lumen = 130): LitraDevice => ({
  device_type: "glow", device_type_display: "Litra Glow", has_back_side: false,
  serial_number: "SERIAL", device_path: "PATH", status_display: on ? "On" : "Off",
  brightness_display: `${lumen}/250`, temperature_display: "2700/6500",
  back_status_display: "N/A", back_brightness_display: "N/A", is_on: on,
  brightness_in_lumen: lumen, temperature_in_kelvin: 2700,
  minimum_brightness_in_lumen: 20, maximum_brightness_in_lumen: 250,
  minimum_temperature_in_kelvin: 2700, maximum_temperature_in_kelvin: 6500,
  is_back_on: null, back_brightness_percentage: null,
});

describe("serialized confirmed-state transactions", () => {
  it("reads fresh state, executes write, then post-reads", async () => {
    const reads = [device(false, 130), device(true, 130)];
    const read = vi.fn(async () => [reads.shift()!]);
    const write = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const state = new LitraState(read, write);
    const result = await state.mutate({ serialNumber: "SERIAL" }, () => ["on", "--serial-number", "SERIAL"]);
    expect(read).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.device?.is_on).toBe(true);
  });

  it("returns readback error rather than optimistic state", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce([device(false)])
      .mockRejectedValueOnce(new Error("readback failed"));
    const write = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const state = new LitraState(read, write);
    const result = await state.mutate({ serialNumber: "SERIAL" }, () => ["on", "--serial-number", "SERIAL"]);
    expect(result.device).toBeNull();
    expect(result.error).toContain("readback");
  });

  it("attempts readback after an ambiguous partial write failure", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce([device(false)])
      .mockResolvedValueOnce([device(true)]);
    const write = vi.fn(async () => { throw new Error("helper exited"); });
    const state = new LitraState(read, write);
    const result = await state.mutate({ serialNumber: "SERIAL" }, () => ["toggle", "--serial-number", "SERIAL"]);
    expect(result.device?.is_on).toBe(true);
    expect(result.error).toContain("read back");
  });

  it("fans confirmed state to two subscribers and ignores stale pending work", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce([device(false)])
      .mockResolvedValueOnce([device(true)]);
    const write = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const state = new LitraState(read, write);
    const subscribers = [vi.fn(), vi.fn()];
    state.subscribe(subscribers[0]);
    state.subscribe(subscribers[1]);
    await state.mutate({ serialNumber: "SERIAL" }, () => ["on", "--serial-number", "SERIAL"]);
    expect(subscribers[0]).toHaveBeenCalled();
    expect(subscribers[1]).toHaveBeenCalled();
    expect(subscribers[0].mock.calls.some(([n]) => n.status === "confirmed")).toBe(true);
  });

  it("poll change reaches distinct visible subscribers", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce([device(false)])
      .mockResolvedValueOnce([device(true)])
      .mockResolvedValueOnce([device(true)]);
    const state = new LitraState(read, vi.fn());
    const first = vi.fn();
    const second = vi.fn();
    state.subscribe(first);
    state.subscribe(second);
    await state.refresh();
    await state.refresh();
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});
