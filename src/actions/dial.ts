import {
  action,
  streamDeck,
  SingletonAction,
  type DialDownEvent,
  type DialRotateEvent,
  type DidReceiveSettingsEvent,
  type WillAppearEvent,
  type DialAction as DialActionType,
} from "@elgato/streamdeck";
import { clamp, quantizeTemperature, relativeLumen } from "../litra/conversions.js";
import { findUniqueTarget, targetArgv, validateUniqueSelection } from "../litra/identity.js";
import { dialFeedback } from "../litra/render.js";
import { LitraState, type StateNotification } from "../litra/state.js";
import { sensitivity, settingsTarget, validateActionSettings, type ActionSettings } from "../litra/targeting.js";
import { DialController, type DialOperation } from "../litra/dial-controller.js";
import type { LitraDevice } from "../litra/types.js";

export function registerDialAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.dial" })
  class DialAction extends SingletonAction<ActionSettings> {
    private unsubscribe: (() => void) | undefined;
    private readonly controller: DialController;

    constructor() {
      super();
      this.controller = new DialController((operation) => this.execute(operation));
    }

    override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
      state.setVisible(ev.action.id, true);
      await this.refresh(ev.action as DialActionType<ActionSettings>, ev.payload.settings);
      if (!this.unsubscribe) this.unsubscribe = state.subscribe((n) => this.onState(n));
    }

    override onWillDisappear(ev: { action: { id: string } }): void {
      state.setVisible(ev.action.id, false);
      this.controller.disappeared(ev.action.id);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
      this.controller.settingsChanged(ev.action.id);
      await this.refresh(ev.action as DialActionType<ActionSettings>, ev.payload.settings);
    }

    override onDialRotate(ev: DialRotateEvent<ActionSettings>): void {
      if (!ev.action.isDial()) return;
      try {
        const settings = validateActionSettings(ev.payload.settings);
        const property = settings.property ?? "frontBrightness";
        this.controller.rotate(ev.action.id, settingsTarget(settings), property,
          sensitivity(settings), ev.payload.ticks);
      } catch (error) {
        console.error("Invalid dial rotation settings", error);
      }
    }

    override onDialDown(ev: DialDownEvent<ActionSettings>): void {
      try {
        const settings = validateActionSettings(ev.payload.settings);
        this.controller.press(ev.action.id, settingsTarget(settings),
          settings.property ?? "frontBrightness");
      } catch (error) {
        void ev.action.showAlert();
        console.error("Invalid dial press settings", error);
      }
    }

    private async execute(operation: DialOperation): Promise<void> {
      const action = this.actionForContext(operation.context);
      if (!action) return;
      const settings = await action.getSettings();
      let validated: ActionSettings;
      try { validated = validateActionSettings(settings); }
      catch (error) {
        await action.showAlert();
        console.error("Invalid dial operation settings", error);
        return;
      }
      if (operation.target.serialNumber !== settingsTarget(validated).serialNumber
        && operation.target.devicePath !== settingsTarget(validated).devicePath) return;
      await action.setTitle("Pending");
      if (operation.kind === "press") {
        const result = await state.mutate(operation.target, (device) => {
          if (operation.property === "rearBrightness") {
            if (device.device_type !== "beam_lx" || !device.has_back_side) throw new Error("LX rear controls require Beam LX.");
            if (device.is_back_on === null) throw new Error("LX rear power state is unknown.");
            return ["back-toggle", ...targetArgv(operation.target)];
          }
          return ["toggle", ...targetArgv(operation.target)];
        }, (_before, after) => operation.property === "rearBrightness"
          ? after.is_back_on !== null
          : after.is_on);
        await this.refresh(action, validated, result.device ?? null, result.error);
        return;
      }
      const result = await state.mutate(operation.target, (device) => {
        if (operation.property === "rearBrightness") {
          if (device.device_type !== "beam_lx" || !device.has_back_side) throw new Error("LX rear controls require Beam LX.");
          if (device.back_brightness_percentage === null) throw new Error("LX rear brightness is unavailable.");
        }
        const signedSteps = operation.ticks * operation.sensitivity;
        if (operation.property === "frontTemperature") {
          const kelvin = quantizeTemperature(device, device.temperature_in_kelvin + signedSteps * 100);
          return ["temperature", "--value", String(kelvin), ...targetArgv(operation.target)];
        }
        if (operation.property === "rearBrightness") {
          const value = clamp((device.back_brightness_percentage ?? 1) + signedSteps, 1, 100);
          return ["back-brightness", "--percentage", String(value), ...targetArgv(operation.target)];
        }
        return ["brightness", "--value", String(relativeLumen(device, signedSteps)),
          ...targetArgv(operation.target)];
      }, (_before, after) => {
        if (operation.property === "frontTemperature") return after.temperature_in_kelvin === quantizeTemperature(after,
          after.temperature_in_kelvin);
        if (operation.property === "rearBrightness") return after.back_brightness_percentage !== null;
        return after.brightness_in_lumen >= after.minimum_brightness_in_lumen;
      });
      await this.refresh(action, validated, result.device ?? null, result.error);
    }

    private actionForContext(context: string): DialActionType<ActionSettings> | null {
      for (const action of this.actions) if (action.id === context) return action as DialActionType<ActionSettings>;
      return null;
    }

    private async onState(notification: StateNotification): Promise<void> {
      for (const action of this.actions) {
        const settings = await action.getSettings();
        await this.render(notification, action as DialActionType<ActionSettings>, settings);
      }
    }

    private async refresh(
      action: DialActionType<ActionSettings>,
      settings: ActionSettings,
      readback?: LitraDevice | null,
      error?: string,
    ): Promise<void> {
      if (readback) {
        await this.renderDevice(action, settings, readback, error ? "error" : "confirmed", error);
        return;
      }
      try {
        const result = await state.refresh();
        await this.render({ devices: result.devices, revision: result.revision, status: error ? "error" : "confirmed", error }, action, settings);
      } catch (refreshError) {
        await this.renderUnavailable(action);
        console.error("Litra dial refresh failed", refreshError);
      }
    }

    private async render(notification: StateNotification, action: DialActionType<ActionSettings>, settings: ActionSettings): Promise<void> {
      const target = settingsTarget(settings);
      try {
        validateActionSettings(settings);
        validateUniqueSelection([...notification.devices], target);
        const device = findUniqueTarget([...notification.devices], target);
        if (!device) throw new Error("Selected light is unavailable or unreadable.");
        await this.renderDevice(action, settings, device, notification.status, notification.error);
      } catch (error) {
        await this.renderUnavailable(action);
        if (notification.status === "error") await action.showAlert();
        console.error("Litra dial target unavailable", error);
      }
    }

    private async renderDevice(
      action: DialActionType<ActionSettings>,
      settings: ActionSettings,
      device: LitraDevice,
      status: "confirmed" | "pending" | "stale" | "unavailable" | "error",
      error?: string,
    ): Promise<void> {
      const property = settings.property ?? "frontBrightness";
      if (property === "rearBrightness"
        && (device.device_type !== "beam_lx" || !device.has_back_side || device.back_brightness_percentage === null)) {
        await this.renderUnavailable(action, "Rear unknown");
        return;
      }
      const feedback = dialFeedback(device, property);
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

    private async renderUnavailable(action: DialActionType<ActionSettings>, label = "Unavailable"): Promise<void> {
      await action.setFeedbackLayout("layouts/dial.json");
      await action.setFeedback({
        title: { value: "Light" },
        value: { value: label },
        indicator: { value: 0 },
      });
      await action.setTitle(label);
    }
  }
  streamDeck.actions.registerAction(new DialAction());
}
