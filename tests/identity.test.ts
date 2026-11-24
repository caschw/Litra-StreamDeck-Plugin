import { describe, expect, it } from "vitest";
import { findUniqueTarget, validateUniqueSelection } from "../src/litra/identity.js";
import type { LitraDevice } from "../src/litra/types.js";

const device = (serial: string | null, path: string): LitraDevice => ({
  device_type: "glow", device_type_display: "Litra Glow", has_back_side: false,
  serial_number: serial, device_path: path, status_display: "On",
  brightness_display: "20/250", temperature_display: "2700/6500",
  back_status_display: "N/A", back_brightness_display: "N/A", is_on: true,
  brightness_in_lumen: 20, temperature_in_kelvin: 2700,
  minimum_brightness_in_lumen: 20, maximum_brightness_in_lumen: 250,
  minimum_temperature_in_kelvin: 2700, maximum_temperature_in_kelvin: 6500,
  is_back_on: null, back_brightness_percentage: null,
});

describe("exact device identity", () => {
  it("requires exact serial for serial targeting", () => {
    expect(findUniqueTarget([device("A", "P1")], { serialNumber: "A" })?.serial_number).toBe("A");
    expect(findUniqueTarget([device("A", "P1")], { serialNumber: "B" })).toBeNull();
  });

  it("rejects duplicate serial values", () => {
    expect(() => validateUniqueSelection([device("A", "P1"), device("A", "P2")], { serialNumber: "A" }))
      .toThrow(/ambiguous/i);
  });

  it("rejects missing path selection", () => {
    expect(() => validateUniqueSelection([], { devicePath: "P1" }))
      .toThrow(/unavailable/i);
  });

  it("disambiguates using path", () => {
    expect(findUniqueTarget([device(null, "P1"), device(null, "P2")], { devicePath: "P2" })?.device_path).toBe("P2");
  });
});
