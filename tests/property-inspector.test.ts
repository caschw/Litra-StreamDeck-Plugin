import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const html = readFileSync("com.caschw.litra.sdPlugin/ui/property-inspector.html", "utf8");
const windows: JSDOM[] = [];
const glow = {
  device_type: "glow", device_type_display: "Litra Glow", has_back_side: false,
  serial_number: "GLOW", device_path: "USB Glow", is_on: true,
  brightness_in_lumen: 130, minimum_brightness_in_lumen: 20, maximum_brightness_in_lumen: 250,
  temperature_in_kelvin: 3200, minimum_temperature_in_kelvin: 2700, maximum_temperature_in_kelvin: 6500,
  is_back_on: null, back_brightness_percentage: null,
};
const lx = {
  ...glow, device_type: "beam_lx", device_type_display: "Litra Beam LX", has_back_side: true,
  serial_number: "LX", device_path: "USB LX", is_back_on: false, back_brightness_percentage: 40,
};

function inspector(kind = "numeric", settings: Record<string, unknown> = {}) {
  const sent: Record<string, unknown>[] = [];
  let socket: FakeSocket;
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    onopen?: () => void;
    onmessage?: (message: { data: string }) => void;
    constructor() { socket = this; }
    send(message: string) { sent.push(JSON.parse(message)); }
  }
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    beforeParse(window) { window.WebSocket = FakeSocket; },
  });
  windows.push(dom);
  dom.window.connectElgatoStreamDeckSocket(
    "28196", "PI-CONNECTION-123", "registerPropertyInspector",
    JSON.stringify({ application: { version: "7.1" } }),
    JSON.stringify({ action: `com.caschw.litra.${kind}`, context: "ACTION-CONTEXT-456", payload: { settings } }),
  );
  socket!.onopen!();
  const document = dom.window.document;
  const element = (id: string) => document.getElementById(id);
  const receive = (payload: Record<string, unknown>) => socket!.onmessage!({
    data: JSON.stringify({ event: "sendToPropertyInspector", payload }),
  });
  const initial = (devices = [glow, lx], saved = settings, error?: string) =>
    receive({ event: "initialData", devices, settings: saved, error });
  const change = (id: string, value: string) => {
    element(id).value = value;
    element(id).dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  };
  const save = () => element("save").click();
  const last = () => sent[sent.length - 1];
  const receiveSettings = (settings: Record<string, unknown>, context = "ACTION-CONTEXT-456") =>
    socket!.onmessage!({ data: JSON.stringify({ event: "didReceiveSettings", context, payload: { settings } }) });
  return { dom, document, sent, receive, receiveSettings, initial, element, change, save, last };
}

afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
});

describe("shipped property-inspector DOM/WebSocket contract", () => {
  it("uses the connection ID only for registration and manifest UUID for plugin messages", () => {
    const ui = inspector();
    expect(ui.sent).toEqual([
      { event: "registerPropertyInspector", uuid: "PI-CONNECTION-123" },
      {
        event: "sendToPlugin", action: "com.caschw.litra.numeric", context: "ACTION-CONTEXT-456",
        payload: { event: "getInitialData" },
      },
    ]);
  });

  it.each([
    ["frontTemperature", "increase", "GLOW", 3],
    ["rearBrightness", "decrease", "LX", 4],
  ])("roundtrips saved %s/%s without resetting options", (property, operation, serialNumber, sensitivity) => {
    const settings = { serialNumber, property, operation, preset: 5, sensitivity };
    const ui = inspector("numeric", settings);
    ui.initial();
    expect(ui.element("property").value).toBe(property);
    expect(ui.element("operation").value).toBe(operation);
    ui.change("preset", "7");
    ui.save();
    expect(ui.last()).toMatchObject({
      action: "com.caschw.litra.numeric", context: "ACTION-CONTEXT-456",
      payload: { event: "saveSettings", settings: { ...settings, preset: 7 } },
    });
    const saved = ui.last().payload.settings;
    ui.receive({ event: "settingsSaved", settings: saved });
    ui.change("preset", "9");
    ui.element("cancel").click();
    expect(ui.element("preset").value).toBe("7");
    expect(ui.element("property").value).toBe(property);
    ui.initial([glow, lx], saved);
    expect(ui.element("operation").value).toBe(operation);
    expect(ui.element("sensitivity").value).toBe(String(sensitivity));
  });

  it("preserves preset zero and sensitivity on save and reread", () => {
    const ui = inspector("numeric", { serialNumber: "GLOW", property: "frontBrightness", operation: "set", preset: 0, sensitivity: 5 });
    ui.initial();
    expect(ui.element("preset").value).toBe("0");
    ui.save();
    expect(ui.last().payload.settings).toMatchObject({ preset: 0, sensitivity: 5 });
    ui.initial([glow, lx], ui.last().payload.settings);
    expect(ui.element("preset").value).toBe("0");
  });

  it("sends refreshDevices with the selected action context", () => {
    const ui = inspector("dial");
    ui.element("refresh").click();
    expect(ui.last()).toEqual({
      event: "sendToPlugin", action: "com.caschw.litra.dial", context: "ACTION-CONTEXT-456",
      payload: { event: "refreshDevices" },
    });
  });

  it("shows a rejected save and restores the last accepted settings", () => {
    const ui = inspector("numeric", { serialNumber: "GLOW", property: "frontTemperature", operation: "increase", preset: 2 });
    ui.initial();
    ui.change("preset", "6");
    ui.save();
    ui.receive({ event: "settingsError", message: "Preset rejected by plugin." });
    expect(ui.element("status").textContent).toContain("Preset rejected");
    expect(ui.element("preset").value).toBe("2");
    expect(ui.element("property").value).toBe("frontTemperature");
    expect(ui.element("operation").value).toBe("increase");
  });

  it.each(["power", "numeric", "dial"])("filters rear capability for %s and reevaluates when the target changes", (kind) => {
    const ui = inspector(kind);
    ui.initial();
    ui.change("target", "serial:GLOW");
    expect(ui.document.querySelector('#property option[value="rearBrightness"]').disabled).toBe(true);
    ui.change("target", "serial:LX");
    expect(ui.document.querySelector('#property option[value="rearBrightness"]').disabled).toBe(false);
    ui.change("property", "rearBrightness");
    ui.change("target", "serial:GLOW");
    const count = ui.sent.length;
    ui.save();
    expect(ui.sent).toHaveLength(count);
    expect(ui.element("status").textContent).toMatch(/rear|supported/i);
  });

  it("offers only appropriate action choices and maps power side without a contradictory checkbox", () => {
    const power = inspector("power", { serialNumber: "LX", rear: true, operation: "off" });
    power.initial();
    expect([...power.element("operation").options].map((o) => o.value)).toEqual(["toggle", "on", "off"]);
    expect([...power.element("property").options].map((o) => o.value)).toEqual(["frontBrightness", "rearBrightness"]);
    expect(power.element("property").value).toBe("rearBrightness");
    expect(power.element("rear")).toBeNull();
    power.change("property", "frontBrightness");
    power.save();
    expect(power.last().payload.settings).toMatchObject({ rear: false, property: "frontBrightness", operation: "off" });
    const numeric = inspector("numeric");
    numeric.initial();
    expect([...numeric.element("operation").options].map((o) => o.value)).toEqual(["set", "increase", "decrease"]);
    expect(numeric.element("sensitivity").disabled).toBe(true);
    const dial = inspector("dial");
    dial.initial();
    expect(dial.element("operation").disabled).toBe(true);
    expect(dial.element("preset").disabled).toBe(true);
    expect(dial.element("sensitivity").disabled).toBe(false);
    expect(dial.document.body.textContent).toContain("per detent");
  });

  it("requires explicit selection for a new action rather than defaulting to the first light", () => {
    const ui = inspector();
    ui.initial();
    expect(ui.element("target").value).toBe("");
    const count = ui.sent.length;
    ui.save();
    expect(ui.sent).toHaveLength(count);
    expect(ui.element("status").textContent).toMatch(/select a light/i);
  });

  it("preserves unavailable selected targets without substituting a connected light", () => {
    const ui = inspector("numeric", { targetMode: "path", devicePath: "USB missing:\u00e9", property: "frontBrightness", operation: "set", preset: 0 });
    ui.initial();
    expect(ui.element("target").value).toBe("path:USB missing:\u00e9");
    expect(ui.element("status").textContent).toMatch(/unavailable|unreadable/i);
    const count = ui.sent.length;
    ui.save();
    expect(ui.sent).toHaveLength(count);
  });

  it("does not claim confirmation for empty or failed discovery", () => {
    const ui = inspector();
    ui.initial([]);
    expect(ui.element("status").textContent).toContain("No readable lights");
    ui.initial([], {}, "USB read failed");
    expect(ui.element("status").textContent).toContain("USB read failed");
    expect(ui.element("status").textContent).not.toContain("Confirmed");
  });

  it("shows selected native range, current value and unknown rear status honestly", () => {
    const ui = inspector("numeric", { serialNumber: "GLOW", property: "frontTemperature", operation: "set", preset: 3200 });
    ui.initial();
    expect(ui.element("status").textContent).toContain("3200 K");
    expect(ui.element("status").textContent).toContain("2700");
    expect(ui.element("status").textContent).toContain("6500");
    ui.initial([{ ...lx, is_back_on: null, back_brightness_percentage: null }],
      { serialNumber: "LX", property: "rearBrightness", operation: "set", preset: 40 });
    expect(ui.element("status").textContent).toMatch(/unknown/i);
    expect(ui.element("status").textContent).not.toMatch(/Device-reported: 0%/);
  });

  it("applies didReceiveSettings only to this context with restored options", () => {
    const ui = inspector();
    ui.initial();
    const settings = { serialNumber: "LX", property: "rearBrightness", operation: "decrease", preset: 3 };
    ui.receiveSettings(settings, "OTHER-ACTION");
    expect(ui.element("target").value).toBe("");
    ui.receiveSettings(settings);
    expect(ui.element("target").value).toBe("serial:LX");
    expect(ui.element("property").value).toBe("rearBrightness");
    expect(ui.element("operation").value).toBe("decrease");
  });

  it("refreshes observed values without discarding unsaved edits", () => {
    const settings = { serialNumber: "GLOW", property: "frontBrightness", operation: "set", preset: 0 };
    const ui = inspector("numeric", settings);
    ui.initial();
    ui.change("property", "frontTemperature");
    ui.change("operation", "increase");
    ui.change("preset", "4");
    ui.element("refresh").click();
    ui.initial([{ ...glow, temperature_in_kelvin: 4000 }], settings);
    expect(ui.element("property").value).toBe("frontTemperature");
    expect(ui.element("operation").value).toBe("increase");
    expect(ui.element("preset").value).toBe("4");
    expect(ui.element("status").textContent).toContain("4000 K");
    ui.element("cancel").click();
    expect(ui.element("preset").value).toBe("0");
    expect(ui.element("property").value).toBe("frontBrightness");
  });

  it("keeps explicit path identity even when that device has a unique serial", () => {
    const settings = { targetMode: "path", devicePath: "USB LX", serialNumber: "LX", property: "rearBrightness", operation: "set", preset: 40 };
    const ui = inspector("numeric", settings);
    ui.initial();
    expect(ui.element("target").value).toBe("path:USB LX");
    ui.save();
    expect(ui.last().payload.settings).toMatchObject({ targetMode: "path", devicePath: "USB LX", serialNumber: "" });
  });

  it("offers duplicate/UNKNOWN serial devices only by unambiguous path", () => {
    const ui = inspector();
    ui.initial([
      { ...glow, serial_number: "DUP", device_path: "USB A" },
      { ...glow, serial_number: "DUP", device_path: "USB B" },
      { ...glow, serial_number: "UNKNOWN", device_path: "USB C" },
    ]);
    expect([...ui.element("target").options].map((o) => o.value)).toEqual(["", "path:USB A", "path:USB B", "path:USB C"]);
    ui.change("target", "path:USB B");
    ui.save();
    expect(ui.last().payload.settings).toMatchObject({ targetMode: "path", devicePath: "USB B", serialNumber: "" });
  });

  it("validates temperature units, native limits and dial integer sensitivity before saving", () => {
    const ui = inspector("numeric", { serialNumber: "GLOW", property: "frontTemperature", operation: "set", preset: 3200 });
    ui.initial();
    expect(ui.element("preset").step).toBe("100");
    expect(ui.element("preset").min).toBe("2700");
    expect(ui.element("preset").max).toBe("6500");
    ui.change("preset", "3250");
    const count = ui.sent.length;
    ui.save();
    expect(ui.sent).toHaveLength(count);
    ui.change("operation", "increase");
    expect(ui.element("preset").step).toBe("1");
    expect(ui.element("preset").max).toBe("38");
    expect(ui.element("presetLabel").textContent).toContain("100 K steps");
    const dial = inspector("dial", { serialNumber: "GLOW", property: "frontTemperature", sensitivity: 4 });
    dial.initial();
    dial.change("sensitivity", "2.5");
    const dialCount = dial.sent.length;
    dial.save();
    expect(dial.sent).toHaveLength(dialCount);
    expect(dial.element("status").textContent).toContain("integer from 1 to 5");
    dial.change("sensitivity", "5");
    dial.save();
    expect(dial.last().payload.settings.sensitivity).toBe(5);
  });

  it("waits for the save acknowledgement and does not send duplicate settings", () => {
    const ui = inspector("numeric", { serialNumber: "GLOW", preset: 0 });
    ui.initial();
    ui.save();
    const count = ui.sent.length;
    expect(ui.element("save").disabled).toBe(true);
    expect(ui.element("property").disabled).toBe(true);
    ui.save();
    expect(ui.sent).toHaveLength(count);
    ui.receive({ event: "settingsSaved", settings: ui.last().payload.settings });
    expect(ui.element("save").disabled).toBe(false);
    expect(ui.element("property").disabled).toBe(false);
  });
});
