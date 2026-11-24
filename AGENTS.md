# AGENTS

## Repository map

- `src/plugin.ts`: SDK entry point.
- `src/actions/`: power, numeric, and dial action implementations.
- `src/litra/`: helper process adapter, identity, state queue, conversions, burst handling, and rendering.
- `tests/`: Vitest unit/integration tests.
- `com.caschw.litra.sdPlugin/`: manifest, UI, layouts, images, compiled plugin JavaScript, and bundled helpers.
- `scripts/`: build/package verification.
- `docs/`: contributor and user documentation.

Source boundaries: edit `src/`, `tests/`, `docs/`, root metadata, and source assets. Do not hand-edit generated `com.caschw.litra.sdPlugin/bin/plugin.js` or generated helper copies as source.

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
```

Node 24 is required by the pinned Stream Deck SDK. Stream Deck 7.1, macOS 13+, and Windows 10+ are the manifest baseline.

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

Live status reads are safe for development. Mutating commands are prohibited in tests or CI unless the user explicitly grants hardware permission. Real writes must remain opt-in.
