import { KeyboardDevice } from "./types.ts";

/**
 * Minimal interface reflecting standard WebHID API `HIDDevice`.
 * This avoids dependency on specific DOM libraries that might not include WebHID.
 */
export interface WebHIDDeviceNative {
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

/**
 * Adapter to use WebHID API with the KeyboardDevice interface.
 */
export class WebHIDDevice implements KeyboardDevice {
  constructor(private device: WebHIDDeviceNative) {}

  async write(data: Uint8Array): Promise<number> {
    const reportId = data[0];
    const reportData = data.slice(1);
    await this.device.sendReport(reportId, reportData);
    return data.length;
  }

  async read(_data: Uint8Array): Promise<number> {
    throw new Error(
      "WebHID read not fully implemented generically. Use receiveFeatureReport or input events.",
    );
  }
}

/**
 * Adapter specifically for keyboards that use Feature Reports (like F75 Max and Ak35i)
 */
export class WebHIDFeatureDevice implements KeyboardDevice {
  constructor(private device: WebHIDDeviceNative) {}

  async write(data: Uint8Array): Promise<number> {
    const reportId = data[0];
    const reportData = data.slice(1);
    await this.device.sendFeatureReport(reportId, reportData);
    return data.length;
  }

  async read(data: Uint8Array): Promise<number> {
    const reportId = data[0];
    const view = await this.device.receiveFeatureReport(reportId);
    const result = new Uint8Array(
      view.buffer,
      view.byteOffset,
      view.byteLength,
    );

    data.set(result, 1);
    return result.length + 1;
  }
}
