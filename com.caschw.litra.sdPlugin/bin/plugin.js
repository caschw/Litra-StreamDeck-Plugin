"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const streamdeck_1 = __importDefault(require("@elgato/streamdeck"));
const dial_js_1 = require("./actions/dial.js");
const numeric_key_js_1 = require("./actions/numeric-key.js");
const power_key_js_1 = require("./actions/power-key.js");
const state_js_1 = require("./litra/state.js");
const validation_js_1 = require("./litra/validation.js");
const state = new state_js_1.LitraState();
(0, power_key_js_1.registerPowerAction)(state);
(0, numeric_key_js_1.registerNumericAction)(state);
(0, dial_js_1.registerDialAction)(state);
state.startPolling();
streamdeck_1.default.system.onSystemDidWakeUp(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidChange(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidConnect(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidDisconnect(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.ui.onSendToPlugin(async (ev) => {
    if (ev.payload.event === "saveSettings" && ev.payload.settings) {
        try {
            const settings = (0, validation_js_1.validateActionSettings)(ev.payload.settings);
            await ev.action.setSettings(settings);
        }
        catch (error) {
            await streamdeck_1.default.ui.sendToPropertyInspector({
                event: "settingsError",
                message: error instanceof Error ? error.message : "Invalid settings.",
            });
            return;
        }
    }
    if (ev.payload.event === "getInitialData" || ev.payload.event === "refreshDevices") {
        try {
            const result = await state.refresh();
            await streamdeck_1.default.ui.sendToPropertyInspector({
                event: "initialData",
                devices: result.devices,
                settings: await ev.action.getSettings(),
            });
        }
        catch (error) {
            await streamdeck_1.default.ui.sendToPropertyInspector({
                event: "initialData",
                devices: [],
                settings: await ev.action.getSettings(),
                error: error instanceof Error ? error.message : "Could not read devices.",
            });
        }
    }
});
streamdeck_1.default.ui.onDidAppear(async (ev) => {
    try {
        const result = await state.refresh();
        await streamdeck_1.default.ui.sendToPropertyInspector({
            event: "initialData",
            devices: result.devices,
            settings: await ev.action.getSettings(),
        });
    }
    catch (error) {
        await streamdeck_1.default.ui.sendToPropertyInspector({
            event: "initialData",
            devices: [],
            settings: await ev.action.getSettings(),
            error: error instanceof Error ? error.message : "Could not read devices.",
        });
    }
});
void streamdeck_1.default.connect();
//# sourceMappingURL=plugin.js.map