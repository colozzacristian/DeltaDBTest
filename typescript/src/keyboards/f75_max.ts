import { KeyboardKind, KeyboardFeatures } from "../types.ts";
import { Keyboard } from "./keyboard.ts";
import { Rgb, writeColorToFormat, writeEffectToFormat, writeBrightnessToFormat, writeSpeedToFormat, writeDirectionToFormat } from "../reports/rgb.ts";
import { TimeSync } from "../reports/time.ts";

export class F75Max extends Keyboard {
  readonly vendorId = 0x0c45;
  readonly productId = 0x800a;
  readonly usagePage = 0xff13;

  readonly features: KeyboardFeatures = {
    rgb: true,
    timeSync: true,
  };

  readonly manufacturer = "Aula";
  readonly name = "F75 Max";
  readonly kind = KeyboardKind.F75_MAX;
}

export type F75DataMessage = 
  | { type: "rgb", rgb: Rgb }
  | { type: "timeSync", timeSync: TimeSync };

enum F75ControlMessage {
  BeginCommunication = 0x18,
  EndCommunication = 0x02,
}

function constructControlMsg(kind: number): Uint8Array {
  const buf = new Uint8Array(65);
  buf[1] = 0x04;
  buf[2] = kind;
  return buf;
}

function constructPreDataMsg(kind: number): Uint8Array {
  const buf = constructControlMsg(kind);
  buf[9] = 0x01;
  return buf;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class F75CommunicationGuard {
  private temp = new Uint8Array(65);
  private closed = false;

  private constructor(private keyboard: Keyboard) {}

  static async create(keyboard: Keyboard): Promise<F75CommunicationGuard> {
    const guard = new F75CommunicationGuard(keyboard);
    await guard.keyboard.write(constructControlMsg(F75ControlMessage.BeginCommunication));
    await sleep(5);
    await guard.keyboard.read(guard.temp);
    await sleep(5);
    return guard;
  }

  async send(data: F75DataMessage): Promise<void> {
    if (this.closed) throw new Error("Guard closed");
    const buf = new Uint8Array(65);
    const kind = this.keyboard.kind;

    const pre = data.type === "rgb" ? 0x13 : 0x28;
    await this.keyboard.write(constructPreDataMsg(pre));
    await sleep(5);
    await this.keyboard.read(this.temp);
    await sleep(5);

    if (data.type === "rgb") {
      buf[15] = 0xAA;
      buf[16] = 0x55;
      const rgb = data.rgb;
      writeColorToFormat(rgb.color, kind, buf);
      writeEffectToFormat(rgb.effect, kind, buf);
      writeBrightnessToFormat(rgb.brightness, kind, buf);
      writeSpeedToFormat(rgb.speed, kind, buf);
      writeDirectionToFormat(rgb.direction, kind, buf);
    } else if (data.type === "timeSync") {
      buf[2] = 0x01;
      buf[3] = 0x5a;
      
      const dt = data.timeSync.dateTime;
      buf[4] = dt.getFullYear() % 100;
      buf[5] = dt.getDate();
      buf[6] = dt.getMonth() + 1; // JS months are 0-based
      buf[7] = dt.getHours();
      buf[8] = dt.getMinutes();
      buf[9] = dt.getSeconds();

      buf[63] = 0xaa;
      buf[64] = 0x55;
    }

    await this.keyboard.write(buf);
    await sleep(5);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.keyboard.write(constructControlMsg(F75ControlMessage.EndCommunication));
      await sleep(5);
      await this.keyboard.read(this.temp);
    } catch (e) {
      console.error("Error closing F75CommunicationGuard", e);
    }
  }
}
