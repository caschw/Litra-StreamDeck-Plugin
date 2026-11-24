"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = clamp;
exports.percentageToLumen = percentageToLumen;
exports.lumenToPercentage = lumenToPercentage;
exports.relativeLumen = relativeLumen;
exports.quantizeTemperature = quantizeTemperature;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function percentageToLumen(device, percentage) {
    const pct = clamp(Math.round(percentage), 0, 100);
    const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
    return clamp(device.minimum_brightness_in_lumen + Math.round((span * pct) / 100), device.minimum_brightness_in_lumen, device.maximum_brightness_in_lumen);
}
function lumenToPercentage(device, lumen) {
    const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
    if (span <= 0)
        return 0;
    return clamp(Math.round(((clamp(lumen, device.minimum_brightness_in_lumen, device.maximum_brightness_in_lumen) - device.minimum_brightness_in_lumen) * 100) / span), 0, 100);
}
function relativeLumen(device, signedPercentageSteps) {
    const span = device.maximum_brightness_in_lumen - device.minimum_brightness_in_lumen;
    const delta = signedPercentageSteps < 0
        ? -Math.round((span * Math.abs(signedPercentageSteps)) / 100)
        : Math.round((span * signedPercentageSteps) / 100);
    return clamp(device.brightness_in_lumen + delta, device.minimum_brightness_in_lumen, device.maximum_brightness_in_lumen);
}
function quantizeTemperature(device, kelvin) {
    const quantized = Math.round(kelvin / 100) * 100;
    return clamp(quantized, device.minimum_temperature_in_kelvin, device.maximum_temperature_in_kelvin);
}
//# sourceMappingURL=conversions.js.map