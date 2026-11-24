# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Stream Deck users who connect Logitech Litra Glow, Beam, or Beam LX lights and want tactile local controls.

## Product Purpose

Provide confirmed on-screen and key-dial control of supported lights without a separately installed CLI or runtime.

## Positioning

One selected light per action; explicit power and numeric controls; dials show device-confirmed values and use native light ranges.

## Operating Context

macOS and Windows Stream Deck software, with USB-connected supported lights. Controls are local and operate without an internet connection at runtime.

## Capabilities and Constraints

- Supported: Glow, Beam, Beam LX front control and LX rear power/brightness.
- One selected device per action; no groups or RGB controls.
- Integer dial sensitivity 1-5 detents.
- Actual device state is read after writes and every visible control polls every two seconds.
- No optimistic state changes or runtime helper downloads.

## Product Principles

- Confirmed state is authoritative.
- Exact device targeting is preferred over model or first-device fallback.
- Pending, stale, unavailable, and error states remain visible and distinct.
- Native light limits and units take precedence over display rounding.
