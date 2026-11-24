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
            async onWillAppear(ev) {
                state.setVisible(ev.action.id, true);
                await this.refresh(ev.action, ev.payload.settings);
            }
            async onWillDisappear(ev) {
                state.setVisible(ev.action.id, false);
            }
            async onDidReceiveSettings(ev) {
                await this.refresh(ev.action, ev.payload.settings);
            }
            async onKeyDown(ev) {
                const settings = ev.payload.settings;
                const target = (0, targeting_js_1.settingsTarget)(settings);
                const operation = ev.payload.isInMultiAction
                    ? (ev.payload.userDesiredState === 1 ? "off" : "on")
                    : settings.operation ?? "toggle";
                const rear = settings.rear === true;
                const command = rear
                    ? (operation === "on" ? "back-on" : operation === "off" ? "back-off" : "back-toggle")
                    : (operation === "on" ? "on" : operation === "off" ? "off" : "toggle");
                ev.action.setTitle("Pending", { target: 0 });
                const result = await state.mutate(target, (device) => {
                    const args = [command];
                    if (device.serial_number)
                        args.push("--serial-number", device.serial_number);
                    else if (device.device_path)
                        args.push("--device-path", device.device_path);
                    return args;
                });
                await this.refresh(ev.action, settings, result.error);
            }
            async refresh(action, settings, error) {
                const target = (0, targeting_js_1.settingsTarget)(settings);
                let device = null;
                try {
                    const result = await state.refresh();
                    device = result.devices.find((d) => (target.serialNumber && d.serial_number === target.serialNumber)
                        || (target.devicePath && d.device_path === target.devicePath)) ?? null;
                }
                catch (refreshError) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle("Unavailable");
                    return;
                }
                if (!device) {
                    await action.setImage("imgs/error.png");
                    await action.setTitle(error ? "Error" : "Unavailable");
                    return;
                }
                const rear = settings.rear === true;
                const actual = rear ? device.is_back_on : device.is_on;
                await action.setImage(actual ? "imgs/power-on.png" : "imgs/power-off.png");
                await action.setTitle(error ? "Error" : actual ? "ON" : "OFF");
                if (error)
                    await action.showAlert();
            }
        };
        return PowerAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new PowerAction());
}
//# sourceMappingURL=power-key.js.map