import { KeyboardKind, KeyboardFeatures } from "../types.ts";
import { Keyboard } from "./keyboard.ts";

export class Ak35i extends Keyboard {
  readonly vendorId = 0x0c45;
  readonly productId = 0x8009;
  readonly usagePage = 0xff13;

  readonly features: KeyboardFeatures = {
    rgb: true,
    timeSync: true,
  };

  readonly manufacturer = "AJAZZ";
  readonly name = "AK35I";
  readonly kind = KeyboardKind.AK35I;
}
