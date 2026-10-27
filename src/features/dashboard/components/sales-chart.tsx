"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ points }: { points: Array<{ label: string; total: string }> }) {
  const data = points.map((point) => ({ label: point.label, amount: Number(point.total) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5f6778" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#5f6778" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip cursor={{ fill: "rgba(54,73,234,0.06)" }} contentStyle={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.9)", boxShadow: "none", fontSize: 14 }} />
        <Bar dataKey="amount" fill="#3649ea" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
