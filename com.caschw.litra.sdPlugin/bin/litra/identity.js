"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetForDevice = targetForDevice;
exports.findUniqueTarget = findUniqueTarget;
exports.validateUniqueSelection = validateUniqueSelection;
function targetForDevice(device) {
    if (typeof device.serial_number === "string" && device.serial_number.length > 0) {
        return { serialNumber: device.serial_number };
    }
    if (typeof device.device_path === "string" && device.device_path.length > 0) {
        return { devicePath: device.device_path };
    }
    return null;
}
function findUniqueTarget(devices, target) {
    if (target.serialNumber) {
        const matches = devices.filter((d) => d.serial_number === target.serialNumber);
        return matches.length === 1 ? matches[0] : null;
    }
    if (target.devicePath) {
        const matches = devices.filter((d) => d.device_path === target.devicePath);
        return matches.length === 1 ? matches[0] : null;
    }
    return null;
}
function validateUniqueSelection(devices, target) {
    if (target.serialNumber) {
        const matches = devices.filter((d) => d.serial_number === target.serialNumber);
        if (matches.length === 0)
            throw new Error("Selected light is unavailable or unreadable.");
        if (matches.length > 1)
            throw new Error("Selected serial number is ambiguous; reconnect or use a device path.");
    }
    else if (target.devicePath) {
        const matches = devices.filter((d) => d.device_path === target.devicePath);
        if (matches.length === 0)
            throw new Error("Selected light is unavailable or unreadable.");
        if (matches.length > 1)
            throw new Error("Selected device path is ambiguous.");
    }
    else {
        throw new Error("A serial number or device path is required.");
    }
}
//# sourceMappingURL=identity.js.map