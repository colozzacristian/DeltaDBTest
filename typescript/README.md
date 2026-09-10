# @openajazz/jazztastic (TypeScript Port)

This is a TypeScript port of the `jazztastic` core logic from `openajazz`. It is
intended to be used in Deno desktop frontends (e.g. Tauri, Electron, or Deno +
WebHID) to control AJAZZ keyboards.

## Deno Desktop App

This project also includes an example Deno Desktop GUI (`app.ts`).

### Running

```bash
deno task dev
```

### Building

```bash
deno task build
```

## Library Usage

```typescript
import {
  Brightness,
  createKeyboard,
  Direction,
  Effect,
  Speed,
  writeRgbInto,
  writeTimeSyncInto,
} from "./src/index.ts";
import { WebHIDDevice, WebHIDFeatureDevice } from "./src/webhid.ts";

// 1. Get a HID device from the environment (e.g. navigator.hid.requestDevice)
const devices = await navigator.hid.requestDevice({
  filters: [{ vendorId: 0x0c45, productId: 0x800a }],
});
const rawDevice = devices[0];
await rawDevice.open();

// 2. Wrap it with the appropriate adapter
// For Ak35i and F75 Max, feature reports are used. For Ak820, use WebHIDDevice.
const deviceAdapter = new WebHIDFeatureDevice(rawDevice);

// 3. Create the keyboard instance
const keyboard = createKeyboard(
  rawDevice.vendorId,
  rawDevice.productId,
  rawDevice.collections[0].usagePage,
  deviceAdapter,
);

if (keyboard) {
  // Set RGB
  await writeRgbInto({
    color: { type: "rgb", r: 255, g: 0, b: 0 },
    effect: Effect.Static,
    brightness: Brightness.Highest,
    speed: Speed.Medium,
    direction: Direction.LeftToRight,
  }, keyboard);

  // Sync Time
  if (keyboard.features.timeSync) {
    await writeTimeSyncInto({ dateTime: new Date() }, keyboard);
  }
}
```

## Structure

- `src/types.ts`: Base typings and `KeyboardDevice` interface.
- `src/keyboards/`: Per-keyboard definitions.
- `src/reports/`: Serialization formats for data reports (RGB, Time).
- `src/webhid.ts`: Utility adapters to use WebHID API with the `KeyboardDevice`
  interface.
