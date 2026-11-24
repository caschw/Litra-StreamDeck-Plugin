import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "com.caschw.litra.sdPlugin", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const required = [
  "com.caschw.litra.sdPlugin/bin/plugin.mjs",
  "com.caschw.litra.sdPlugin/THIRD_PARTY_JAVASCRIPT_LICENSES.txt",
  "com.caschw.litra.sdPlugin/layouts/dial.json",
  "com.caschw.litra.sdPlugin/ui/property-inspector.html",
];
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`Missing package file: ${rel}`);
}
for (const rel of [
  "bin/litra/darwin-universal/litra",
  "bin/litra/windows-amd64/litra.exe",
  "bin/litra/windows-arm64/litra.exe",
]) {
  const file = path.join(root, rel);
  if (!existsSync(file) || statSync(file).size === 0) throw new Error(`Missing bundled helper: ${rel}`);
}
const hashes = {
  "darwin-universal": "ded84a0a3dbba26d2932a7a17aee75f8e6d51260042af4e0071c7af145b4249c",
  "windows-amd64": "4024567efadd7fb54611a865be784012059e322221c0356150184dcb60283bdb",
  "windows-arm64": "8a6942cd6e69856037201ab13ab4b6923ab6b8b2363b4031b43e086bc207db6b",
};
for (const [asset, expected] of Object.entries(hashes)) {
  const rel = asset === "darwin-universal"
    ? "bin/litra/darwin-universal/litra"
    : `bin/litra/${asset}/litra.exe`;
  const actual = createHash("sha256").update(readFileSync(path.join(root, rel))).digest("hex");
  if (actual !== expected) throw new Error(`Hash mismatch for ${rel}: ${actual}`);
  const packaged = createHash("sha256").update(readFileSync(path.join(root, "com.caschw.litra.sdPlugin", rel))).digest("hex");
  if (packaged !== expected) throw new Error(`Packaged helper hash mismatch for ${rel}: ${packaged}`);
}
if (manifest.UUID !== "com.caschw.litra") throw new Error("Unexpected plugin UUID");
if (manifest.CodePath !== "bin/plugin.mjs") throw new Error("Manifest must launch the bundled ESM entrypoint.");
console.log("Package structure and pinned helper hashes verified.");
