"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitraProcessError = void 0;
exports.helperPath = helperPath;
exports.runHelper = runHelper;
exports.readDevices = readDevices;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const validation_js_1 = require("./validation.js");
class LitraProcessError extends Error {
    partialReadAllowed;
    constructor(message, partialReadAllowed = false) {
        super(message);
        this.partialReadAllowed = partialReadAllowed;
    }
}
exports.LitraProcessError = LitraProcessError;
function helperPath(platform = node_process_1.default.platform, arch = node_process_1.default.arch) {
    const candidates = [
        node_path_1.default.resolve(node_process_1.default.cwd(), "bin/litra"),
        node_path_1.default.resolve(node_process_1.default.cwd(), "..", "bin", "litra"),
    ];
    let relative;
    if (platform === "darwin") {
        if (arch !== "arm64" && arch !== "x64")
            throw new LitraProcessError("Unsupported macOS architecture.");
        relative = "darwin-universal/litra";
    }
    else if (platform === "win32") {
        if (arch === "x64")
            relative = "windows-amd64/litra.exe";
        else if (arch === "arm64")
            relative = "windows-arm64/litra.exe";
        else
            throw new LitraProcessError(`Unsupported platform/architecture: ${platform}/${arch}`);
    }
    else {
        throw new LitraProcessError(`Unsupported platform/architecture: ${platform}/${arch}`);
    }
    const resolved = candidates.map((base) => node_path_1.default.resolve(base, relative));
    const existing = resolved.find((candidate) => (0, node_fs_1.existsSync)(candidate));
    if (existing)
        return existing;
    throw new LitraProcessError(`Bundled Litra helper is missing. Checked: ${resolved.join(", ")}`);
}
function runHelper(args, timeoutMs = 5000, platform = node_process_1.default.platform, arch = node_process_1.default.arch) {
    const executable = helperPath(platform, arch);
    if (!(0, node_fs_1.existsSync)(executable))
        throw new LitraProcessError(`Bundled Litra helper is missing: ${executable}`);
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const child = (0, node_child_process_1.execFile)(executable, args, {
            shell: false,
            windowsHide: true,
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024,
            env: { ...node_process_1.default.env, LITRA_DISABLE_UPDATE_CHECK: "1" },
        }, (error, out, err) => {
            stdout = String(out ?? "");
            stderr = String(err ?? "");
            if (timedOut)
                return reject(new LitraProcessError("Bundled Litra helper timed out."));
            if (error)
                return reject(new LitraProcessError(`Bundled Litra helper failed: ${stderr.trim() || error.message}`, true));
            resolve({ stdout, stderr });
        });
        const timer = setTimeout(() => {
            timedOut = true;
            if (!child.killed)
                child.kill();
        }, timeoutMs);
        child.once("close", () => clearTimeout(timer));
        child.once("error", (error) => {
            clearTimeout(timer);
            reject(new LitraProcessError(`Unable to start bundled Litra helper: ${error.message}`));
        });
    });
}
async function readDevices(platform = node_process_1.default.platform, arch = node_process_1.default.arch) {
    const result = await runHelper(["devices", "--json"], 5000, platform, arch);
    let parsed;
    try {
        parsed = JSON.parse(result.stdout);
    }
    catch {
        throw new LitraProcessError("Bundled Litra helper returned malformed JSON.");
    }
    try {
        return (0, validation_js_1.validateDevicesJson)(parsed);
    }
    catch (error) {
        throw new LitraProcessError(error instanceof Error ? error.message : "Invalid device JSON.");
    }
}
//# sourceMappingURL=process.js.map