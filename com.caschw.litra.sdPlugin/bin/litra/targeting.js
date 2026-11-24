"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsTarget = settingsTarget;
exports.sensitivity = sensitivity;
function settingsTarget(settings) {
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
//# sourceMappingURL=targeting.js.map