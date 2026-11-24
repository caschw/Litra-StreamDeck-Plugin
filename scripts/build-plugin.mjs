import { build } from "esbuild";
import { builtinModules } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const result = await build({
  entryPoints: ["src/plugin.ts"],
  outfile: "com.caschw.litra.sdPlugin/bin/plugin.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // ws uses CommonJS internally, including require() for Node builtins.
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  define: {
    "process.env.WS_NO_BUFFER_UTIL": '"1"',
    "process.env.WS_NO_UTF_8_VALIDATE": '"1"',
  },
  metafile: true,
  legalComments: "eof",
});

for (const output of Object.values(result.metafile.outputs)) {
  for (const imported of output.imports) {
    if (!imported.external || (!imported.path.startsWith("node:") && !builtinModules.includes(imported.path))) {
      throw new Error(`Unbundled runtime dependency: ${imported.path}`);
    }
  }
}

const packages = ["@elgato/streamdeck", "@elgato/schemas", "@elgato/utils", "ws", "zod"];
const notices = ["Bundled JavaScript dependency licenses\n"];
for (const name of packages) {
  const directory = path.join("node_modules", name);
  const metadata = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  notices.push(`\n${name} ${metadata.version} (${metadata.license})\n\n${readFileSync(path.join(directory, "LICENSE"), "utf8")}`);
}
writeFileSync("com.caschw.litra.sdPlugin/THIRD_PARTY_JAVASCRIPT_LICENSES.txt", notices.join("\n"));
console.log("Bundled plugin.mjs with Node builtins external and dependency licenses.");
