import type { JsonObject } from "@elgato/utils";
import type { DeviceTarget } from "./identity.js";

export interface ActionSettings extends JsonObject {
  serialNumber?: string;
  devicePath?: string;
  sensitivity?: number;
  property?: "frontBrightness" | "frontTemperature" | "rearBrightness";
  operation?: "on" | "off" | "toggle" | "set" | "increase" | "decrease";
  preset?: number;
  rear?: boolean;
}

export function settingsTarget(settings: ActionSettings): DeviceTarget {
  return {
    serialNumber: typeof settings.serialNumber === "string" ? settings.serialNumber : undefined,
    devicePath: typeof settings.devicePath === "string" ? settings.devicePath : undefined,
  };
}

export function sensitivity(settings: ActionSettings): number {
  const value = Number(settings.sensitivity);
  if (!Number.isInteger(value) || value < 1 || value > 5) return 1;
  return value;
}
