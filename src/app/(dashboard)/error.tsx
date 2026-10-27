"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="surface-card px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">This page could not be opened</h1>
      <button className="mt-4 rounded-md border border-border px-4 py-2 text-sm" onClick={reset}>Try again</button>
    </div>
  );
}
