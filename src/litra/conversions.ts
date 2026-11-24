import type { LitraDevice } from "./types.js";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentageToLumen(device: LitraDevice, percentage: number): number {
  const pct = clamp(Math.round(percentage), 0, 100);
  const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
  return clamp(device.minimum_brightness_in_lumen + Math.round((span * pct) / 100),
    device.minimum_brightness_in_lumen,
    device.maximum_brightness_in_lumen);
}

export function lumenToPercentage(device: LitraDevice, lumen: number): number {
  const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
  if (span <= 0) return 0;
  return clamp(Math.round(((clamp(lumen, device.minimum_brightness_in_lumen,
    device.maximum_brightness_in_lumen) - device.minimum_brightness_in_lumen) * 100) / span),
  0, 100);
}

export function relativeLumen(device: LitraDevice, signedPercentageSteps: number): number {
  const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
  const delta = signedPercentageSteps < 0
    ? -Math.round((span * Math.abs(signedPercentageSteps)) / 100)
    : Math.round((span * signedPercentageSteps) / 100);
  return clamp(device.brightness_in_lumen + delta,
    device.minimum_brightness_in_lumen,
    device.maximum_brightness_in_lumen);
}

export function quantizeTemperature(device: LitraDevice, kelvin: number): number {
  const quantized = Math.round(kelvin / 100) * 100;
  return clamp(quantized,
    device.minimum_temperature_in_kelvin,
    device.maximum_temperature_in_kelvin);
}
