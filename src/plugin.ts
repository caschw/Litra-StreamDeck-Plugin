import streamDeck from "@elgato/streamdeck";
import { registerDialAction } from "./actions/dial.js";
import { registerNumericAction } from "./actions/numeric-key.js";
import { registerPowerAction } from "./actions/power-key.js";
import { LitraState } from "./litra/state.js";

const state = new LitraState();
registerPowerAction(state);
registerNumericAction(state);
registerDialAction(state);
state.startPolling();

streamDeck.system.onSystemDidWakeUp(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidChange(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidConnect(() => void state.refresh().catch(() => undefined));
streamDeck.devices.onDeviceDidDisconnect(() => void state.refresh().catch(() => undefined));

void streamDeck.connect();
