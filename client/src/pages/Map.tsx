import * as React from "react";

export default function MapPage() {
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const dragging = React.useRef<{ x: number; y: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const clampTranslate = (nextTx: number, nextTy: number, nextScale: number) => {
    setTx(nextTx);
    setTy(nextTy);
    setScale(nextScale);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  };
  const onMouseUp = () => { dragging.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(4, Math.max(0.5, scale - e.deltaY * 0.002));
    clampTranslate(tx, ty, next);
  };

  const onTouchStart = React.useRef<{ dist: number; scale: number } | null>(null);
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (!onTouchStart.current) {
        onTouchStart.current = { dist, scale };
        return;
      }
      const next = Math.min(4, Math.max(0.5, onTouchStart.current.scale * (dist / onTouchStart.current.dist)));
      setScale(next);
    }
  };
  const onTouchEnd = () => { onTouchStart.current = null; };

  const reset = () => { setScale(1); setTx(0); setTy(0); };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        EDC Las Vegas 2026
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Map</h1>

      <div className="mt-4 flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Drag to pan · scroll or pinch to zoom</p>
        <button
          onClick={reset}
          className="ml-auto rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          Reset
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-black"
        style={{ height: "min(80vh, 800px)", touchAction: "none", cursor: dragging.current ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src="/edc-map.png"
          alt="EDC Las Vegas 2026 festival map"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain select-none"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging.current ? "none" : "transform 100ms ease-out",
          }}
        />
      </div>
    </div>
  );
}
