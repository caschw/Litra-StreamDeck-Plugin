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
exports.registerPowerAction = registerPowerAction;
const streamdeck_1 = require("@elgato/streamdeck");
const identity_js_1 = require("../litra/identity.js");
const targeting_js_1 = require("../litra/targeting.js");
function registerPowerAction(state) {
    let PowerAction = (() => {
        let _classDecorators = [(0, streamdeck_1.action)({ UUID: "com.caschw.litra.power" })];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _classSuper = streamdeck_1.SingletonAction;
        var PowerAction = class extends _classSuper {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                PowerAction = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
            unsubscribe;
            revision = new Map();
            async onWillAppear(ev) {
                state.setVisible(ev.action.id, true);
                await this.refresh(ev.action, ev.payload.settings);
                if (!this.unsubscribe) {
                    this.unsubscribe = state.subscribe((notification) => this.onState(notification));
                }
            }
            onWillDisappear(ev) {
                state.setVisible(ev.action.id, false);
            }
            async onDidReceiveSettings(ev) {
                this.revision.set(ev.action.id, (this.revision.get(ev.action.id) ?? 0) + 1);
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
                    return;
                }
                const target = (0, targeting_js_1.settingsTarget)(settings);
                const rear = settings.rear === true;
                const operation = ev.payload.isInMultiAction
                    ? (ev.payload.userDesiredState === 1 ? "off" : "on")
                    : settings.operation ?? "toggle";
                const generation = this.revision.get(ev.action.id) ?? 0;
                await ev.action.setTitle(rear ? "Rear pending" : "Pending");
                let desired = null;
                const result = await state.mutate(target, (device) => {
                    const current = rear ? device.is_back_on : device.is_on;
                    if (operation === "toggle") {
                        desired = current === null ? null : !current;
                        return rear
                            ? [desired ? "back-on" : "back-off", ...(0, identity_js_1.targetArgv)(target)]
                            : [desired ? "on" : "off", ...(0, identity_js_1.targetArgv)(target)];
                    }
                    desired = operation === "on";
                    return rear
                        ? [operation === "on" ? "back-on" : "back-off", ...(0, identity_js_1.targetArgv)(target)]
                        : [operation === "on" ? "on" : "off", ...(0, identity_js_1.targetArgv)(target)];
                }, (_before, after) => desired === null ? true : rear
                    ? after.is_back_on === desired
                    : after.is_on === desired);
                if (generation !== (this.revision.get(ev.action.id) ?? 0))
                    return;
                await this.refresh(ev.action, settings, result.device ?? null, result.error);
            }
            async onState(notification) {
                for (const action of this.actions) {
                    if (!action.isKey())
                        continue;
                    const settings = await action.getSettings();
                    let validated;
                    try {
                        validated = (0, targeting_js_1.validateActionSettings)(settings);
                    }
                    catch {
                        await action.setTitle("Invalid");
                        await action.showAlert();
                        continue;
                    }
                    await this.render(notification, action, validated);
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
                    console.error("Litra power refresh failed", refreshError);
                }
            }
            async render(notification, action, settings) {
                const target = (0, targeting_js_1.settingsTarget)(settings);
                let device = null;
                try {
                    (0, identity_js_1.validateUniqueSelection)([...notification.devices], target);
                    device = (0, identity_js_1.findUniqueTarget)([...notification.devices], target);
                }
                catch (error) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle(notification.status === "pending" ? "Pending" : "Unavailable");
                    if (notification.status === "error")
                        await action.showAlert();
                    console.error("Litra power target unavailable", error);
                    return;
                }
                if (!device) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle("Unavailable");
                    return;
                }
                await this.renderDevice(action, settings, device, notification.status, notification.error);
            }
            async renderDevice(action, settings, device, status, error) {
                const rear = settings.rear === true;
                const actual = rear ? device.is_back_on : device.is_on;
                if (status === "pending") {
                    await action.setTitle(rear ? "Rear pending" : "Pending");
                    await action.setImage("imgs/power.png");
                    return;
                }
                if (status === "error") {
                    await action.setImage("imgs/error.png");
                    await action.setTitle(actual === null ? "UNKNOWN" : actual ? "ON" : "OFF");
                    await action.showAlert();
                    console.error("Litra power state error", error);
                    return;
                }
                if (rear && actual === null) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle("UNKNOWN");
                    await action.setState(0);
                    return;
                }
                await action.setImage(actual ? "imgs/power-on.png" : "imgs/power-off.png");
                const operation = settings.operation ?? "toggle";
                const label = operation === "toggle" ? "Toggle" : operation === "on" ? "On" : "Off";
                await action.setTitle(`${label}\n${actual ? "ON" : "OFF"}`);
                await action.setState(actual ? 1 : 0);
            }
        };
        return PowerAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new PowerAction());
}
//# sourceMappingURL=power-key.js.map