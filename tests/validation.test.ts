import { describe, expect, it } from "vitest";
import { validateDevicesJson, validateActionSettings } from "../src/litra/validation.js";
import type { LitraDevice } from "../src/litra/types.js";

const glow: LitraDevice = {
  device_type: "glow", device_type_display: "Litra Glow", has_back_side: false,
  serial_number: "SERIAL", device_path: "PATH", status_display: "On",
  brightness_display: "130/250", temperature_display: "2700/6500",
  back_status_display: "N/A", back_brightness_display: "N/A", is_on: true,
  brightness_in_lumen: 130, temperature_in_kelvin: 2700,
  minimum_brightness_in_lumen: 20, maximum_brightness_in_lumen: 250,
  minimum_temperature_in_kelvin: 2700, maximum_temperature_in_kelvin: 6500,
  is_back_on: null, back_brightness_percentage: null,
};

describe("runtime validation", () => {
  it("accepts valid device JSON", () => {
    expect(validateDevicesJson([glow])).toHaveLength(1);
  });

  it("rejects malformed bounds and malformed devices", () => {
    expect(() => validateDevicesJson([{ ...glow, maximum_brightness_in_lumen: 10 }])).toThrow();
    expect(() => validateDevicesJson([{ ...glow, is_on: "yes" }])).toThrow();
  });

  it("allows preset zero for front brightness", () => {
    expect(validateActionSettings({ preset: 0, sensitivity: 1 }).preset).toBe(0);
  });

  it("rejects NaN, fractional sensitivity, and unknown property", () => {
    expect(() => validateActionSettings({ sensitivity: Number.NaN })).toThrow();
    expect(() => validateActionSettings({ sensitivity: 1.5 })).toThrow();
    expect(() => validateActionSettings({ property: "rgb" as never })).toThrow();
  });

  it("rejects rear state on non-LX", () => {
    expect(() => validateDevicesJson([{ ...glow, has_back_side: true }])).toThrow();
  });
});
