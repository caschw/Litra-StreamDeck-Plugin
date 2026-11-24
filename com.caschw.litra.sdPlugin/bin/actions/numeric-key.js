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
exports.registerNumericAction = registerNumericAction;
const streamdeck_1 = require("@elgato/streamdeck");
const identity_js_1 = require("../litra/identity.js");
const conversions_js_1 = require("../litra/conversions.js");
const render_js_1 = require("../litra/render.js");
const targeting_js_1 = require("../litra/targeting.js");
function registerNumericAction(state) {
    let NumericAction = (() => {
        let _classDecorators = [(0, streamdeck_1.action)({ UUID: "com.caschw.litra.numeric" })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _classSuper = streamdeck_1.SingletonAction;
        var NumericAction = class extends _classSuper {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                NumericAction = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
            unsubscribe;
            async onWillAppear(ev) {
                state.setVisible(ev.action.id, true);
                await this.refresh(ev.action, ev.payload.settings);
                if (!this.unsubscribe)
                    this.unsubscribe = state.subscribe((n) => this.onState(n));
            }
            onWillDisappear(ev) {
                state.setVisible(ev.action.id, false);
            }
            async onDidReceiveSettings(ev) {
                await this.refresh(ev.action, ev.payload.settings);
            }
            async onKeyDown(ev) {
                let settings;
                try {
                    settings = (0, targeting_js_1.validateActionSettings)(ev.payload.settings);
                }
                catch (error) {
                    await ev.action.showAlert();
                    await ev.action.setTitle("Invalid");
                    console.error("Invalid numeric settings", error);
                    return;
                }
                const target = (0, targeting_js_1.settingsTarget)(settings);
                await ev.action.setTitle("Pending");
                let wanted = "";
                const result = await state.mutate(target, (device) => {
                    const argv = this.argv(device, target, settings);
                    wanted = this.expectedNativeDesired(device, settings);
                    return argv;
                }, (_before, after) => this.expectedNativeAfter(after, wanted));
                await this.refresh(ev.action, settings, result.device ?? null, result.error);
            }
            argv(device, target, settings) {
                const operation = settings.operation ?? "set";
                const preset = settings.preset ?? 0;
                if (settings.property === "frontTemperature") {
                    let kelvin = device.temperature_in_kelvin;
                    if (operation === "set")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, preset);
                    if (operation === "increase")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin + preset * 100);
                    if (operation === "decrease")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin - preset * 100);
                    return ["temperature", "--value", String(kelvin), ...(0, identity_js_1.targetArgv)(target)];
                }
                if (settings.property === "rearBrightness") {
                    const current = device.back_brightness_percentage;
                    if (current === null)
                        throw new Error("LX rear brightness is unavailable.");
                    let value = (0, conversions_js_1.clamp)(preset, 1, 100);
                    if (operation === "increase")
                        value = (0, conversions_js_1.clamp)(current + preset, 1, 100);
                    if (operation === "decrease")
                        value = (0, conversions_js_1.clamp)(current - preset, 1, 100);
                    return ["back-brightness", "--percentage", String(value), ...(0, identity_js_1.targetArgv)(target)];
                }
                let lumen = device.brightness_in_lumen;
                if (operation === "set")
                    lumen = (0, conversions_js_1.percentageToLumen)(device, preset);
                if (operation === "increase")
                    lumen = (0, conversions_js_1.relativeLumen)(device, preset);
                if (operation === "decrease")
                    lumen = (0, conversions_js_1.relativeLumen)(device, -preset);
                return ["brightness", "--value", String(lumen), ...(0, identity_js_1.targetArgv)(target)];
            }
            expectedNativeDesired(device, settings) {
                const operation = settings.operation ?? "set";
                const preset = settings.preset ?? 0;
                if (settings.property === "frontTemperature") {
                    let kelvin = device.temperature_in_kelvin;
                    if (operation === "set")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, preset);
                    if (operation === "increase")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin + preset * 100);
                    if (operation === "decrease")
                        kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin - preset * 100);
                    return `temp:${kelvin}`;
                }
                if (settings.property === "rearBrightness") {
                    const current = device.back_brightness_percentage ?? 1;
                    let value = (0, conversions_js_1.clamp)(preset, 1, 100);
                    if (operation === "increase")
                        value = (0, conversions_js_1.clamp)(current + preset, 1, 100);
                    if (operation === "decrease")
                        value = (0, conversions_js_1.clamp)(current - preset, 1, 100);
                    return `rear:${value}`;
                }
                let lumen = device.brightness_in_lumen;
                if (operation === "set")
                    lumen = (0, conversions_js_1.percentageToLumen)(device, preset);
                if (operation === "increase")
                    lumen = (0, conversions_js_1.relativeLumen)(device, preset);
                if (operation === "decrease")
                    lumen = (0, conversions_js_1.relativeLumen)(device, -preset);
                return `front:${lumen}`;
            }
            expectedNativeAfter(device, wanted) {
                if (wanted.startsWith("temp:"))
                    return `temp:${device.temperature_in_kelvin}` === wanted;
                if (wanted.startsWith("rear:"))
                    return `rear:${device.back_brightness_percentage ?? "unknown"}` === wanted;
                return `front:${device.brightness_in_lumen}` === wanted;
            }
            expectedNative(device, settings) {
                if (settings.property === "frontTemperature")
                    return `temp:${device.temperature_in_kelvin}`;
                if (settings.property === "rearBrightness")
                    return `rear:${device.back_brightness_percentage ?? "unknown"}`;
                return `front:${device.brightness_in_lumen}`;
            }
            async onState(notification) {
                for (const action of this.actions) {
                    const settings = await action.getSettings();
                    await this.render(notification, action, settings);
                }
            }
            async refresh(action, settings, readback, error) {
                if (readback) {
                    await this.renderDevice(action, settings, readback, error ? "error" : "confirmed", error);
                    return;
                }
                try {
                    const result = await state.refresh();
                    await this.render({ devices: result.devices, revision: result.revision, status: error ? "error" : "confirmed", error }, action, settings);
                }
                catch (refreshError) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle("Unavailable");
                    await action.showAlert();
                    console.error("Litra numeric refresh failed", refreshError);
                }
            }
            async render(notification, action, settings) {
                const target = (0, targeting_js_1.settingsTarget)(settings);
                try {
                    (0, targeting_js_1.validateActionSettings)(settings);
                    (0, identity_js_1.validateUniqueSelection)([...notification.devices], target);
                    const device = (0, identity_js_1.findUniqueTarget)([...notification.devices], target);
                    if (!device)
                        throw new Error("Selected light is unavailable or unreadable.");
                    await this.renderDevice(action, settings, device, notification.status, notification.error);
                }
                catch (error) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle(notification.status === "pending" ? "Pending" : "Unavailable");
                    if (notification.status === "error")
                        await action.showAlert();
                    console.error("Litra numeric target unavailable", error);
                }
            }
            async renderDevice(action, settings, device, status, error) {
                if (status === "pending") {
                    await action.setImage("imgs/numeric.png");
                    await action.setTitle("Pending");
                    return;
                }
                const property = settings.property ?? "frontBrightness";
                const operation = settings.operation ?? "set";
                let value = "";
                let icon = "imgs/numeric.png";
                if (property === "frontTemperature")
                    value = `${device.temperature_in_kelvin} K`;
                else if (property === "rearBrightness")
                    value = device.back_brightness_percentage === null ? "Rear unknown" : `${device.back_brightness_percentage}%`;
                else
                    value = `${(0, render_js_1.frontBrightnessPercent)(device)}%`;
                if (status === "error") {
                    icon = "imgs/error.png";
                    await action.showAlert();
                    console.error("Litra numeric state error", error);
                }
                await action.setImage(icon);
                await action.setTitle(`${operation === "set" ? "Set" : operation === "increase" ? "+" : "-"}\n${value}`);
            }
        };
        return NumericAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new NumericAction());
}
//# sourceMappingURL=numeric-key.js.map