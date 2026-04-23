import { useSettings } from "@/lib/api";
import { useUpdateSetting, useResetDemo } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun, RotateCcw, Clock, Bell, Wand2, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { TipJar } from "@/components/TipJar";

const LEAD_TIMES = [
  { value: "0", label: "At start time" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "45", label: "45 minutes before" },
  { value: "60", label: "1 hour before" },
];

// Preset simulated times so a demo user can instantly preview "during festival" state
const SIM_PRESETS = [
  { label: "Live (real time)", value: "" },
  { label: "Day 1 · 9:00 PM", value: "2026-05-15T21:00:00-07:00" },
  { label: "Day 1 · 11:30 PM", value: "2026-05-15T23:30:00-07:00" },
  { label: "Day 1 · 1:00 AM", value: "2026-05-16T01:00:00-07:00" },
  { label: "Day 2 · 10:30 PM", value: "2026-05-16T22:30:00-07:00" },
  { label: "Day 2 · 2:30 AM", value: "2026-05-17T02:30:00-07:00" },
];

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const resetDemo = useResetDemo();
  const { toast } = useToast();

  const leadTime = settings?.defaultLeadTimeMinutes ?? "10";
  const nowPlayingEnabled = (settings?.nowPlayingNotifications ?? "true") === "true";
  const simulatedTime = settings?.simulatedTime ?? "";
  const [simInput, setSimInput] = useState(simulatedTime);

  useEffect(() => {
    setSimInput(simulatedTime);
  }, [simulatedTime]);

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  };

  const setLead = (val: string) => {
    updateSetting.mutate(
      { key: "defaultLeadTimeMinutes", value: val },
      {
        onSuccess: () => {
          toast({ title: "Lead time updated", description: `Reminders ${val} min before` });
        },
      },
    );
  };

  const toggleNowPlaying = (checked: boolean) => {
    updateSetting.mutate({
      key: "nowPlayingNotifications",
      value: checked ? "true" : "false",
    });
  };

  const applySimulatedTime = (val: string) => {
    updateSetting.mutate(
      { key: "simulatedTime", value: val },
      {
        onSuccess: () => {
          toast({
            title: val ? "Simulated time set" : "Simulated time cleared",
            description: val
              ? "Home screen now shows that moment"
              : "Back to real time",
          });
        },
      },
    );
  };

  const handleReset = () => {
    resetDemo.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Demo reset",
          description: "Favorites cleared and simulated time removed",
        });
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6 lg:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Tune reminders, preview festival moments, and manage your demo state.
        </p>
      </header>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </CardTitle>
          <CardDescription>Dark mode is designed for after-dark use at the festival.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme-toggle" className="text-sm">
                Dark mode
              </Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
            </div>
            <Switch
              id="theme-toggle"
              checked={isDark}
              onCheckedChange={toggleTheme}
              data-testid="switch-theme"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Reminders
          </CardTitle>
          <CardDescription>
            Default lead time used for every favorite. You can still override per-set from any set page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm">
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              Default lead time
            </Label>
            <Select
              value={leadTime}
              onValueChange={setLead}
              disabled={isLoading || updateSetting.isPending}
            >
              <SelectTrigger data-testid="select-lead-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_TIMES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {lt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="now-playing" className="text-sm">
                Now-playing alerts
              </Label>
              <p className="text-xs text-muted-foreground">
                Surface a banner on the home screen when one of your favorites just started.
              </p>
            </div>
            <Switch
              id="now-playing"
              checked={nowPlayingEnabled}
              onCheckedChange={toggleNowPlaying}
              data-testid="switch-now-playing"
            />
          </div>
        </CardContent>
      </Card>

      {/* Simulated time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4" />
            Simulated time
          </CardTitle>
          <CardDescription>
            Jump the app clock to any moment during EDC 2026 to preview the live schedule experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Quick presets</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SIM_PRESETS.map((p) => {
                const active = simulatedTime === p.value;
                return (
                  <Button
                    key={p.label}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-xs"
                    onClick={() => applySimulatedTime(p.value)}
                    data-testid={`button-sim-preset-${p.label.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-time" className="text-sm">
              Custom ISO time
            </Label>
            <div className="flex gap-2">
              <Input
                id="sim-time"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="2026-05-16T22:30:00-07:00"
                className="font-mono text-xs"
                data-testid="input-sim-time"
              />
              <Button
                variant="outline"
                onClick={() => applySimulatedTime(simInput)}
                disabled={simInput === simulatedTime}
                data-testid="button-apply-sim"
              >
                Apply
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Include a timezone offset. Festival runs on Pacific time (−07:00).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tip jar */}
      <TipJar />

      {/* About / Disclaimer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About PocketSets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            PocketSets is an <span className="font-medium text-foreground">unofficial fan-made app</span> and
            is not affiliated with, endorsed by, or connected to Insomniac Events or EDC Las Vegas in any way.
          </p>
          <p>
            Artist names, stage names, and schedule information are used for fan reference purposes only.
            All trademarks and copyrights belong to their respective owners.
          </p>
          <p className="text-xs">
            For the official EDC Las Vegas experience, visit{" "}
            <span className="font-medium text-foreground">edclasvegas.com</span>.
          </p>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4" />
            Reset demo state
          </CardTitle>
          <CardDescription>
            Remove every favorite and clear the simulated time. The festival data itself is untouched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-reset-demo">
                Reset everything
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo state?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears your favorites and any simulated time. This action can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  data-testid="button-confirm-reset"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
