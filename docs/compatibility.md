# Compatibility

## Intended baseline

| Platform | Intended support | Verified status |
|---|---|---|
| macOS 13+ | Universal helper | Live Glow read verified; mutation pending permission |
| Windows 10+ x64 | x64 helper | Not hardware verified |
| Windows 10+ ARM64 | ARM64 helper | Not hardware verified |
| Stream Deck 7.1+ | Official SDK | Package validation available |

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
