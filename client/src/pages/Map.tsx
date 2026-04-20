import * as React from "react";
import { Link } from "wouter";
import { useStages } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

/**
 * Illustrative festival map. The 8 stages are placed at fixed relative
 * coordinates on an SVG canvas; the user can pan and zoom. Not to scale.
 */

type StagePos = { id: string; x: number; y: number; r: number };
const STAGE_POS: StagePos[] = [
  { id: "kinetic-field", x: 500, y: 260, r: 70 }, // mothership — center north
  { id: "basspod", x: 760, y: 360, r: 50 },
  { id: "circuit-grounds", x: 240, y: 360, r: 60 },
  { id: "neon-garden", x: 640, y: 500, r: 45 },
  { id: "cosmic-meadow", x: 360, y: 500, r: 50 },
  { id: "wasteland", x: 860, y: 560, r: 42 },
  { id: "stereo-bloom", x: 140, y: 560, r: 40 },
  { id: "quantum-valley", x: 500, y: 640, r: 42 },
];

export default function MapPage() {
  const { data: stages, isLoading } = useStages();
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const dragging = React.useRef<{ x: number; y: number } | null>(null);

  if (isLoading || !stages) {
    return (
      <Shell>
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </Shell>
    );
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  };
  const onMouseUp = () => {
    dragging.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.5, s - e.deltaY * 0.0015)));
  };

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Stages illustrated to relative position — not to scale. Drag to pan, scroll to zoom.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setScale(1);
            setTx(0);
            setTy(0);
          }}
          data-testid="button-reset-map"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
        </Button>
        <span className="ml-auto text-xs text-muted-foreground tabular">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        className="mt-3 relative overflow-hidden rounded-2xl border border-border bg-card/40"
        style={{ height: "min(72vh, 640px)", touchAction: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-radial-purple opacity-40" aria-hidden />
        <svg
          viewBox="0 0 1000 800"
          className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging.current ? "none" : "transform 120ms ease-out",
          }}
        >
          {/* Speedway outline */}
          <path
            d="M 100 420 Q 100 150 500 150 Q 900 150 900 420 Q 900 720 500 720 Q 100 720 100 420 Z"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <text
            x="500"
            y="100"
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
            style={{ fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}
          >
            Las Vegas Motor Speedway
          </text>

          {/* Stages */}
          {STAGE_POS.map((pos) => {
            const stage = stages.find((s) => s.id === pos.id);
            if (!stage) return null;
            return (
              <g key={stage.id} data-testid={`map-stage-${stage.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.r + 6}
                  fill={stage.color}
                  opacity={0.15}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.r}
                  fill={stage.color}
                  opacity={0.35}
                  stroke={stage.color}
                  strokeWidth={2}
                />
                <text
                  x={pos.x}
                  y={pos.y - 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={13}
                  fontWeight={600}
                >
                  {stage.name}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize={10}
                  opacity={0.8}
                  style={{ letterSpacing: 1.5, textTransform: "uppercase" }}
                >
                  {stage.shortCode}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Legend
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s) => (
            <li key={s.id}>
              <Link className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-xs hover-elevate" href={`/stages/${s.id}`} data-testid={`legend-${s.id}`}>
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto text-muted-foreground">{s.shortCode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        EDC Las Vegas 2026
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Map</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
