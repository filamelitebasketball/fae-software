import React from "react";

/** Gold-shimmer skeleton block matching the v3 dark/gold design system. */
export function NxSkel({ h = 14, w = "100%", style }: { h?: number; w?: number | string; style?: React.CSSProperties }) {
  return <span className="nx-skel" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
}

/** A shimmering placeholder card. */
export function NxSkelCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="lb-card" aria-hidden="true">
      <div className="lb-head" style={{ gap: 12 }}>
        <NxSkel h={16} w={120} />
        <NxSkel h={14} w={70} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="lb-row" style={{ gap: 12, alignItems: "center" }}>
          <NxSkel h={28} w={28} style={{ borderRadius: 999 }} />
          <NxSkel h={12} w={`${55 + ((i * 9) % 30)}%`} />
          <NxSkel h={12} w={36} style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

/** Responsive grid of skeleton cards. */
export function NxSkelGrid({ count = 4, lines = 4, minWidth = 300 }: { count?: number; lines?: number; minWidth?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ marginTop: 32, display: "grid", gap: 20, gridTemplateColumns: `repeat(auto-fit,minmax(${minWidth}px,1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <NxSkelCard key={i} lines={lines} />
      ))}
    </div>
  );
}

type EBProps = { fallback: React.ReactNode; children: React.ReactNode };
/** Simple error boundary — renders `fallback` when a child throws while mounting. */
export class NxErrorBoundary extends React.Component<EBProps, { hasError: boolean }> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[NXGEN] component failed to mount:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
