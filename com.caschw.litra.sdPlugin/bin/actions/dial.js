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
const identity_js_1 = require("../litra/identity.js");
const render_js_1 = require("../litra/render.js");
const targeting_js_1 = require("../litra/targeting.js");
const dial_controller_js_1 = require("../litra/dial-controller.js");
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
            unsubscribe;
            controller;
            constructor() {
                super();
                this.controller = new dial_controller_js_1.DialController((operation) => this.execute(operation));
            }
            async onWillAppear(ev) {
                state.setVisible(ev.action.id, true);
                await this.refresh(ev.action, ev.payload.settings);
                if (!this.unsubscribe)
                    this.unsubscribe = state.subscribe((n) => this.onState(n));
            }
            onWillDisappear(ev) {
                state.setVisible(ev.action.id, false);
                this.controller.disappeared(ev.action.id);
            }
            async onDidReceiveSettings(ev) {
                this.controller.settingsChanged(ev.action.id);
                await this.refresh(ev.action, ev.payload.settings);
            }
            onDialRotate(ev) {
                if (!ev.action.isDial())
                    return;
                try {
                    const settings = (0, targeting_js_1.validateActionSettings)(ev.payload.settings);
                    const property = settings.property ?? "frontBrightness";
                    this.controller.rotate(ev.action.id, (0, targeting_js_1.settingsTarget)(settings), property, (0, targeting_js_1.sensitivity)(settings), ev.payload.ticks);
                }
                catch (error) {
                    console.error("Invalid dial rotation settings", error);
                }
            }
            onDialDown(ev) {
                try {
                    const settings = (0, targeting_js_1.validateActionSettings)(ev.payload.settings);
                    this.controller.press(ev.action.id, (0, targeting_js_1.settingsTarget)(settings), settings.property ?? "frontBrightness");
                }
                catch (error) {
                    void ev.action.showAlert();
                    console.error("Invalid dial press settings", error);
                }
            }
            async execute(operation) {
                const action = this.actionForContext(operation.context);
                if (!action)
                    return;
                const settings = await action.getSettings();
                let validated;
                try {
                    validated = (0, targeting_js_1.validateActionSettings)(settings);
                }
                catch (error) {
                    await action.showAlert();
                    console.error("Invalid dial operation settings", error);
                    return;
                }
                if (operation.target.serialNumber !== (0, targeting_js_1.settingsTarget)(validated).serialNumber
                    && operation.target.devicePath !== (0, targeting_js_1.settingsTarget)(validated).devicePath)
                    return;
                await action.setTitle("Pending");
                if (operation.kind === "press") {
                    const result = await state.mutate(operation.target, (device) => {
                        if (operation.property === "rearBrightness") {
                            if (device.device_type !== "beam_lx" || !device.has_back_side)
                                throw new Error("LX rear controls require Beam LX.");
                            if (device.is_back_on === null)
                                throw new Error("LX rear power state is unknown.");
                            return ["back-toggle", ...(0, identity_js_1.targetArgv)(operation.target)];
                        }
                        return ["toggle", ...(0, identity_js_1.targetArgv)(operation.target)];
                    }, (_before, after) => operation.property === "rearBrightness"
                        ? after.is_back_on !== null
                        : after.is_on);
                    await this.refresh(action, validated, result.device ?? null, result.error);
                    return;
                }
                const result = await state.mutate(operation.target, (device) => {
                    if (operation.property === "rearBrightness") {
                        if (device.device_type !== "beam_lx" || !device.has_back_side)
                            throw new Error("LX rear controls require Beam LX.");
                        if (device.back_brightness_percentage === null)
                            throw new Error("LX rear brightness is unavailable.");
                    }
                    const signedSteps = operation.ticks * operation.sensitivity;
                    if (operation.property === "frontTemperature") {
                        const kelvin = (0, conversions_js_1.quantizeTemperature)(device, device.temperature_in_kelvin + signedSteps * 100);
                        return ["temperature", "--value", String(kelvin), ...(0, identity_js_1.targetArgv)(operation.target)];
                    }
                    if (operation.property === "rearBrightness") {
                        const value = (0, conversions_js_1.clamp)((device.back_brightness_percentage ?? 1) + signedSteps, 1, 100);
                        return ["back-brightness", "--percentage", String(value), ...(0, identity_js_1.targetArgv)(operation.target)];
                    }
                    return ["brightness", "--value", String((0, conversions_js_1.relativeLumen)(device, signedSteps)),
                        ...(0, identity_js_1.targetArgv)(operation.target)];
                }, (_before, after) => {
                    if (operation.property === "frontTemperature")
                        return after.temperature_in_kelvin === (0, conversions_js_1.quantizeTemperature)(after, after.temperature_in_kelvin);
                    if (operation.property === "rearBrightness")
                        return after.back_brightness_percentage !== null;
                    return after.brightness_in_lumen >= after.minimum_brightness_in_lumen;
                });
                await this.refresh(action, validated, result.device ?? null, result.error);
            }
            actionForContext(context) {
                for (const action of this.actions)
                    if (action.id === context)
                        return action;
                return null;
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
                    await this.renderUnavailable(action);
                    console.error("Litra dial refresh failed", refreshError);
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
                    await this.renderUnavailable(action);
                    if (notification.status === "error")
                        await action.showAlert();
                    console.error("Litra dial target unavailable", error);
                }
            }
            async renderDevice(action, settings, device, status, error) {
                const property = settings.property ?? "frontBrightness";
                if (property === "rearBrightness"
                    && (device.device_type !== "beam_lx" || !device.has_back_side || device.back_brightness_percentage === null)) {
                    await this.renderUnavailable(action, "Rear unknown");
                    return;
                }
                const feedback = (0, render_js_1.dialFeedback)(device, property);
                if (status === "pending") {
                    await action.setTitle("Pending");
                    await action.setFeedbackLayout("layouts/dial.json");
                    await action.setFeedback({
                        title: { value: feedback.title },
                        value: { value: feedback.value === null ? "Unknown" : `${feedback.value}${property === "frontTemperature" ? " K" : "%"}` },
                        indicator: { value: feedback.indicator ?? 0 },
                        status: { value: "PENDING" },
                    });
                    return;
                }
                await action.setFeedbackLayout("layouts/dial.json");
                await action.setFeedback({
                    title: { value: feedback.title },
                    value: { value: feedback.value === null ? "Unknown" : `${feedback.value}${property === "frontTemperature" ? " K" : "%"}` },
                    indicator: { value: feedback.indicator ?? 0 },
                    status: { value: status === "error" ? "ERROR" : property === "rearBrightness"
                            ? (device.is_back_on === null ? "UNKNOWN" : device.is_back_on ? "ON" : "OFF")
                            : (device.is_on ? "ON" : "OFF") },
                });
                await action.setTitle(status === "error" ? "Error"
                    : feedback.value === null ? "Unknown"
                        : `${feedback.value}${property === "frontTemperature" ? " K" : "%"}`);
                if (status === "error") {
                    await action.showAlert();
                    console.error("Litra dial state error", error);
                }
            }
            async renderUnavailable(action, label = "Unavailable") {
                await action.setFeedbackLayout("layouts/dial.json");
                await action.setFeedback({
                    title: { value: "Light" },
                    value: { value: label },
                    indicator: { value: 0 },
                });
                await action.setTitle(label);
            }
        };
        return DialAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new DialAction());
}
//# sourceMappingURL=dial.js.map