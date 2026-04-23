import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: false,
    persistence: "localStorage",
    person_profiles: "never",
    disable_session_recording: true,
  });
  initialized = true;
}

export function trackTip(amountUsd: number): void {
  if (!initialized) return;
  posthog.capture("tip_completed", { amount_usd: amountUsd });
}
