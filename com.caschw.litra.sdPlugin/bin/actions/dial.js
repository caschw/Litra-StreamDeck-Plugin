"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDialAction = registerDialAction;
const streamdeck_1 = require("@elgato/streamdeck");
const conversions_js_1 = require("../litra/conversions.js");
const render_js_1 = require("../litra/render.js");
const targeting_js_1 = require("../litra/targeting.js");
function registerDialAction(state) {
    let DialAction = (() => {
        let _classDecorators = [(0, streamdeck_1.action)({ UUID: "com.caschw.litra.dial" })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _classSuper = streamdeck_1.SingletonAction;
        var DialAction = class extends _classSuper {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                DialAction = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
            bursts = new Map();
            async onWillAppear(ev) {
                state.setVisible(ev.action.id, true);
                await this.refresh(ev.action, ev.payload.settings);
            }
            async onWillDisappear(ev) {
                state.setVisible(ev.action.id, false);
                const burst = this.bursts.get(ev.action.id);
                if (burst)
                    clearTimeout(burst.timer);
                this.bursts.delete(ev.action.id);
            }
            async onDidReceiveSettings(ev) {
                await this.refresh(ev.action, ev.payload.settings);
            }
            async onDialRotate(ev) {
                if (!ev.action.isDial())
                    return;
                const settings = ev.payload.settings;
                const property = settings.property ?? "frontBrightness";
                const ticks = ev.payload.ticks;
                const context = ev.action.id;
                const current = this.bursts.get(context);
                if (current) {
                    clearTimeout(current.timer);
                    current.ticks += ticks;
                    current.property = property;
                    current.timer = setTimeout(() => void this.flush(context, settings), 50);
                }
                else {
                    const timer = setTimeout(() => void this.flush(context, settings), 50);
                    this.bursts.set(context, { property, ticks, timer });
                }
            }
            async onDialDown(ev) {
                const settings = ev.payload.settings;
                const target = (0, targeting_js_1.settingsTarget)(settings);
                const rear = settings.property === "rearBrightness";
                await state.mutate(target, (device) => {
                    const args = [rear ? "back-toggle" : "toggle"];
                    if (device.serial_number)
                        args.push("--serial-number", device.serial_number);
                    else if (device.device_path)
                        args.push("--device-path", device.device_path);
                    return args;
                });
                await this.refresh(ev.action, settings);
            }
            async flush(context, settings) {
                const burst = this.bursts.get(context);
                if (!burst)
                    return;
                this.bursts.delete(context);
                const target = (0, targeting_js_1.settingsTarget)(settings);
                const property = burst.property ?? "frontBrightness";
                const signedSteps = burst.ticks * (0, targeting_js_1.sensitivity)(settings);
                await state.mutate(target, (device) => {
                    if (property === "frontTemperature") {
                        const kelvin = (0, conversions_js_1.quantizeTemperature)(device, device.temperature_in_kelvin + signedSteps * 100);
                        return ["temperature", "--value", String(kelvin),
                            ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
                    }
                    if (property === "rearBrightness") {
                        const current = device.back_brightness_percentage;
                        if (current === null)
                            throw new Error("LX rear brightness is unavailable.");
                        const value = (0, conversions_js_1.clamp)(current + signedSteps, 1, 100);
                        return ["back-brightness", "--percentage", String(value),
                            ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
                    }
                    const lumen = (0, conversions_js_1.relativeLumen)(device, signedSteps);
                    return ["brightness", "--value", String(lumen),
                        ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
                }).then((result) => {
                    const action = stateActionByContext(context);
                    if (action)
                        void this.refresh(action, settings, result.error);
                });
            }
            async refresh(action, settings, error) {
                const target = (0, targeting_js_1.settingsTarget)(settings);
                try {
                    const devices = (await state.refresh()).devices;
                    const device = devices.find((d) => (target.serialNumber && d.serial_number === target.serialNumber)
                        || (target.devicePath && d.device_path === target.devicePath));
                    if (!device)
                        throw new Error("Selected light is unavailable or unreadable.");
                    const property = settings.property ?? "frontBrightness";
                    const feedback = (0, render_js_1.dialFeedback)(device, property);
                    await action.setFeedbackLayout("layouts/dial.json");
                    await action.setFeedback({
                        title: { value: feedback.title },
                        value: { value: String(property === "frontTemperature" ? `${feedback.value} K` : `${feedback.value}%`) },
                        indicator: { value: feedback.indicator },
                    });
                    await action.setTitle(error ? "Error" : String(property === "frontTemperature"
                        ? `${feedback.value} K`
                        : `${feedback.value}%`));
                    if (error)
                        await action.showAlert();
                }
                catch {
                    await action.setFeedbackLayout("layouts/dial.json");
                    await action.setFeedback({
                        title: { value: "Light" },
                        value: { value: "Unavailable" },
                        indicator: { value: 0 },
                    });
                    await action.setTitle("Unavailable");
                }
            }
        };
        return DialAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new DialAction());
}
function stateActionByContext(context) {
    for (const action of streamdeck_1.streamDeck.actions) {
        if (action.id === context)
            return action;
    }
    return null;
}
//# sourceMappingURL=dial.js.map