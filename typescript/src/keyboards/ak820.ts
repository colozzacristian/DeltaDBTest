import { KeyboardFeatures, KeyboardKind } from "../types.ts";
import { Keyboard } from "./keyboard.ts";
import { Rgb, writeRgbInto } from "../reports/rgb.ts";

export class Ak820 extends Keyboard {
  readonly vendorId = 0x320F;
  readonly productId = 0x505B;
  readonly usagePage = 0xFF1C;

  readonly features: KeyboardFeatures = {
    rgb: true,
    timeSync: false,
  };

  readonly manufacturer = "AJAZZ";
  readonly name = "AK820";
  readonly kind = KeyboardKind.AK820;

  async setRgb(rgb: Rgb): Promise<void> {
    await writeRgbInto(rgb, this);
  }
}
