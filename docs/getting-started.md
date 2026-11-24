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
3. Explicitly select a readable light in the picker. No light is selected automatically. Missing or duplicate serials use an exact device path.
4. Choose the front/rear property and operation.
5. Set brightness/temperature presets or 1-5 steps per detent for dial sensitivity. Temperature steps are 100 K; brightness steps are percentage points.
6. Choose **Save settings** to apply, or **Cancel** to restore the saved configuration. Refresh lights reads the selected light's current value and range without changing unsaved edits.

Missing serials require path targeting. A missing selected light is not necessarily unplugged; the helper may omit unreadable devices.
Rear controls are disabled for lights without an LX rear side. An unavailable saved selection is retained, never silently replaced by another light.

## State feedback

- ON/OFF uses confirmed power state.
- Pending displays a pending label, not a requested or assumed value.
- Error/Unavailable uses an error icon and alert.
- Visible actions refresh every two seconds.

Physical or other-app changes appear after the next completed poll. 0% front brightness is native minimum brightness, not Off.
