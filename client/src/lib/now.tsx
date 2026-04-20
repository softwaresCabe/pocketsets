import * as React from "react";
import { useSettings } from "./api";

/**
 * Global "now" clock. Ticks once per second. If a demo simulated time is set
 * via settings, we return that instead — useful for previewing the Now view
 * before/during/after the festival without time travel.
 */
type NowContext = {
  nowMs: number;
  isSimulated: boolean;
};

const Ctx = React.createContext<NowContext>({ nowMs: Date.now(), isSimulated: false });

export function NowProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const simulatedIso = settings?.simulatedTime ?? "";
  const [realNow, setRealNow] = React.useState(() => Date.now());
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setRealNow(Date.now());
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const value = React.useMemo(() => {
    if (simulatedIso) {
      const base = new Date(simulatedIso).getTime();
      // Once simulated, also advance by tick so countdowns feel alive
      return { nowMs: base + tick * 1000, isSimulated: true };
    }
    return { nowMs: realNow, isSimulated: false };
  }, [simulatedIso, realNow, tick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNow() {
  return React.useContext(Ctx);
}
