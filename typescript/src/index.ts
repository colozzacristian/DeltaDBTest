export * from "./types.ts";
export * from "./keyboards/keyboard.ts";
export * from "./keyboards/ak820.ts";
export * from "./keyboards/ak35i.ts";
export * from "./keyboards/f75_max.ts";
export * from "./reports/rgb.ts";
export * from "./reports/time.ts";
export * from "./webhid.ts";

import { Ak820 } from "./keyboards/ak820.ts";
import { Ak35i } from "./keyboards/ak35i.ts";
import { F75Max } from "./keyboards/f75_max.ts";
import { KeyboardDevice } from "./types.ts";
import { Keyboard } from "./keyboards/keyboard.ts";

export function createKeyboard(vendorId: number, productId: number, usagePage: number, device: KeyboardDevice): Keyboard | null {
  if (vendorId === 0x320f && productId === 0x505b && usagePage === 0xff1c) {
    return new Ak820(device);
  }
  if (vendorId === 0x0c45 && productId === 0x8009 && usagePage === 0xff13) {
    return new Ak35i(device);
  }
  if (vendorId === 0x0c45 && productId === 0x800a && usagePage === 0xff13) {
    return new F75Max(device);
  }
  return null;
}
