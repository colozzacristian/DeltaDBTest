import { KeyboardKind } from "../types.ts";
import { Keyboard } from "../keyboards/keyboard.ts";
import { F75CommunicationGuard } from "../keyboards/f75_max.ts";

export interface TimeSync {
  dateTime: Date;
}

export async function writeTimeSyncInto(
  timeSync: TimeSync,
  keyboard: Keyboard,
): Promise<void> {
  const kind = keyboard.kind;

  if (kind === KeyboardKind.AK35I || kind === KeyboardKind.F75_MAX) {
    const guard = await F75CommunicationGuard.create(keyboard);
    await guard.send({ type: "timeSync", timeSync });
    await guard.close();
  } else {
    throw new Error(
      "no implementation available for time sync for your keyboard",
    );
  }
}
