import { execFile, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { LitraDevice } from "./types.js";

export class LitraProcessError extends Error {
  constructor(message: string, readonly partialReadAllowed = false) {
    super(message);
  }
}

export function helperPath(platform = process.platform, arch = process.arch): string {
  const candidates = [
    path.resolve(process.cwd(), "bin/litra"),
    path.resolve(process.cwd(), "..", "bin", "litra"),
  ];
  let relative: string;
  if (platform === "darwin") {
    if (arch !== "arm64" && arch !== "x64") throw new LitraProcessError("Unsupported macOS architecture.");
    relative = "darwin-universal/litra";
  } else if (platform === "win32") {
    if (arch === "x64") relative = "windows-amd64/litra.exe";
    else if (arch === "arm64") relative = "windows-arm64/litra.exe";
    else throw new LitraProcessError(`Unsupported platform/architecture: ${platform}/${arch}`);
  } else {
    throw new LitraProcessError(`Unsupported platform/architecture: ${platform}/${arch}`);
  }
  const resolved = candidates.map((base) => path.resolve(base, relative));
  const existing = resolved.find((candidate) => existsSync(candidate));
  if (existing) return existing;
  throw new LitraProcessError(`Bundled Litra helper is missing. Checked: ${resolved.join(", ")}`);
}

export function runHelper(
  args: string[],
  timeoutMs = 5000,
  platform = process.platform,
  arch = process.arch,
): Promise<{ stdout: string; stderr: string }> {
  const executable = helperPath(platform, arch);
  if (!existsSync(executable)) throw new LitraProcessError(`Bundled Litra helper is missing: ${executable}`);
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const child: ChildProcess = execFile(executable, args, {
      shell: false,
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, LITRA_DISABLE_UPDATE_CHECK: "1" },
    }, (error, out, err) => {
      stdout = String(out ?? "");
      stderr = String(err ?? "");
      if (timedOut) return reject(new LitraProcessError("Bundled Litra helper timed out."));
      if (error) return reject(new LitraProcessError(
        `Bundled Litra helper failed: ${stderr.trim() || error.message}`,
        true,
      ));
      resolve({ stdout, stderr });
    });
    if (typeof child.killed === "boolean") {
      const timer = setTimeout(() => { timedOut = true; }, timeoutMs);
      child.once("close", () => clearTimeout(timer));
    }
  });
}

export async function readDevices(
  platform = process.platform,
  arch = process.arch,
): Promise<LitraDevice[]> {
  const result = await runHelper(["devices", "--json"], 5000, platform, arch);
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new LitraProcessError("Bundled Litra helper returned malformed JSON.");
  }
  if (!Array.isArray(parsed)) throw new LitraProcessError("Bundled Litra helper returned an invalid device list.");
  return parsed as LitraDevice[];
}
