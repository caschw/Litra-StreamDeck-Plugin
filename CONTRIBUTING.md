# Contributing

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run validate
npm run verify:package
```

Use the pinned Litra binaries. Do not add a system Litra fallback or runtime download.

## Pull requests

Include the change type, test results, platform coverage, and hardware evidence. Never include serial numbers or device paths in logs or screenshots unless the contributor explicitly redacts them. Hardware-mutation tests require prior explicit permission.

## Reporting

Use GitHub issues for bugs and feature requests. Security reports should use the repository's GitHub private vulnerability reporting route described in [SECURITY.md](SECURITY.md).
