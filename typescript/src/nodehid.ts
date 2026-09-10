// deno-lint-ignore-file no-explicit-any
import HID from "npm:node-hid";
import { KeyboardDevice } from "./types.ts";

// ─── Open helpers ───────────────────────────────────────────────────────────────

/** Open a keyboard that uses standard Output Reports (AK820). */
export function openOutputDevice(path: string): NodeHIDOutputDevice {
  return new NodeHIDOutputDevice(new (HID as any).HID(path));
}

/** Open a keyboard that uses Feature Reports (AK35i, F75 Max). */
export function openFeatureDevice(path: string): NodeHIDFeatureDevice {
  return new NodeHIDFeatureDevice(new (HID as any).HID(path));
}

// ─── Adapters ───────────────────────────────────────────────────────────────────

/**
 * KeyboardDevice backed by node-hid for keyboards that use
 * standard Output Reports. AK820 sends via write(); the first byte is the
 * report ID, matching hidapi’s write() convention.
 */
export class NodeHIDOutputDevice implements KeyboardDevice {
  constructor(private hid: any) {}

  async write(data: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.hid.write(Array.from(data)));
      } catch (e) {
        reject(e);
      }
    });
  }

  async read(data: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const buf: Buffer = this.hid.readSync();
        if (buf) {
          data.set(buf.subarray(0, data.length));
          resolve(Math.min(buf.length, data.length));
        } else {
          resolve(0);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  close() {
    this.hid.close();
  }
}

/**
 * KeyboardDevice backed by node-hid for keyboards that use
 * Feature Reports. AK35i and F75 Max use sendFeatureReport / getFeatureReport.
 */
export class NodeHIDFeatureDevice implements KeyboardDevice {
  constructor(private hid: any) {}

  async write(data: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.hid.sendFeatureReport(Array.from(data));
        resolve(data.length);
      } catch (e) {
        reject(e);
      }
    });
  }

  async read(data: Uint8Array): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const reportId = data[0];
        const buf: Buffer = this.hid.getFeatureReport(reportId, data.length);
        data.set(buf.subarray(0, data.length));
        resolve(Math.min(buf.length, data.length));
      } catch (e) {
        reject(e);
      }
    });
  }

  close() {
    this.hid.close();
  }
}
