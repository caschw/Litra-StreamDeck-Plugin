import streamDeck from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { registerDialAction } from "./actions/dial.js";
import { registerNumericAction } from "./actions/numeric-key.js";
import { registerPowerAction } from "./actions/power-key.js";
import { LitraState } from "./litra/state.js";
import { findUniqueTarget } from "./litra/identity.js";
import { validateActionSettings } from "./litra/validation.js";
import type { ActionSettings } from "./litra/targeting.js";

const state = new LitraState();
registerPowerAction(state);
registerNumericAction(state);
registerDialAction(state);
state.startPolling();

streamDeck.system.onSystemDidWakeUp(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidChange(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidConnect(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidDisconnect(() => void state.refresh().catch(() => undefined));

streamDeck.ui.onSendToPlugin<{
  event?: "getInitialData" | "refreshDevices" | "saveSettings";
  settings?: JsonObject;
}, ActionSettings>(async (ev) => {
  if (ev.payload.event === "saveSettings" && ev.payload.settings) {
    try {
      const settings = validateActionSettings(ev.payload.settings as unknown as ActionSettings);
      await ev.action.setSettings(settings);
    } catch (error) {
      await streamDeck.ui.sendToPropertyInspector({
        event: "settingsError",
        message: error instanceof Error ? error.message : "Invalid settings.",
      });
      return;
    }
  }
  if (ev.payload.event === "getInitialData" || ev.payload.event === "refreshDevices") {
    try {
      const result = await state.refresh();
      await streamDeck.ui.sendToPropertyInspector({
        event: "initialData",
        devices: result.devices as unknown as JsonValue[],
        settings: await ev.action.getSettings(),
      });
    } catch (error) {
      await streamDeck.ui.sendToPropertyInspector({
        event: "initialData",
        devices: [],
        settings: await ev.action.getSettings(),
        error: error instanceof Error ? error.message : "Could not read devices.",
      });
    }
  }
});

streamDeck.ui.onDidAppear<ActionSettings>(async (ev) => {
  try {
    const result = await state.refresh();
    await streamDeck.ui.sendToPropertyInspector({
      event: "initialData",
      devices: result.devices as unknown as JsonValue[],
      settings: await ev.action.getSettings() as unknown as JsonValue,
    });
  } catch (error) {
    await streamDeck.ui.sendToPropertyInspector({
      event: "initialData",
      devices: [],
      settings: await ev.action.getSettings() as unknown as JsonValue,
      error: error instanceof Error ? error.message : "Could not read devices.",
    });
  }
});

void streamDeck.connect();
