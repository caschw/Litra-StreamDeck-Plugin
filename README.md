# Litra for Stream Deck

Control Logitech Litra lights directly from Stream Deck with tactile keys and dials. This plugin shows confirmed device state, updates power icons after real readback, and supports independent actions for each selected light.

**Current status:** source and developer package are Unreleased. No stable installer or Marketplace release is published yet. The Mac live read fixture has been exercised, while Windows and Beam/LX hardware checks remain pending.

## Supported controls

- Litra Glow, Beam, and Beam LX front controls
- Beam LX rear power and rear brightness
- Explicit front/rear On, Off, and Toggle keys
- Brightness and temperature numeric Set/Increase/Decrease keys
- Front brightness, front temperature, and LX rear brightness dials
- Configurable dial sensitivity from 1 to 5 detents

There are no RGB color actions: the upstream helper does not expose an actual color getter.

## Install

1. Use Stream Deck 7.1 or later on macOS 13+ or Windows 10+.
2. Install and connect a supported Logitech Litra light.
3. Add a Litra key or dial in Stream Deck.
4. Select an exact serial number. For a light that does not expose a serial, select its exact device path.
5. Configure the property, operation, preset, and dial sensitivity.

When an installer release exists, download the `.streamDeckPlugin` artifact from GitHub Releases and open it with Stream Deck. Until then, use the developer build instructions in [docs/development.md](docs/development.md).

No end-user Node.js, Rust/Cargo, Homebrew, or standalone Litra CLI installation is required.

## Examples

- A power key set to **Toggle** displays ON or OFF from confirmed device state.
- A numeric brightness key set to **Set** and preset `50` writes 50% of the device's native lumen range.
- A temperature dial set to sensitivity `3` adds or subtracts 300 K per detent. Sensitivity is a step size per detent (1-5), not a dial burst count.
- A Beam LX rear brightness dial reports 1-100% and press toggles rear power.

Front 0% is the native minimum brightness, not the Off state. `Off` is controlled separately. Values remain pending or unavailable until a successful post-write readback confirms them.

## Honesty and verification

The live read of a pinned macOS universal helper succeeded with a Glow. This source does not claim Windows, Beam, or Beam LX hardware verification. Mocked tests cover state and conversion logic; only explicit hardware permission enables mutation tests.

## Documentation

- [Getting started](docs/getting-started.md)
- [Development](docs/development.md)
- [Architecture](docs/architecture.md)
- [Compatibility](docs/compatibility.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License](LICENSE)

This project is not affiliated with or endorsed by Logitech or Elgato.
