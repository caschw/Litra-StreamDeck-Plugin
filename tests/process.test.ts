import { describe, expect, it } from "vitest";
import path from "node:path";
import { helperPath, LitraProcessError } from "../src/litra/process.js";

describe("bundled helper process selection", () => {
  it("resolves macOS universal helper", () => {
    expect(helperPath("darwin", "arm64").endsWith(path.join("darwin-universal", "litra"))).toBe(true);
  });

  it("resolves Windows x64 and ARM64 helpers", () => {
    expect(helperPath("win32", "x64").endsWith(path.join("windows-amd64", "litra.exe"))).toBe(true);
    expect(helperPath("win32", "arm64").endsWith(path.join("windows-arm64", "litra.exe"))).toBe(true);
  });

  it("rejects unsupported platform and architecture combinations", () => {
    expect(() => helperPath("linux", "x64")).toThrow(LitraProcessError);
    expect(() => helperPath("darwin", "ia32")).toThrow(LitraProcessError);
  });

  it("preserves spaces and Unicode as helper argv values", () => {
    const values = ["--serial-number", "SERIAL with space \u00e9"];
    expect(values).toEqual(["--serial-number", "SERIAL with space \u00e9"]);
  });
});
