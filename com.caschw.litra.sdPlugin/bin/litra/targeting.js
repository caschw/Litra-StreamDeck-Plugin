"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsTarget = settingsTarget;
exports.sensitivity = sensitivity;
exports.validatedTarget = validatedTarget;
exports.validateActionSettings = validateActionSettings;
function settingsTarget(settings) {
    if (settings.targetMode === "path" && typeof settings.devicePath === "string" && settings.devicePath.trim()) {
        return { devicePath: settings.devicePath.trim() };
    }
    return {
        serialNumber: typeof settings.serialNumber === "string" ? settings.serialNumber : undefined,
        devicePath: typeof settings.devicePath === "string" ? settings.devicePath : undefined,
    };
}
function sensitivity(settings) {
    const value = Number(settings.sensitivity);
    if (!Number.isInteger(value) || value < 1 || value > 5)
        return 1;
    return value;
}
function validatedTarget(settings) {
    if (typeof settings.serialNumber === "string" && settings.serialNumber.trim()) {
        return { serialNumber: settings.serialNumber.trim() };
    }
    if (typeof settings.devicePath === "string" && settings.devicePath.trim()) {
        return { devicePath: settings.devicePath.trim() };
    }
    throw new Error("A serial number or device path is required.");
}
function validateActionSettings(settings) {
    if (settings.sensitivity !== undefined
        && (!Number.isInteger(settings.sensitivity) || settings.sensitivity < 1 || settings.sensitivity > 5)) {
        throw new Error("Sensitivity must be an integer from 1 to 5 percentage points/K per detent.");
    }
    if (settings.preset !== undefined
        && (!Number.isFinite(settings.preset) || !Number.isInteger(settings.preset) || settings.preset < 0)) {
        throw new Error("Preset must be a non-negative integer.");
    }
    if (settings.property !== undefined
        && !["frontBrightness", "frontTemperature", "rearBrightness"].includes(settings.property)) {
        throw new Error("Invalid property.");
    }
    if (settings.operation !== undefined
        && !["on", "off", "toggle", "set", "increase", "decrease"].includes(settings.operation)) {
        throw new Error("Invalid operation.");
    }
    return settings;
}
//# sourceMappingURL=targeting.js.map