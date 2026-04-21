import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useSets } from "./api";
import { useNow } from "./now";
import { relativeLabel } from "./time";
import { WidgetData, type WidgetDataPayload } from "./widgetPlugin";

const IS_NATIVE = Capacitor.isNativePlatform();

export function useWidgetData() {
  const { data: sets } = useSets();
  const { nowMs } = useNow(); // respects simulated/demo time from Settings
  const lastPayloadRef = useRef<string>("");

  useEffect(() => {
    if (!sets) return;

    const now = nowMs;

    const nowPlaying = sets.filter((s) => {
      if (!s.startTime || !s.endTime) return false;
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      return now >= start && now < end;
    });

    const favorites = sets.filter((s) => s.isFavorite);

    const nextFav =
      favorites
        .filter((s) => s.startTime && new Date(s.startTime).getTime() > now)
        .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())[0] ?? null;

    const threeHours = now + 3 * 60 * 60_000;
    const recommendation =
      sets
        .filter((s) => {
          if (s.isFavorite || !s.startTime) return false;
          const start = new Date(s.startTime).getTime();
          return start > now && start <= threeHours;
        })
        .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())[0] ?? null;

    const payload: WidgetDataPayload = {
      nextFavorite: nextFav
        ? {
            artistName: nextFav.artist.name,
            stageName: nextFav.stage.name,
            stageColor: nextFav.stage.color,
            startTimeLabel: relativeLabel(nextFav.startTime, nextFav.endTime, now).label,
          }
        : null,
      nowPlaying: nowPlaying.map((s) => ({
        stageName: s.stage.name,
        stageColor: s.stage.color,
        artistName: s.artist.name,
        timeLeft: relativeLabel(s.startTime, s.endTime, now).label,
      })),
      recommendation: recommendation
        ? {
            artistName: recommendation.artist.name,
            stageName: recommendation.stage.name,
            stageColor: recommendation.stage.color,
            startTimeLabel: relativeLabel(recommendation.startTime, recommendation.endTime, now).label,
          }
        : null,
      updatedAt: new Date(now).toISOString(),
    };

    const json = JSON.stringify(payload);
    if (json === lastPayloadRef.current) return;
    lastPayloadRef.current = json;

    if (IS_NATIVE) {
      WidgetData.updateWidgetData({ json }).catch((err) => {
        console.error("[WidgetData] plugin call failed:", err);
      });
    }
  }, [sets, nowMs]);
}
