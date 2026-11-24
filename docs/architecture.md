# Architecture

## State and targeting

`LitraState` serializes all helper I/O in one queue. Visible controls share one polling loop at two-second intervals. Settings and action context generation protect stale results.

Selection is exact: a serial number is preferred when available; otherwise the explicit USB device path is required. Duplicate serial numbers are rejected.

## Transactions

Every mutation performs:

1. Fresh `devices --json` read.
2. Exact device selection.
3. One absolute targeted write.
4. Delayed bounded readback.
5. Fan-out of confirmed state to matching controls.

After a write failure, the plugin attempts safe readback because the helper may have applied the write before reporting another error. It never replay-amicks ambiguous writes.

## Units

Front brightness is mapped through the native lumen range. 0% means minimum native lumens, and 100% means maximum native lumens.

Temperature values are quantized to 100 K and clamped to native minimum/maximum. Rear brightness is 1-100% and has separate power state.

## Feedback

Key icons and titles represent only confirmed state. Dials render confirmed values plus power state. Pending, unavailable, stale, and error states remain distinct.
