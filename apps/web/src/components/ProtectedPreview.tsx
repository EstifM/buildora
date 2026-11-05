"use client";

import type { ReactNode, SyntheticEvent } from "react";

function block(event: SyntheticEvent) {
  event.preventDefault();
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// One rotated watermark tile, repeated as a background so it covers any preview height.
function watermarkBackground(text: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="220"><text x="190" y="110" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30 190 110)" font-family="sans-serif" font-size="18" font-weight="700" fill="rgba(15,23,42,0.13)">${escapeXml(text)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Makes the preview hard to copy and stamps a watermark over it.
// This only deters casual copying: the real protection is never sending
// the full, downloadable resume to the browser before payment.
export function ProtectedPreview({
  watermark,
  children,
}: {
  watermark: string;
  children: ReactNode;
}) {
  return (
    <div
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
      className="relative select-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm [-webkit-touch-callout:none] print:hidden sm:p-10"
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: watermarkBackground(watermark) }}
      />
    </div>
  );
}
