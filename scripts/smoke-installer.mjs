import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { WebSocketServer } from "ws";

const installer = path.resolve(process.argv[2] || "com.caschw.litra.streamDeckPlugin");
const temporary = mkdtempSync(path.join(tmpdir(), "litra installer smoke \u00e9-"));
const pluginName = "com.caschw.litra.sdPlugin";
const plugin = path.join(temporary, pluginName);
let child;
let output = "";
let socket;
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
const messages = [];
const waiters = new Set();
server.on("connection", (connection) => {
  socket = connection;
  connection.on("message", (raw) => {
    messages.push(JSON.parse(raw.toString()));
    for (const notify of waiters) notify();
  });
});

function waitFor(predicate, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`Timed out awaiting ${label}.`)), 15000);
    function inspect() {
      const message = messages.find(predicate);
      if (message) finish(undefined, message);
    }
    function exited(code, signal) {
      finish(new Error(`Plugin exited before ${label} (${code ?? signal}).`));
    }
    function finish(error, message) {
      clearTimeout(timer);
      waiters.delete(inspect);
      child.off("exit", exited);
      if (error) reject(error);
      else resolve(message);
    }
    waiters.add(inspect);
    child.once("exit", exited);
    inspect();
  });
}

try {
  for (const [name, bytes] of Object.entries(unzipSync(readFileSync(installer)))) {
    assert(name.startsWith(pluginName + "/"), `Unexpected installer path: ${name}`);
    const target = path.resolve(temporary, name);
    const relative = path.relative(plugin, target);
    assert(!relative.startsWith("..") && !path.isAbsolute(relative), `Unsafe installer path: ${name}`);
    assert(!name.split("/").includes("node_modules"), "Smoke fixture must not include node_modules.");
    if (name.endsWith("/")) mkdirSync(target, { recursive: true });
    else {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }
  }
  // Avoid any physical-device I/O. Exercise the real missing-helper error path
  // with the installer entrypoint untouched; no key/dial mutation events are sent.
  for (const [directory, expected] of Object.entries({
    "darwin-universal": "ded84a0a3dbba26d2932a7a17aee75f8e6d51260042af4e0071c7af145b4249c",
    "windows-amd64": "4024567efadd7fb54611a865be784012059e322221c0356150184dcb60283bdb",
    "windows-arm64": "8a6942cd6e69856037201ab13ab4b6923ab6b8b2363b4031b43e086bc207db6b",
  })) {
    const executable = path.join(plugin, "bin", "litra", directory,
      directory === "darwin-universal" ? "litra" : "litra.exe");
    assert(existsSync(executable), `Installer helper missing: ${directory}`);
    assert.equal(createHash("sha256").update(readFileSync(executable)).digest("hex"), expected,
      `Installer helper hash mismatch: ${directory}`);
    rmSync(executable);
  }
  const manifest = JSON.parse(readFileSync(path.join(plugin, "manifest.json"), "utf8"));
  const entrypoint = path.resolve(plugin, manifest.CodePath);
  assert(entrypoint.startsWith(plugin + path.sep), "Manifest entrypoint must be inside plugin.");
  assert(existsSync(entrypoint), "Manifest entrypoint is missing.");
  assert(existsSync(path.join(plugin, "THIRD_PARTY_JAVASCRIPT_LICENSES.txt")), "Bundled dependency licenses missing.");
  assert(!existsSync(path.join(temporary, "node_modules")), "Isolated fixture has dependencies.");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const env = { ...process.env };
  delete env.NODE_PATH;
  delete env.NODE_OPTIONS;
  child = spawn(process.execPath, [
    entrypoint, "-port", String(address.port), "-pluginUUID", "SMOKE-PLUGIN-UUID",
    "-registerEvent", "registerPlugin", "-info", JSON.stringify({
      application: { language: "en", platform: process.platform === "win32" ? "windows" : "mac",
        platformVersion: "13.0", version: "7.1.0" },
      plugin: { uuid: manifest.UUID, version: manifest.Version },
      devices: [{ id: "SMOKE-DEVICE", name: "Mock Stream Deck", type: 0, size: { rows: 3, columns: 5 } }],
    }),
  ], { cwd: plugin, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", (error) => { output += error.message; });
  const registration = await waitFor((message) => message.event === "registerPlugin", "SDK registration");
  assert.equal(registration.uuid, "SMOKE-PLUGIN-UUID");
  const lifecycle = {
    action: "com.caschw.litra.numeric", context: "SMOKE-ACTION", device: "SMOKE-DEVICE",
    payload: { controller: "Keypad", coordinates: { column: 0, row: 0 }, isInMultiAction: false,
      settings: { targetMode: "path", devicePath: "SMOKE-NOT-A-REAL-LIGHT", property: "frontBrightness", operation: "set", preset: 0 } },
  };
  socket.send(JSON.stringify({ event: "willAppear", ...lifecycle }));
  const feedback = await waitFor((message) => message.event === "setTitle" && message.context === "SMOKE-ACTION", "action lifecycle feedback");
  assert.equal(feedback.payload.title, "Unavailable");
  await waitFor((message) => message.event === "showAlert" && message.context === "SMOKE-ACTION", "honest missing-helper alert");
  socket.send(JSON.stringify({ event: "willDisappear", ...lifecycle }));
  assert.doesNotMatch(output, /MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|Cannot find (?:module|package)/);
  console.log(`Installer smoke passed: isolated ${path.basename(entrypoint)}, SDK registration, action lifecycle, bounded missing-helper feedback; no hardware I/O.`);
} catch (error) {
  const logs = path.join(plugin, "logs");
  if (existsSync(logs)) {
    for (const name of readdirSync(logs)) output += readFileSync(path.join(logs, name), "utf8");
  }
  throw new Error(`${error instanceof Error ? error.message : error}\n${output}`, { cause: error });
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const closed = once(child, "close");
    child.kill("SIGKILL");
    await closed;
  }
  socket?.terminate();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(temporary, { recursive: true, force: true });
}
