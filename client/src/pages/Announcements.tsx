import { useAnnouncements } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Info, Megaphone } from "lucide-react";
import { formatDayTimePT } from "@/lib/time";
import type { Announcement } from "@shared/schema";

function severityMeta(s: Announcement["severity"]) {
  if (s === "alert") {
    return {
      Icon: AlertTriangle,
      label: "Alert",
      badge: "bg-destructive/15 text-destructive border-destructive/40",
      accent: "border-l-destructive",
    };
  }
  if (s === "warning") {
    return {
      Icon: AlertTriangle,
      label: "Warning",
      badge: "bg-amber-500/15 text-amber-500 border-amber-500/40",
      accent: "border-l-amber-500",
    };
  }
  return {
    Icon: Info,
    label: "Info",
    badge: "bg-primary/15 text-primary border-primary/40",
    accent: "border-l-primary",
  };
}

export default function Announcements() {
  const { data, isLoading, isError } = useAnnouncements();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
            data-testid="text-announcements-title"
          >
            <Megaphone className="h-5 w-5 text-primary" />
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Weather, schedule changes, and operational updates from the festival.
          </p>
        </div>
        {data && data.length > 0 && (
          <Badge variant="secondary" data-testid="badge-announcement-count">
            {data.length}
          </Badge>
        )}
      </header>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Couldn't load announcements. Check your connection and try again.
          </CardContent>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No announcements yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              You'll see weather updates, schedule changes, and safety alerts here once the festival starts.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((a) => {
            const meta = severityMeta(a.severity);
            const { Icon } = meta;
            return (
              <Card
                key={a.id}
                className={`border-l-4 ${meta.accent}`}
                data-testid={`card-announcement-${a.id}`}
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <h3 className="text-sm font-semibold">{a.title}</h3>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                  <p className="text-xs text-muted-foreground/70">
                    Posted {formatDayTimePT(a.publishedAt)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
