# Development

## Local-only delivery

All setup, builds, tests, helper verification, validation, and installer packaging happen locally. Do not add GitHub Actions workflows, enable hosted runners, or configure paid automation.

The delivery sequence is local verification with the commands below, local installer generation and isolated smoke testing, then source publication with the installer path/hash and honest platform coverage. Windows execution/installation checks require an available local Windows host; otherwise they remain explicitly pending. Neither source publication nor local packaging implies physical-device or signing verification. No hosted job is a delivery prerequisite.

## Setup

```bash
npm ci
npm run typecheck
npm test
npm run build
node scripts/package-plugin.mjs
npm run verify:package
npm run validate
npm run package -- --force
npm run test:installer
```

Do not install a system Litra helper. The plugin uses `bin/litra/` assets pinned to upstream v3.3.0.

## Build and package

```bash
npm run bundle
npm run package -- --force
npm run test:installer
```

`npm run build` typechecks and uses esbuild to create `bin/plugin.mjs`, including the SDK and its JavaScript runtime dependencies. Only Node builtins are external. It also generates the full shipped JavaScript dependency license texts. `npm run bundle` additionally copies the pinned helpers into the runtime folder.

`npm run package` creates a `.streamDeckPlugin` installer. `--force` replaces an existing local installer. `npm run validate` uses the pinned official Stream Deck CLI and checks the manifest/layout.

`npm run test:installer` extracts the actual installer to a temporary path with spaces/non-ASCII characters, outside the repository and without `node_modules`/`NODE_PATH`. A mock Stream Deck WebSocket verifies SDK registration and an action's bounded unavailable/error feedback. The test verifies helper hashes, then removes only the extracted helper executables so no physical-device I/O can occur. The entrypoint and remaining installed files are unmodified. Run this locally with Node 24 on each available platform; it is not evidence of a real Stream Deck installation or USB control.

## Mocked tests

Vitest covers conversions, identity, serialized state, readback, and dial burst behavior. Test helpers must not execute mutation commands against physical devices.

## Live reads

Live status reads are allowed in development. Hardware mutations require explicit user permission and should be recorded in a manual compatibility matrix.
