import {
  action,
  streamDeck,
  SingletonAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type DidReceiveSettingsEvent,
  type DialDownEvent,
  type KeyAction,
} from "@elgato/streamdeck";
import { findUniqueTarget, targetArgv, validateUniqueSelection } from "../litra/identity.js";
import { LitraState, type StateNotification } from "../litra/state.js";
import { settingsTarget, validateActionSettings, type ActionSettings } from "../litra/targeting.js";
import type { LitraDevice } from "../litra/types.js";

export function registerPowerAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.power" })
  class PowerAction extends SingletonAction<ActionSettings> {
    private unsubscribe: (() => void) | undefined;
    private revision = new Map<string, number>();

    override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
      state.setVisible(ev.action.id, true);
      await this.refresh(ev.action as KeyAction<ActionSettings>, ev.payload.settings);
      if (!this.unsubscribe) {
        this.unsubscribe = state.subscribe((notification) => this.onState(notification));
      }
    }

    override onWillDisappear(ev: { action: { id: string } }): void {
      state.setVisible(ev.action.id, false);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
      this.revision.set(ev.action.id, (this.revision.get(ev.action.id) ?? 0) + 1);
      await this.refresh(ev.action as KeyAction<ActionSettings>, ev.payload.settings);
    }

    override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
      let settings: ActionSettings;
      try {
        settings = validateActionSettings(ev.payload.settings);
      } catch (error) {
        await ev.action.showAlert();
        await ev.action.setTitle("Invalid");
        return;
      }
      const target = settingsTarget(settings);
      const rear = settings.rear === true;
      const operation = ev.payload.isInMultiAction
        ? (ev.payload.userDesiredState === 1 ? "off" : "on")
        : settings.operation ?? "toggle";
      const generation = this.revision.get(ev.action.id) ?? 0;
      await ev.action.setTitle(rear ? "Rear pending" : "Pending");
      let desired: boolean | null = null;
      const result = await state.mutate(target, (device) => {
        const current = rear ? device.is_back_on : device.is_on;
        if (operation === "toggle") {
          desired = current === null ? null : !current;
          return rear
            ? [desired ? "back-on" : "back-off", ...targetArgv(target)]
            : [desired ? "on" : "off", ...targetArgv(target)];
        }
        desired = operation === "on";
        return rear
          ? [operation === "on" ? "back-on" : "back-off", ...targetArgv(target)]
          : [operation === "on" ? "on" : "off", ...targetArgv(target)];
      }, (_before, after) => desired === null ? true : rear
        ? after.is_back_on === desired
        : after.is_on === desired);
      if (generation !== (this.revision.get(ev.action.id) ?? 0)) return;
      await this.refresh(ev.action as KeyAction<ActionSettings>, settings, result.device ?? null, result.error);
    }

    private async onState(notification: StateNotification): Promise<void> {
      for (const action of this.actions) {
          if (!action.isKey()) continue;
        const settings = await action.getSettings();
        let validated: ActionSettings;
        try {
          validated = validateActionSettings(settings);
        } catch {
          await action.setTitle("Invalid");
          await action.showAlert();
          continue;
        }
        await this.render(notification, action as KeyAction<ActionSettings>, validated);
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
        await this.render({ devices: result.devices, revision: result.revision, status: error ? "error" : "confirmed", error },
          action,
          settings);
      } catch (refreshError) {
        await action.setImage("imgs/error.png");
        await action.setTitle("Unavailable");
        await action.showAlert();
        console.error("Litra power refresh failed", refreshError);
      }
    }

    private async render(
      notification: StateNotification,
      action: KeyAction<ActionSettings>,
      settings: ActionSettings,
    ): Promise<void> {
      const target = settingsTarget(settings);
      let device: LitraDevice | null = null;
      try {
        validateUniqueSelection([...notification.devices], target);
        device = findUniqueTarget([...notification.devices], target);
      } catch (error) {
        await action.setImage("imgs/error.png");
        await action.setTitle(notification.status === "pending" ? "Pending" : "Unavailable");
        if (notification.status === "error") await action.showAlert();
        console.error("Litra power target unavailable", error);
        return;
      }
      if (!device) {
        await action.setImage("imgs/error.png");
        await action.setTitle("Unavailable");
        return;
      }
      await this.renderDevice(action, settings, device,
        notification.status,
        notification.error);
    }

    private async renderDevice(
      action: KeyAction<ActionSettings>,
      settings: ActionSettings,
      device: LitraDevice,
      status: "confirmed" | "pending" | "stale" | "unavailable" | "error",
      error?: string,
    ): Promise<void> {
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
  }
  streamDeck.actions.registerAction(new PowerAction());
}
