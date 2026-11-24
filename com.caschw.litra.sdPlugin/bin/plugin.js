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
const state = new state_js_1.LitraState();
(0, power_key_js_1.registerPowerAction)(state);
(0, numeric_key_js_1.registerNumericAction)(state);
(0, dial_js_1.registerDialAction)(state);
state.startPolling();
streamdeck_1.default.system.onSystemDidWakeUp(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidChange(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidConnect(() => void state.refresh().catch(() => undefined));
streamdeck_1.default.devices.onDeviceDidDisconnect(() => void state.refresh().catch(() => undefined));
void streamdeck_1.default.connect();
//# sourceMappingURL=plugin.js.map