import { KeyboardKind } from "../types.ts";
import { Keyboard } from "../keyboards/keyboard.ts";
import { F75CommunicationGuard } from "../keyboards/f75_max.ts";

export type Color = { type: "rgb", r: number, g: number, b: number } | { type: "rainbow" };

export function writeColorToFormat(color: Color, kind: KeyboardKind, buf: Uint8Array) {
    if (kind === KeyboardKind.AK820) {
        if (color.type === "rgb") {
            buf[14] = color.r;
            buf[15] = color.g;
            buf[16] = color.b;
        } else {
            buf[13] = 0x01;
        }
    } else if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        if (color.type === "rgb") {
            buf[2] = color.r;
            buf[3] = color.g;
            buf[4] = color.b;
        } else {
            throw new Error("rainbow color not supported for Ak35i / F75Max");
        }
    } else {
        throw new Error(`unsupported keyboard kind for color: ${kind}`);
    }
}

export enum Effect {
    Static = "static",

    // AK820
    Corrugated = "corrugated",
    Cloud = "cloud",
    Serpentine = "serpentine",
    Spectrum = "spectrum",
    Breath = "breath",
    Reaction = "reaction",
    Ripples = "ripples",
    Traverse = "traverse",
    Stars = "stars",
    Flowers = "flowers",
    Roll = "roll",
    Wave = "wave",
    Cartoon = "cartoon",
    Rain = "rain",
    Scan = "scan",
    Surmount = "surmount",
    Speed = "speed",

    // AK35i / F75Max
    Glittering = "glittering",
    Falling = "falling",
    Colourful = "colourful",
    Outward = "outward",
    Scrolling = "scrolling",
    Rolling = "rolling",
    Rotating = "rotating",
    Explode = "explode",
    Launch = "launch",
    Flowing = "flowing",
    Pulsating = "pulsating",
    Tilt = "tilt",
    Shuttle = "shuttle"
}

export function effectToU8(effect: Effect, kind: KeyboardKind): number | undefined {
    if (kind === KeyboardKind.AK820) {
        switch (effect) {
            case Effect.Static: return 5;
            case Effect.Corrugated: return 1;
            case Effect.Cloud: return 2;
            case Effect.Serpentine: return 3;
            case Effect.Spectrum: return 4;
            case Effect.Breath: return 5;
            case Effect.Reaction: return 7;
            case Effect.Ripples: return 8;
            case Effect.Traverse: return 9;
            case Effect.Stars: return 10;
            case Effect.Flowers: return 11;
            case Effect.Roll: return 12;
            case Effect.Wave: return 13;
            case Effect.Cartoon: return 14;
            case Effect.Rain: return 15;
            case Effect.Scan: return 16;
            case Effect.Surmount: return 17;
            case Effect.Speed: return 18;
            default: return undefined;
        }
    } else if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        switch (effect) {
            case Effect.Static: return 1;
            case Effect.Glittering: return 4;
            case Effect.Falling: return 5;
            case Effect.Colourful: return 6;
            case Effect.Breath: return 7;
            case Effect.Spectrum: return 8;
            case Effect.Outward: return 9;
            case Effect.Scrolling: return 10;
            case Effect.Rolling: return 11;
            case Effect.Rotating: return 12;
            case Effect.Explode: return 13;
            case Effect.Launch: return 14;
            case Effect.Ripples: return 15;
            case Effect.Flowing: return 16;
            case Effect.Pulsating: return 17;
            case Effect.Tilt: return 18;
            case Effect.Shuttle: return 19;
            default: return undefined;
        }
    }
    return undefined;
}

export function writeEffectToFormat(effect: Effect, kind: KeyboardKind, buf: Uint8Array) {
    const effectU8 = effectToU8(effect, kind);
    if (effectU8 === undefined) {
        console.warn(`unsupported effect ${effect} for keyboard kind ${kind}`);
        return;
    }

    if (kind === KeyboardKind.AK820) {
        buf[9] = effectU8;
    } else if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        buf[1] = effectU8;
    } else {
        throw new Error("unsupported keyboard kind for effect");
    }
}

export enum Brightness {
    Lowest = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Highest = 4
}

export function writeBrightnessToFormat(brightness: Brightness, kind: KeyboardKind, buf: Uint8Array) {
    if (kind === KeyboardKind.AK820 || kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        buf[10] = brightness as number;
    } else {
        throw new Error("unsupported keyboard kind for brightness");
    }
}

export enum Speed {
    Fastest = 0,
    Fast = 1,
    Medium = 2,
    Slow = 3,
    Slowest = 4
}

export function writeSpeedToFormat(speed: Speed, kind: KeyboardKind, buf: Uint8Array) {
    if (kind === KeyboardKind.AK820) {
        buf[11] = speed as number;
    } else if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        buf[11] = 4 - (speed as number);
    } else {
        throw new Error("unsupported keyboard kind for speed");
    }
}

export enum Direction {
    LeftToRight = 0,
    RightToLeft = 1
}

export function writeDirectionToFormat(direction: Direction, kind: KeyboardKind, buf: Uint8Array) {
    if (kind === KeyboardKind.AK820 || kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        buf[12] = direction as number;
    } else {
        throw new Error("unsupported keyboard kind for direction");
    }
}

export interface Rgb {
    color: Color;
    effect: Effect;
    speed: Speed;
    brightness: Brightness;
    direction: Direction;
}

export async function writeRgbInto(rgb: Rgb, keyboard: Keyboard): Promise<void> {
    const kind = keyboard.kind;
    const buf = new Uint8Array(65);

    writeColorToFormat(rgb.color, kind, buf);
    writeEffectToFormat(rgb.effect, kind, buf);
    writeBrightnessToFormat(rgb.brightness, kind, buf);
    writeSpeedToFormat(rgb.speed, kind, buf);
    writeDirectionToFormat(rgb.direction, kind, buf);

    if (kind === KeyboardKind.AK820) {
        buf[0] = 0x04;
        buf[1] = 0x2A;
        buf[2] = 0x3D;
        buf[3] = 0x06;
        buf[4] = 0x1d;

        await keyboard.write(buf);
    } else if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
        const guard = await F75CommunicationGuard.create(keyboard);
        await guard.send({ type: "rgb", rgb });
        await guard.close();
    } else {
        throw new Error("unknown keyboard kind for RGB report");
    }
}
