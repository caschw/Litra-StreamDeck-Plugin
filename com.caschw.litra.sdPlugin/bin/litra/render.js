"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frontBrightnessPercent = frontBrightnessPercent;
exports.dialFeedback = dialFeedback;
function frontBrightnessPercent(device) {
    const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
    if (span <= 0)
        return 0;
    return Math.round(((device.brightness_in_lumen - device.minimum_brightness_in_lumen) * 100) / span);
}
function dialFeedback(device, property) {
    if (property === "frontTemperature") {
        const span = device.maximum_temperature_in_kelvin - device.minimum_temperature_in_kelvin;
        const pct = span > 0
            ? Math.round(((device.temperature_in_kelvin - device.minimum_temperature_in_kelvin) * 100) / span)
            : 0;
        return { title: "Temperature", value: device.temperature_in_kelvin, indicator: pct };
    }
    if (property === "rearBrightness") {
        const value = device.back_brightness_percentage;
        return { title: "Rear", value: value ?? 0, indicator: value ?? 0 };
    }
    const value = frontBrightnessPercent(device);
    return { title: "Brightness", value, indicator: value };
}
//# sourceMappingURL=render.js.map