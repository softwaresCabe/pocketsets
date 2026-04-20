/**
 * Capacitor Local Notifications integration.
 *
 * - Requests permission once on first mount.
 * - Reschedules all upcoming-favorite notifications whenever favorites or
 *   settings change (called from NowProvider which already ticks the clock).
 * - Cancels stale notifications for sets that are no longer favorites or have
 *   already started.
 *
 * Notification IDs are deterministic integers derived from the set ID so we
 * can cancel/replace them without storing extra state.
 */

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { SetWithDetails } from "@shared/schema";

const IS_NATIVE = Capacitor.isNativePlatform();

function setIdToNotifId(setId: string): number {
  // Stable numeric ID: hash the string into a positive 32-bit int.
  let h = 0;
  for (let i = 0; i < setId.length; i++) {
    h = (Math.imul(31, h) + setId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!IS_NATIVE) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export function useScheduleNotifications(
  sets: SetWithDetails[] | undefined,
  nowMs: number,
  leadTimeMinutes: number,
  enabled: boolean,
) {
  const lastScheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!IS_NATIVE || !enabled || !sets) return;

    const favorites = sets.filter((s) => s.isFavorite && s.startTime);

    // IDs we want scheduled right now
    const desired = new Set<string>();
    const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

    for (const set of favorites) {
      const startMs = new Date(set.startTime!).getTime();
      const fireMs = startMs - leadTimeMinutes * 60_000;

      // Skip sets that have already fired or start in the past
      if (fireMs <= nowMs) continue;

      desired.add(set.id);

      // Only push if not already scheduled
      if (!lastScheduledRef.current.has(set.id)) {
        const stageName = set.stage?.name ?? "a stage";
        const title =
          leadTimeMinutes === 0
            ? `${set.artist.name} is on now`
            : `${set.artist.name} in ${leadTimeMinutes}m`;
        const body =
          leadTimeMinutes === 0
            ? `Live now at ${stageName}`
            : `Starting at ${stageName}`;

        toSchedule.push({
          id: setIdToNotifId(set.id),
          title,
          body,
          schedule: { at: new Date(fireMs) },
          sound: undefined,
          smallIcon: "ic_notification",
          extra: { setId: set.id },
        });
      }
    }

    // Cancel notifications for sets no longer in desired
    const toCancel = [...lastScheduledRef.current]
      .filter((id) => !desired.has(id))
      .map((id) => ({ id: setIdToNotifId(id) }));

    if (toCancel.length > 0) {
      LocalNotifications.cancel({ notifications: toCancel }).catch(() => {});
    }

    if (toSchedule.length > 0) {
      LocalNotifications.schedule({ notifications: toSchedule }).catch(() => {});
    }

    lastScheduledRef.current = desired;
  }, [sets, nowMs, leadTimeMinutes, enabled]);
}
