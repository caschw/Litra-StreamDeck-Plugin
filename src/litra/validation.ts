import type { LitraDevice } from "./types.js";
import type { ActionSettings } from "./targeting.js";

function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export function validateDevicesJson(value: unknown): LitraDevice[] {
  if (!Array.isArray(value)) throw new Error("Bundled Litra helper returned an invalid device list.");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Invalid device at index ${index}.`);
    const d = raw as Record<string, unknown>;
    const requiredStrings = [
      "device_type", "device_type_display", "status_display", "brightness_display",
      "temperature_display", "back_status_display", "back_brightness_display",
    ];
    for (const key of requiredStrings) {
      if (typeof d[key] !== "string") throw new Error(`Invalid ${key} for device at index ${index}.`);
    }
    if (!["glow", "beam", "beam_lx"].includes(String(d.device_type))) {
      throw new Error(`Invalid device type at index ${index}.`);
    }
    if (typeof d.has_back_side !== "boolean" || typeof d.is_on !== "boolean") {
      throw new Error(`Invalid capability/power state at index ${index}.`);
    }
    for (const key of [
      "brightness_in_lumen", "temperature_in_kelvin",
      "minimum_brightness_in_lumen", "maximum_brightness_in_lumen",
      "minimum_temperature_in_kelvin", "maximum_temperature_in_kelvin",
    ]) {
      if (!finiteInteger(d[key])) throw new Error(`Invalid ${key} for device at index ${index}.`);
    }
    const serial = d.serial_number;
    const path = d.device_path;
    if (serial !== null && typeof serial !== "string") throw new Error(`Invalid serial number at index ${index}.`);
    if (path !== null && typeof path !== "string") throw new Error(`Invalid device path at index ${index}.`);
    if (d.is_back_on !== null && typeof d.is_back_on !== "boolean") {
      throw new Error(`Invalid rear power state at index ${index}.`);
    }
    if (d.back_brightness_percentage !== null && !finiteInteger(d.back_brightness_percentage)) {
      throw new Error(`Invalid rear brightness at index ${index}.`);
    }
    if (d.back_brightness_percentage !== null) {
      const rear = d.back_brightness_percentage as number;
      if (rear < 1 || rear > 100) throw new Error(`Rear brightness out of range at index ${index}.`);
    }
    const minimumBrightness = d.minimum_brightness_in_lumen as number;
    const maximumBrightness = d.maximum_brightness_in_lumen as number;
    if (minimumBrightness < 0 || maximumBrightness <= minimumBrightness) {
      throw new Error(`Invalid front brightness range at index ${index}.`);
    }
    const minimumTemperature = d.minimum_temperature_in_kelvin as number;
    const maximumTemperature = d.maximum_temperature_in_kelvin as number;
    if (minimumTemperature < 1 || maximumTemperature < minimumTemperature
      || minimumTemperature % 100 !== 0 || maximumTemperature % 100 !== 0) {
      throw new Error(`Invalid temperature range at index ${index}.`);
    }
    if ((d.brightness_in_lumen as number) < minimumBrightness
      || (d.brightness_in_lumen as number) > maximumBrightness) {
      throw new Error(`Front brightness out of range at index ${index}.`);
    }
    if ((d.temperature_in_kelvin as number) < minimumTemperature
      || (d.temperature_in_kelvin as number) > maximumTemperature
      || (d.temperature_in_kelvin as number) % 100 !== 0) {
      throw new Error(`Temperature out of range at index ${index}.`);
    }
    if (d.has_back_side && d.device_type !== "beam_lx") {
      throw new Error(`Invalid rear-side capability at index ${index}.`);
    }
    if (!d.has_back_side && (d.is_back_on !== null || d.back_brightness_percentage !== null)) {
      throw new Error(`Unexpected rear state at index ${index}.`);
    }
    return d as unknown as LitraDevice;
  });
}

export function validateActionSettings(settings: ActionSettings): ActionSettings {
  const sensitivity = settings.sensitivity === undefined ? 1 : settings.sensitivity;
  if (!finiteInteger(sensitivity) || sensitivity < 1 || sensitivity > 5) {
    throw new Error("Dial sensitivity must be an integer from 1 to 5.");
  }
  if (settings.preset !== undefined) {
    if (!finiteInteger(settings.preset) || settings.preset < 0) {
      throw new Error("Preset must be a non-negative integer.");
    }
  }
  if (settings.operation !== undefined
    && !["on", "off", "toggle", "set", "increase", "decrease"].includes(settings.operation)) {
    throw new Error("Invalid operation.");
  }
  if (settings.property !== undefined
    && !["frontBrightness", "frontTemperature", "rearBrightness"].includes(settings.property)) {
    throw new Error("Invalid property.");
  }
  return { ...settings, sensitivity };
}
