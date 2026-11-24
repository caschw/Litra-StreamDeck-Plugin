# Troubleshooting

## No readable lights

- Confirm the light is USB-connected and powered.
- Close Logitech software that may own or contend for the device.
- Grant macOS USB/access permission if the system requests it.
- Reconnect the USB cable and refresh the property inspector.

The helper may silently omit unreadable devices with exit status zero, so this means unavailable/unreadable, not definitely unplugged.

## Missing serial number

Use the exact `device_path` value. A path can change after reconnecting, so update the action after hardware changes.

## Stale or unavailable value

Check that the action remains visible. Visible controls poll every two seconds. A successful post-write readback is required before showing confirmed state.

## Helper launch failure

The plugin refuses to fall back to system `litra`. Verify the package contains the macOS universal, Windows x64, or Windows ARM64 helper asset for the host architecture.

## Logs

Redact serial numbers and device paths before sharing logs. Do not attach credentials or local settings.
