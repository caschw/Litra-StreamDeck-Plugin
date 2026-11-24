# AGENTS

## Repository map

- `src/plugin.ts`: SDK entry point.
- `src/actions/`: power, numeric, and dial action implementations.
- `src/litra/`: helper process adapter, identity, state queue, conversions, burst handling, and rendering.
- `tests/`: Vitest unit/integration tests.
- `com.caschw.litra.sdPlugin/`: manifest, UI, layouts, images, compiled plugin JavaScript, and bundled helpers.
- `scripts/`: build/package verification.
- `docs/`: contributor and user documentation.

Source boundaries: edit `src/`, `tests/`, `docs/`, root metadata, and source assets. Do not hand-edit generated `com.caschw.litra.sdPlugin/bin/plugin.mjs`, dependency notices, or generated helper copies as source.

## Verified commands

```bash
npm ci
npm run typecheck
npm test
npm run build
node scripts/package-plugin.mjs
npm run verify:package
npm run validate
npm run package
npm run test:installer
```

## Local-only delivery

Run all builds, tests, validation, and packaging locally. Do not add GitHub Actions workflow files, enable Actions, use hosted runners, or configure paid automation. There is intentionally no `.github/workflows/` content. Missing local Windows/hardware coverage must be recorded as pending, not delegated to hosted automation.

Node 24 is required by the pinned Stream Deck SDK. Stream Deck 7.1, macOS 13+, and Windows 10+ are the manifest baseline.

`build` typechecks and bundles the SDK/runtime dependencies into one ESM entrypoint using esbuild, leaving only Node builtins external. It also generates the shipped dependency licenses. `test:installer` extracts the real installer to a temporary directory outside the repository, starts it without `node_modules`, and checks SDK registration and unavailable-action feedback with a mock Stream Deck WebSocket. It verifies all helper hashes, then removes only the extracted helper executables before starting the process to guarantee no hardware I/O.

## Mandatory invariants

- One exact serial or path targets one readable selected device.
- Never fall back to model or first-device selection.
- Serialize helper reads and writes globally.
- A mutation must read fresh state, execute an absolute target, then read back actual state.
- Never optimistically toggle or display requested values as confirmed.
- Poll only visible controls and refresh every two seconds.
- Coalesce only compatible adjacent dial movement and never lose ticks/settings boundaries.
- LX rear `null` means unknown, never Off or zero.
- Front 0% maps to minimum native lumens, never zero lumens or Off.
- Never mutate hardware in automated tests without explicit permission.

## Helper provenance

The bundled helper is timrogers/litra-rs v3.3.0 from:

`https://github.com/timrogers/litra-rs/releases/tag/v3.3.0`

Pin and verify assets by SHA-256 in `scripts/verify-package.mjs`. Do not replace helpers at runtime or silently fall back to a system `litra` executable.

## Hardware safety

Live status reads are safe for development. Mutating commands are prohibited in automated checks unless the user explicitly grants hardware permission. Real writes must remain opt-in.
