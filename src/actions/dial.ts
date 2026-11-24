import { action, streamDeck, SingletonAction, type DialDownEvent, type DialRotateEvent, type WillAppearEvent } from "@elgato/streamdeck";
import { clamp, quantizeTemperature, relativeLumen } from "../litra/conversions.js";
import { dialFeedback } from "../litra/render.js";
import { LitraState } from "../litra/state.js";
import { sensitivity, settingsTarget, type ActionSettings } from "../litra/targeting.js";

export function registerDialAction(state: LitraState): void {
  @action({ UUID: "com.caschw.litra.dial" })
  class DialAction extends SingletonAction<ActionSettings> {
    private bursts = new Map<string, { property: ActionSettings["property"]; ticks: number; timer: NodeJS.Timeout }>();

    override async onWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
      state.setVisible(ev.action.id, true);
      await this.refresh(ev.action, ev.payload.settings);
    }

    override async onWillDisappear(ev: { action: { id: string } }): Promise<void> {
      state.setVisible(ev.action.id, false);
      const burst = this.bursts.get(ev.action.id);
      if (burst) clearTimeout(burst.timer);
      this.bursts.delete(ev.action.id);
    }

    override async onDidReceiveSettings(ev: import("@elgato/streamdeck").DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
      await this.refresh(ev.action, ev.payload.settings);
    }

    override async onDialRotate(ev: DialRotateEvent<ActionSettings>): Promise<void> {
      if (!ev.action.isDial()) return;
      const settings = ev.payload.settings;
      const property = settings.property ?? "frontBrightness";
      const ticks = ev.payload.ticks;
      const context = ev.action.id;
      const current = this.bursts.get(context);
      if (current) {
        clearTimeout(current.timer);
        current.ticks += ticks;
        current.property = property;
        current.timer = setTimeout(() => void this.flush(context, settings), 50);
      } else {
        const timer = setTimeout(() => void this.flush(context, settings), 50);
        this.bursts.set(context, { property, ticks, timer });
      }
    }

    override async onDialDown(ev: DialDownEvent<ActionSettings>): Promise<void> {
      const settings = ev.payload.settings;
      const target = settingsTarget(settings);
      const rear = settings.property === "rearBrightness";
      await state.mutate(target, (device) => {
        const args = [rear ? "back-toggle" : "toggle"];
        if (device.serial_number) args.push("--serial-number", device.serial_number);
        else if (device.device_path) args.push("--device-path", device.device_path);
        return args;
      });
      await this.refresh(ev.action, settings);
    }

    private async flush(context: string, settings: ActionSettings): Promise<void> {
      const burst = this.bursts.get(context);
      if (!burst) return;
      this.bursts.delete(context);
      const target = settingsTarget(settings);
      const property = burst.property ?? "frontBrightness";
      const signedSteps = burst.ticks * sensitivity(settings);
      await state.mutate(target, (device) => {
        if (property === "frontTemperature") {
          const kelvin = quantizeTemperature(device, device.temperature_in_kelvin + signedSteps * 100);
          return ["temperature", "--value", String(kelvin),
            ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
        }
        if (property === "rearBrightness") {
          const current = device.back_brightness_percentage;
          if (current === null) throw new Error("LX rear brightness is unavailable.");
          const value = clamp(current + signedSteps, 1, 100);
          return ["back-brightness", "--percentage", String(value),
            ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
        }
        const lumen = relativeLumen(device, signedSteps);
        return ["brightness", "--value", String(lumen),
          ...(device.serial_number ? ["--serial-number", device.serial_number] : ["--device-path", device.device_path ?? ""])];
      }).then((result) => {
        const action = stateActionByContext(context);
        if (action) void this.refresh(action, settings, result.error);
      });
    }

    private async refresh(action: any, settings: ActionSettings, error?: string): Promise<void> {
      const target = settingsTarget(settings);
      try {
        const devices = (await state.refresh()).devices;
        const device = devices.find((d) =>
          (target.serialNumber && d.serial_number === target.serialNumber)
          || (target.devicePath && d.device_path === target.devicePath));
        if (!device) throw new Error("Selected light is unavailable or unreadable.");
        const property = settings.property ?? "frontBrightness";
        const feedback = dialFeedback(device, property);
        await action.setFeedbackLayout("layouts/dial.json");
        await action.setFeedback({
          title: { value: feedback.title },
          value: { value: String(property === "frontTemperature" ? `${feedback.value} K` : `${feedback.value}%`) },
          indicator: { value: feedback.indicator },
        });
        await action.setTitle(error ? "Error" : String(property === "frontTemperature"
          ? `${feedback.value} K`
          : `${feedback.value}%`));
        if (error) await action.showAlert();
      } catch {
        await action.setFeedbackLayout("layouts/dial.json");
        await action.setFeedback({
          title: { value: "Light" },
          value: { value: "Unavailable" },
          indicator: { value: 0 },
        });
        await action.setTitle("Unavailable");
      }
    }
  }

  streamDeck.actions.registerAction(new DialAction());
}

function stateActionByContext(context: string): any {
  for (const action of streamDeck.actions) {
    if (action.id === context) return action;
  }
  return null;
}
