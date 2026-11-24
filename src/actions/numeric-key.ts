import { action, streamDeck, SingletonAction, type KeyDownEvent, type WillAppearEvent } from "@elgato/streamdeck";
import { LitraState } from "../litra/state.js";
import { clamp, percentageToLumen, quantizeTemperature, relativeLumen } from "../litra/conversions.js";
import { settingsTarget, type ActionSettings } from "../litra/targeting.js";

export function registerNumericAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.numeric" })
  class NumericAction extends SingletonAction<ActionSettings> {
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
      ev.action.setTitle("Pending");
      const result = await state.mutate(target, (device) => {
        const args: string[] = [];
        if (settings.property === "frontTemperature") {
          args.push("temperature");
          let kelvin = device.temperature_in_kelvin;
          if (settings.operation === "set") kelvin = quantizeTemperature(device, Number(settings.preset ?? kelvin));
          if (settings.operation === "increase") kelvin = quantizeTemperature(device, kelvin + 100 * Number(settings.preset ?? 1));
          if (settings.operation === "decrease") kelvin = quantizeTemperature(device, kelvin - 100 * Number(settings.preset ?? 1));
          args.push("--value", String(kelvin));
        } else if (settings.property === "rearBrightness") {
          args.push("back-brightness");
          const current = device.back_brightness_percentage ?? 1;
          let percentage = clamp(Number(settings.preset ?? 1), 1, 100);
          if (settings.operation === "set") percentage = clamp(Number(settings.preset ?? 1), 1, 100);
          if (settings.operation === "increase") percentage = clamp(current + Number(settings.preset ?? 1), 1, 100);
          if (settings.operation === "decrease") percentage = clamp(current - Number(settings.preset ?? 1), 1, 100);
          args.push("--percentage", String(percentage));
        } else {
          args.push("brightness");
          let lumen = device.brightness_in_lumen;
          if (settings.operation === "set") lumen = percentageToLumen(device, Number(settings.preset ?? 0));
          if (settings.operation === "increase") lumen = relativeLumen(device, Number(settings.preset ?? 5));
          if (settings.operation === "decrease") lumen = relativeLumen(device, -Number(settings.preset ?? 5));
          args.push("--value", String(lumen));
        }
        if (device.serial_number) args.push("--serial-number", device.serial_number);
        else if (device.device_path) args.push("--device-path", device.device_path);
        return args;
      });
      await this.refresh(ev.action, settings, result.error);
    }

    private async refresh(action: any, settings: ActionSettings, error?: string): Promise<void> {
      try {
        const devices = (await state.refresh()).devices;
        const target = settingsTarget(settings);
        const device = devices.find((d) =>
          (target.serialNumber && d.serial_number === target.serialNumber)
          || (target.devicePath && d.device_path === target.devicePath)
        );
        if (!device) throw new Error("Selected light is unavailable or unreadable.");
        await action.setImage(error ? "imgs/error.png" : "imgs/numeric.png");
        await action.setTitle(error ? "Error" : settings.operation === "set"
          ? `${settings.preset ?? 0}%`
          : settings.operation === "increase" ? "+" : "-");
        if (error) await action.showAlert();
      } catch {
        await action.setImage("imgs/error.png");
        await action.setTitle("Unavailable");
      }
    }
  }
  streamDeck.actions.registerAction(new NumericAction());
}
