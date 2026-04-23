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

// Fixed notification ID for the last-day review/tip prompt (cannot collide with
// set-based IDs because those are hashed from UUID strings, which always produce
// values far below this sentinel).
const LAST_DAY_NOTIF_ID = 9_800_001;
// May 17 2026 at 5 PM PT — before the Sunday headliners kick off.
const LAST_DAY_NOTIF_AT = new Date("2026-05-17T17:00:00-07:00");

function setIdToNotifId(setId: string): number {
  // Stable numeric ID: hash the string into a positive 32-bit int.
  let h = 0;
  for (let i = 0; i < setId.length; i++) {
    h = (Math.imul(31, h) + setId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Schedules the one-time last-day review/tip nudge for May 17 2026 at 5 PM PT.
 * Safe to call on every app launch — cancels and reschedules only if the fire
 * time is still in the future.
 */
export async function scheduleLastDayNotification(): Promise<void> {
  if (!IS_NATIVE) return;
  if (LAST_DAY_NOTIF_AT.getTime() <= Date.now()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: LAST_DAY_NOTIF_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: LAST_DAY_NOTIF_ID,
          title: "Last day of EDC — how's your weekend? 🎉",
          body: "Loving PocketSets? Leave a quick review or drop a tip from Settings!",
          schedule: { at: LAST_DAY_NOTIF_AT },
          smallIcon: "ic_notification",
        },
      ],
    });
  } catch {
    // Non-fatal — notification is a nice-to-have.
  }
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
    const toCancel = Array.from(lastScheduledRef.current)
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
