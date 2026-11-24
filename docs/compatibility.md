# Compatibility

## Intended baseline

| Platform | Intended support | Verified status |
|---|---|---|
| macOS 13+ | Universal helper | Local extracted-installer registration/action smoke with Node 24; earlier live Glow read; mutation pending permission |
| Windows 10+ x64 | x64 helper | Bundled hash verified locally; Windows runtime/install and hardware checks pending a local Windows host |
| Windows 10+ ARM64 | ARM64 helper | Bundled hash verified locally; Windows runtime/install and hardware checks pending a local Windows host |
| Stream Deck 7.1+ | Official SDK | Local manifest/package validation and mock-host smoke; real install pending |

## Models

| Model | Intended controls | Hardware verified |
|---|---|---|
| Glow | Front power, brightness, temperature | Earlier live read verified; not currently readable |
| Beam | Front power, brightness, temperature | No |
| Beam LX | Front plus rear power/brightness | No |

## Explicit gaps

- No stable installer release is published.
- Windows/macOS hardware mutation testing is incomplete.
- Upstream does not expose a concrete RGB getter, so there are no RGB controls.
- Logitech software contention is not formally tested.
- All build/test/package verification is local-only; unavailable platform evidence remains pending, not a hosted-runner requirement.
