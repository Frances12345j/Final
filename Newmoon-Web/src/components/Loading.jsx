import React from "react";

const BRAND = "#E53935";

/**
 * Single shared spinner used by:
 * - <Loading> (page/section loaders)
 * - ConfigProvider spin.indicator (antd <Spin>, <Table loading>, modals)
 * This keeps every loading animation in the app pixel-identical.
 */
export function LoadingIcon({ size = 20 }) {
  return (
    <span
      className="inline-block rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: "3px solid rgba(229, 57, 53, 0.2)",
        borderTopColor: BRAND,
      }}
      aria-label="Loading"
    />
  );
}

/**
 * Uniform loading component for the whole Newmoon-Web app.
 * Every page uses this same loader so the app has one consistent loading animation.
 *
 * Props:
 * - text: optional message shown under the loader ("Loading data...").
 * - mini: if true, render a compact inline loader only (no wrapper styling).
 * - full: center a large spinner vertically (default).
 */
export default function Loading({ text = "Loading...", mini = false, full = false }) {
  if (mini) {
    return <LoadingIcon size={16} />;
  }

  return (
    <div
      className={
        full
          ? "flex flex-col items-center justify-center py-20"
          : "flex flex-col items-center justify-center py-10"
      }
    >
      <div className="relative h-12 w-12">
        <div className="h-12 w-12 rounded-full animate-spin" style={{ border: "4px solid rgba(229, 57, 53, 0.2)", borderTopColor: BRAND }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full" style={{ background: BRAND }} />
        </div>
      </div>
      {text ? <p className="mt-4 text-sm text-gray-500">{text}</p> : null}
    </div>
  );
}