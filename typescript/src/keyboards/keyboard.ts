import { KeyboardDevice, KeyboardFeatures, KeyboardKind } from "../types.ts";

export abstract class Keyboard {
  abstract readonly vendorId: number;
  abstract readonly productId: number;
  abstract readonly usagePage: number;

  abstract readonly features: KeyboardFeatures;
  abstract readonly manufacturer: string;
  abstract readonly name: string;
  abstract readonly kind: KeyboardKind;

  constructor(protected device: KeyboardDevice) {}

  getDevice(): KeyboardDevice {
    return this.device;
  }

  async read(buf: Uint8Array): Promise<number> {
    return await this.device.read(buf);
  }

  async write(buf: Uint8Array): Promise<number> {
    return await this.device.write(buf);
  }
}
