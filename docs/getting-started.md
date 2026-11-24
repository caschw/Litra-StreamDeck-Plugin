# Getting started

## Requirements

- Stream Deck 7.1 or later
- macOS 13+ or Windows 10+
- A readable supported USB light
- Stream Deck dial hardware for dial actions

The plugin bundles litra-rs and Stream Deck supplies Node.js. Do not install or update a separate Litra CLI.

## Add an action

1. Add a Litra Power, Numeric, or Dial action.
2. Open the property inspector.
3. Enter the exact serial number, or the exact path for a device that has no serial.
4. Choose the front/rear property and operation.
5. Set brightness/temperature presets or 1-5 dial sensitivity.

Missing serials require path targeting. A missing selected light is not necessarily unplugged; the helper may omit unreadable devices.

## State feedback

- ON/OFF uses confirmed power state.
- Pending displays a pending label, not a requested or assumed value.
- Error/Unavailable uses an error icon and alert.
- Visible actions refresh every two seconds.

Physical or other-app changes appear after the next completed poll. 0% front brightness is native minimum brightness, not Off.
