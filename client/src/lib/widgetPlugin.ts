import { registerPlugin } from "@capacitor/core";

export interface WidgetNowPlaying {
  stageName: string;
  stageColor: string;
  artistName: string;
  timeLeft: string;
}

export interface WidgetSetInfo {
  artistName: string;
  stageName: string;
  stageColor: string;
  startTimeLabel: string;
}

export interface WidgetDataPayload {
  nextFavorite: WidgetSetInfo | null;
  nowPlaying: WidgetNowPlaying[];
  recommendation: WidgetSetInfo | null;
  updatedAt: string;
}

interface WidgetDataPlugin {
  updateWidgetData(options: { json: string }): Promise<void>;
}

export const WidgetData = registerPlugin<WidgetDataPlugin>("WidgetData", {
  web: {
    async updateWidgetData() {
      // no-op on web
    },
  },
});
