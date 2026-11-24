import { describe, expect, it } from "vitest";
import { clamp, lumenToPercentage, percentageToLumen, quantizeTemperature, relativeLumen } from "../src/litra/conversions.js";
import type { LitraDevice } from "../src/litra/types.js";

const glow = {
  device_type: "glow", device_type_display: "Litra Glow", has_back_side: false,
  serial_number: "SERIAL", device_path: "PATH", status_display: "On",
  brightness_display: "130/250", temperature_display: "2700/6500",
  back_status_display: "N/A", back_brightness_display: "N/A", is_on: true,
  brightness_in_lumen: 130, temperature_in_kelvin: 2700,
  minimum_brightness_in_lumen: 20, maximum_brightness_in_lumen: 250,
  minimum_temperature_in_kelvin: 2700, maximum_temperature_in_kelvin: 6500,
  is_back_on: null, back_brightness_percentage: null,
} satisfies LitraDevice;

describe("brightness conversions", () => {
  it("maps 0 and 100 to native lumen limits", () => {
    expect(percentageToLumen(glow, 0)).toBe(20);
    expect(percentageToLumen(glow, 100)).toBe(250);
  });

  it("does not expose 0 lumens as minimum percentage", () => {
    expect(lumenToPercentage(glow, 20)).toBe(0);
    expect(lumenToPercentage(glow, 250)).toBe(100);
  });

  it("uses native lumen deltas for relative steps", () => {
    expect(relativeLumen(glow, 1)).toBe(132);
    expect(relativeLumen({ ...glow, brightness_in_lumen: 240 }, -5)).toBe(228);
  });

  it("clamps every boundary", () => {
    expect(relativeLumen({ ...glow, brightness_in_lumen: 250 }, 5)).toBe(250);
    expect(relativeLumen({ ...glow, brightness_in_lumen: 20 }, -5)).toBe(20);
  });

  it("clamps temperature and quantizes to 100 K", () => {
    expect(quantizeTemperature(glow, 2834)).toBe(2800);
    expect(quantizeTemperature(glow, 7000)).toBe(6500);
  });

  it("clamps generic values", () => {
    expect(clamp(-2, 1, 100)).toBe(1);
    expect(clamp(101, 1, 100)).toBe(100);
  });
});
