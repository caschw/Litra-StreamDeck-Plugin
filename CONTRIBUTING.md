# Contributing

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run validate
npm run verify:package
npm run package -- --force
npm run test:installer
```

Use the pinned Litra binaries. Do not add a system Litra fallback or runtime download.
Build, test, validate, and package locally only. Do not add GitHub Actions workflows, enable hosted runners, or configure paid automation. Record unavailable local platform/hardware checks as pending.

## Pull requests

Include the change type, test results, platform coverage, and hardware evidence. Never include serial numbers or device paths in logs or screenshots unless the contributor explicitly redacts them. Hardware-mutation tests require prior explicit permission.

## Reporting

Use GitHub issues for bugs and feature requests. Security reports should use the repository's GitHub private vulnerability reporting route described in [SECURITY.md](SECURITY.md).
