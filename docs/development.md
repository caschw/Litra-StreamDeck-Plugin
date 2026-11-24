# Development

## Setup

```bash
npm ci
npm run typecheck
npm test
npm run build
node scripts/package-plugin.mjs
npm run verify:package
npm run validate
```

Do not install a system Litra helper. The plugin uses `bin/litra/` assets pinned to upstream v3.3.0.

## Build and package

```bash
npm run build
npm run bundle
npm run package
```

`npm run package` creates a `.streamDeckPlugin` installer when feasible. `npm run validate` requires the official Stream Deck CLI and checks the manifest/layout.

## Mocked tests

Vitest covers conversions, identity, serialized state, readback, and dial burst behavior. Test helpers must not execute mutation commands against physical devices.

## Live reads

Live status reads are allowed in development. Hardware mutations require explicit user permission and should be recorded in a manual compatibility matrix.
