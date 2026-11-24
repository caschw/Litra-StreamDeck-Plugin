import {
  action,
  streamDeck,
  SingletonAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type DidReceiveSettingsEvent,
  type KeyAction,
} from "@elgato/streamdeck";
import { findUniqueTarget, targetArgv, validateUniqueSelection } from "../litra/identity.js";
import { clamp, percentageToLumen, quantizeTemperature, relativeLumen } from "../litra/conversions.js";
import { frontBrightnessPercent } from "../litra/render.js";
import { LitraState, type StateNotification } from "../litra/state.js";
import { settingsTarget, validateActionSettings, type ActionSettings } from "../litra/targeting.js";
import type { LitraDevice } from "../litra/types.js";

export function registerNumericAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.numeric" })
  class NumericAction extends SingletonAction<ActionSettings> {
    private unsubscribe: (() => void) | undefined;

    override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
      state.setVisible(ev.action.id, true);
      await this.refresh(ev.action as KeyAction<ActionSettings>, ev.payload.settings);
      if (!this.unsubscribe) this.unsubscribe = state.subscribe((n) => this.onState(n));
    }
    override onWillDisappear(ev: { action: { id: string } }): void {
      state.setVisible(ev.action.id, false);
    }
    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
      await this.refresh(ev.action as KeyAction<ActionSettings>, ev.payload.settings);
    }

    override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
      let settings: ActionSettings;
      try { settings = validateActionSettings(ev.payload.settings); }
      catch (error) {
        await ev.action.showAlert();
        await ev.action.setTitle("Invalid");
        console.error("Invalid numeric settings", error);
        return;
      }
      const target = settingsTarget(settings);
      await ev.action.setTitle("Pending");
      let wanted = "";
      const result = await state.mutate(target, (device) => {
        const argv = this.argv(device, target, settings);
        wanted = this.expectedNativeDesired(device, settings);
        return argv;
      }, (_before, after) => this.expectedNativeAfter(after, wanted));
      await this.refresh(ev.action as KeyAction<ActionSettings>, settings, result.device ?? null, result.error);
    }

    private argv(device: LitraDevice, target: ReturnType<typeof settingsTarget>, settings: ActionSettings): string[] {
      const operation = settings.operation ?? "set";
      const preset = settings.preset ?? 0;
      if (settings.property === "frontTemperature") {
        let kelvin = device.temperature_in_kelvin;
        if (operation === "set") kelvin = quantizeTemperature(device, preset);
        if (operation === "increase") kelvin = quantizeTemperature(device, kelvin + preset * 100);
        if (operation === "decrease") kelvin = quantizeTemperature(device, kelvin - preset * 100);
        return ["temperature", "--value", String(kelvin), ...targetArgv(target)];
      }
      if (settings.property === "rearBrightness") {
        const current = device.back_brightness_percentage;
        if (current === null) throw new Error("LX rear brightness is unavailable.");
        let value = clamp(preset, 1, 100);
        if (operation === "increase") value = clamp(current + preset, 1, 100);
        if (operation === "decrease") value = clamp(current - preset, 1, 100);
        return ["back-brightness", "--percentage", String(value), ...targetArgv(target)];
      }
      let lumen = device.brightness_in_lumen;
      if (operation === "set") lumen = percentageToLumen(device, preset);
      if (operation === "increase") lumen = relativeLumen(device, preset);
      if (operation === "decrease") lumen = relativeLumen(device, -preset);
      return ["brightness", "--value", String(lumen), ...targetArgv(target)];
    }

    private expectedNativeDesired(device: LitraDevice, settings: ActionSettings): string {
      const operation = settings.operation ?? "set";
      const preset = settings.preset ?? 0;
      if (settings.property === "frontTemperature") {
        let kelvin = device.temperature_in_kelvin;
        if (operation === "set") kelvin = quantizeTemperature(device, preset);
        if (operation === "increase") kelvin = quantizeTemperature(device, kelvin + preset * 100);
        if (operation === "decrease") kelvin = quantizeTemperature(device, kelvin - preset * 100);
        return `temp:${kelvin}`;
      }
      if (settings.property === "rearBrightness") {
        const current = device.back_brightness_percentage ?? 1;
        let value = clamp(preset, 1, 100);
        if (operation === "increase") value = clamp(current + preset, 1, 100);
        if (operation === "decrease") value = clamp(current - preset, 1, 100);
        return `rear:${value}`;
      }
      let lumen = device.brightness_in_lumen;
      if (operation === "set") lumen = percentageToLumen(device, preset);
      if (operation === "increase") lumen = relativeLumen(device, preset);
      if (operation === "decrease") lumen = relativeLumen(device, -preset);
      return `front:${lumen}`;
    }

    private expectedNativeAfter(device: LitraDevice, wanted: string): boolean {
      if (wanted.startsWith("temp:")) return `temp:${device.temperature_in_kelvin}` === wanted;
      if (wanted.startsWith("rear:")) return `rear:${device.back_brightness_percentage ?? "unknown"}` === wanted;
      return `front:${device.brightness_in_lumen}` === wanted;
    }

    private expectedNative(device: LitraDevice, settings: ActionSettings): string {
      if (settings.property === "frontTemperature") return `temp:${device.temperature_in_kelvin}`;
      if (settings.property === "rearBrightness") return `rear:${device.back_brightness_percentage ?? "unknown"}`;
      return `front:${device.brightness_in_lumen}`;
    }

    private async onState(notification: StateNotification): Promise<void> {
      for (const action of this.actions) {
        const settings = await action.getSettings();
        await this.render(notification, action as KeyAction<ActionSettings>, settings);
      }
    }

    private async refresh(
      action: KeyAction<ActionSettings>,
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
        await action.setImage("imgs/error.png");
        await action.setTitle("Unavailable");
        await action.showAlert();
        console.error("Litra numeric refresh failed", refreshError);
      }
    }

    private async render(notification: StateNotification, action: KeyAction<ActionSettings>, settings: ActionSettings): Promise<void> {
      const target = settingsTarget(settings);
      try {
        validateActionSettings(settings);
        validateUniqueSelection([...notification.devices], target);
        const device = findUniqueTarget([...notification.devices], target);
        if (!device) throw new Error("Selected light is unavailable or unreadable.");
        await this.renderDevice(action, settings, device, notification.status, notification.error);
      } catch (error) {
        await action.setImage("imgs/error.png");
        await action.setTitle(notification.status === "pending" ? "Pending" : "Unavailable");
        if (notification.status === "error") await action.showAlert();
        console.error("Litra numeric target unavailable", error);
      }
    }

    private async renderDevice(
      action: KeyAction<ActionSettings>,
      settings: ActionSettings,
      device: LitraDevice,
      status: "confirmed" | "pending" | "stale" | "unavailable" | "error",
      error?: string,
    ): Promise<void> {
      if (status === "pending") {
        await action.setImage("imgs/numeric.png");
        await action.setTitle("Pending");
        return;
      }
      const property = settings.property ?? "frontBrightness";
      const operation = settings.operation ?? "set";
      let value = "";
      let icon = "imgs/numeric.png";
      if (property === "frontTemperature") value = `${device.temperature_in_kelvin} K`;
      else if (property === "rearBrightness") value = device.back_brightness_percentage === null ? "Rear unknown" : `${device.back_brightness_percentage}%`;
      else value = `${frontBrightnessPercent(device)}%`;
      if (status === "error") {
        icon = "imgs/error.png";
        await action.showAlert();
        console.error("Litra numeric state error", error);
      }
      await action.setImage(icon);
      await action.setTitle(`${operation === "set" ? "Set" : operation === "increase" ? "+" : "-"}\n${value}`);
    }
  }
  streamDeck.actions.registerAction(new NumericAction());
}
