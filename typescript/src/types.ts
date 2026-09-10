export enum KeyboardKind {
  AK820 = "ak820",
  AK35I = "ak35i",
  F75_MAX = "f75_max",
}

export interface KeyboardFeatures {
  rgb: boolean;
  timeSync: boolean;
}

/**
 * Interface representing the connection to a keyboard.
 * This abstracts over WebHID or other HID implementations.
 */
export interface KeyboardDevice {
  /**
   * Writes data to the keyboard.
   * In hidapi, the first byte is typically the report ID.
   */
  write(data: Uint8Array): Promise<number>;

  /**
   * Reads data from the keyboard.
   * Returns the number of bytes read into the array.
   */
  read(data: Uint8Array): Promise<number>;
}
