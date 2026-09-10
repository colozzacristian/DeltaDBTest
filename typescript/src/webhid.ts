import { KeyboardDevice } from "./types.ts";

/**
 * Adapter to use WebHID API with the KeyboardDevice interface.
 */
export class WebHIDDevice implements KeyboardDevice {
  constructor(private device: HIDDevice) {}

  async write(data: Uint8Array): Promise<number> {
    // In hidapi, write() typically sends an output report where the first byte is the report ID.
    // If the first byte is 0, WebHID may expect reportId = 0.
    const reportId = data[0];
    const reportData = data.slice(1);

    // For feature reports, some keyboards might expect sendFeatureReport.
    // Based on the Rust implementation, Ak820 uses write() while F75/Ak35i use send_feature_report().
    // If you need sendFeatureReport, you may need a separate method or logic here,
    // or instantiate this adapter with a flag indicating the report type.
    await this.device.sendReport(reportId, reportData);
    return data.length;
  }

  async read(data: Uint8Array): Promise<number> {
    throw new Error(
      "WebHID read not fully implemented generically. Use receiveFeatureReport or input events.",
    );
  }
}

/**
 * Adapter specifically for keyboards that use Feature Reports (like F75 Max and Ak35i)
 */
export class WebHIDFeatureDevice implements KeyboardDevice {
  constructor(private device: HIDDevice) {}

  async write(data: Uint8Array): Promise<number> {
    const reportId = data[0];
    const reportData = data.slice(1);
    await this.device.sendFeatureReport(reportId, reportData);
    return data.length;
  }

  async read(data: Uint8Array): Promise<number> {
    // Read the first byte to get the report ID, if needed, or assume a fixed one.
    // The F75Max reads feature reports. The caller expects data to be populated.
    // We assume the caller passed an array that dictates the expected size.
    // In actual WebHID, receiveFeatureReport needs a report ID.
    // Since hidapi's get_feature_report expects the first byte of `data` to be the report ID:
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
