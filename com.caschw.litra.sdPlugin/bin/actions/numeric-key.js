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
const conversions_js_1 = require("../litra/conversions.js");
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
                ev.action.setTitle("Pending");
                const result = await state.mutate(target, (device) => {
                    const args = [];
                    if (settings.property === "frontTemperature") {
                        args.push("temperature");
                        let kelvin = device.temperature_in_kelvin;
                        if (settings.operation === "set")
                            kelvin = (0, conversions_js_1.quantizeTemperature)(device, Number(settings.preset ?? kelvin));
                        if (settings.operation === "increase")
                            kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin + 100 * Number(settings.preset ?? 1));
                        if (settings.operation === "decrease")
                            kelvin = (0, conversions_js_1.quantizeTemperature)(device, kelvin - 100 * Number(settings.preset ?? 1));
                        args.push("--value", String(kelvin));
                    }
                    else if (settings.property === "rearBrightness") {
                        args.push("back-brightness");
                        const current = device.back_brightness_percentage ?? 1;
                        let percentage = (0, conversions_js_1.clamp)(Number(settings.preset ?? 1), 1, 100);
                        if (settings.operation === "set")
                            percentage = (0, conversions_js_1.clamp)(Number(settings.preset ?? 1), 1, 100);
                        if (settings.operation === "increase")
                            percentage = (0, conversions_js_1.clamp)(current + Number(settings.preset ?? 1), 1, 100);
                        if (settings.operation === "decrease")
                            percentage = (0, conversions_js_1.clamp)(current - Number(settings.preset ?? 1), 1, 100);
                        args.push("--percentage", String(percentage));
                    }
                    else {
                        args.push("brightness");
                        let lumen = device.brightness_in_lumen;
                        if (settings.operation === "set")
                            lumen = (0, conversions_js_1.percentageToLumen)(device, Number(settings.preset ?? 0));
                        if (settings.operation === "increase")
                            lumen = (0, conversions_js_1.relativeLumen)(device, Number(settings.preset ?? 5));
                        if (settings.operation === "decrease")
                            lumen = (0, conversions_js_1.relativeLumen)(device, -Number(settings.preset ?? 5));
                        args.push("--value", String(lumen));
                    }
                    if (device.serial_number)
                        args.push("--serial-number", device.serial_number);
                    else if (device.device_path)
                        args.push("--device-path", device.device_path);
                    return args;
                });
                await this.refresh(ev.action, settings, result.error);
            }
            async refresh(action, settings, error) {
                try {
                    const devices = (await state.refresh()).devices;
                    const target = (0, targeting_js_1.settingsTarget)(settings);
                    const device = devices.find((d) => (target.serialNumber && d.serial_number === target.serialNumber)
                        || (target.devicePath && d.device_path === target.devicePath));
                    if (!device)
                        throw new Error("Selected light is unavailable or unreadable.");
                    await action.setImage(error ? "imgs/error.png" : "imgs/numeric.png");
                    await action.setTitle(error ? "Error" : settings.operation === "set"
                        ? `${settings.preset ?? 0}%`
                        : settings.operation === "increase" ? "+" : "-");
                    if (error)
                        await action.showAlert();
                }
                catch {
                    await action.setImage("imgs/error.png");
                    await action.setTitle("Unavailable");
                }
            }
        };
        return NumericAction = _classThis;
    })();
    streamdeck_1.streamDeck.actions.registerAction(new NumericAction());
}
//# sourceMappingURL=numeric-key.js.map