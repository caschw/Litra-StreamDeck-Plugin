import { action, streamDeck, SingletonAction, type KeyDownEvent, type WillAppearEvent } from "@elgato/streamdeck";
import { LitraState } from "../litra/state.js";
import { settingsTarget, type ActionSettings } from "../litra/targeting.js";

export function registerPowerAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.power" })
  class PowerAction extends SingletonAction<ActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
      state.setVisible(ev.action.id, true);
      await this.refresh(ev.action, ev.payload.settings);
    }

    override async onWillDisappear(ev: { action: { id: string } }): Promise<void> {
      state.setVisible(ev.action.id, false);
    }

    override async onDidReceiveSettings(ev: import("@elgato/streamdeck").DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
      await this.refresh(ev.action, ev.payload.settings);
    }

    override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
      const settings = ev.payload.settings;
      const target = settingsTarget(settings);
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
        if (device.serial_number) args.push("--serial-number", device.serial_number);
        else if (device.device_path) args.push("--device-path", device.device_path);
        return args;
      });
      await this.refresh(ev.action, settings, result.error);
    }

    private async refresh(action: any, settings: ActionSettings, error?: string): Promise<void> {
      const target = settingsTarget(settings);
      let device = null;
      try {
        const result = await state.refresh();
        device = result.devices.find((d) =>
          (target.serialNumber && d.serial_number === target.serialNumber)
          || (target.devicePath && d.device_path === target.devicePath)
        ) ?? null;
      } catch (refreshError) {
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
      if (error) await action.showAlert();
    }
  }
  streamDeck.actions.registerAction(new PowerAction());
}
