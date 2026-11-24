import { describe, expect, it } from "vitest";
import { helperPath, LitraProcessError } from "../src/litra/process.js";

describe("bundled helper process selection", () => {
  it("resolves macOS universal helper", () => {
    expect(helperPath("darwin", "arm64")).toMatch(/darwin-universal\/litra$/);
  });

  it("resolves Windows x64 and ARM64 helpers", () => {
    expect(helperPath("win32", "x64")).toMatch(/windows-amd64\/litra\.exe$/);
    expect(helperPath("win32", "arm64")).toMatch(/windows-arm64\/litra\.exe$/);
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
