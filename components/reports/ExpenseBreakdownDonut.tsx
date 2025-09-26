"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { ensureChartsRegistered } from "@/lib/charts/register";

ensureChartsRegistered();

export type ExpenseBreakdownDonutProps = {
  labels: string[];
  values: number[]; // major units
  currency?: string;
};

export default function ExpenseBreakdownDonut({
  labels,
  values,
  currency = "RUB",
}: ExpenseBreakdownDonutProps) {
  const data = useMemo(() => {
    const palette = [
      "#1d4ed8",
      "#3b82f6",
      "#60a5fa",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#14b8a6",
      "#ec4899",
      "#f97316",
    ];
    const backgroundColor = labels.map((label, idx) =>
      label === "Остальное" ? "#cbd5f5" : palette[idx % palette.length],
    );
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor,
          borderWidth: 0,
        },
      ],
    };
  }, [labels, values]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%" as const,
      plugins: {
        legend: {
          position: "bottom" as const,
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'doughnut'>) => {
              const label = ctx.label ?? "";
              const value = Number(ctx.raw ?? 0);
              const dataset = ctx.dataset.data as number[];
              const total = dataset.reduce((sum, v) => sum + Number(v ?? 0), 0);
              const pct = total > 0 ? (value / total) * 100 : 0;
              const formatted = new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(value);
              return `${label}: ${formatted} • ${pct.toFixed(1)}%`;
            },
          },
        },
      },
    }),
    [currency],
  );

  return <Doughnut data={data} options={options} />;
}
