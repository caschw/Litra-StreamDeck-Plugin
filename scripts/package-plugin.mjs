import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const plugin = path.join(root, "com.caschw.litra.sdPlugin");
const helperRoot = path.join(plugin, "bin", "litra");
mkdirSync(helperRoot, { recursive: true });
for (const asset of ["darwin-universal", "windows-amd64", "windows-arm64"]) {
  const source = path.join(root, "bin", "litra", asset);
  const target = path.join(helperRoot, asset);
  cpSync(source, target, { recursive: true, preserveTimestamps: true });
}
if (!existsSync(path.join(plugin, "bin", "plugin.js"))) {
  throw new Error("Plugin JavaScript not built; run npm run build first.");
}
writeFileSync(path.join(plugin, "bin", "litra-assets.json"), JSON.stringify({
  version: "v3.3.0",
  source: "https://github.com/timrogers/litra-rs/releases/tag/v3.3.0",
}, null, 2));
console.log(`Prepared ${path.relative(root, plugin)} with pinned helper binaries.`);
