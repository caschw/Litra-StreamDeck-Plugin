# Third-party notices

## litra-rs

This repository bundles binaries from the `timrogers/litra-rs` project, pinned to v3.3.0:

- `https://github.com/timrogers/litra-rs`
- `https://github.com/timrogers/litra-rs/releases/tag/v3.3.0`

The upstream project is MIT licensed: `https://github.com/timrogers/litra-rs/blob/main/LICENSE.md`.

Bundled assets:

| Asset | SHA-256 |
|---|---|
| macOS universal | `ded84a0a3dbba26d2932a7a17aee75f8e6d51260042af4e0071c7af145b4249c` |
| Windows x64 | `4024567efadd7fb54611a865be784012059e322221c0356150184dcb60283bdb` |
| Windows ARM64 | `8a6942cd6e69856037201ab13ab4b6923ab6b8b2363b4031b43e086bc207db6b` |

## Bundled JavaScript runtime dependencies

The standalone ESM entrypoint bundles these npm packages, all under the MIT license:

| Package | Locked version |
|---|---|
| `@elgato/streamdeck` | 3.0.4 |
| `@elgato/schemas` | 0.6.0 |
| `@elgato/utils` | 0.6.2 |
| `ws` | 8.23.0 |
| `zod` | 3.25.76 |

Full copyright and license texts are copied from the installed packages during the build to [`com.caschw.litra.sdPlugin/THIRD_PARTY_JAVASCRIPT_LICENSES.txt`](com.caschw.litra.sdPlugin/THIRD_PARTY_JAVASCRIPT_LICENSES.txt) and included in every installer. Native optional `ws` accelerators are disabled; Node builtins remain external and are supplied by Stream Deck.

Development-only tools (including esbuild, fflate, jsdom, Vitest and `@elgato/cli` 1.10.4) are not shipped. The npm lockfile records their dependency versions.
