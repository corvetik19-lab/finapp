"use client";
import { Doughnut } from "react-chartjs-2";
import { ensureChartsRegistered } from "@/lib/charts/register";
import { useMemo } from "react";
import type { TooltipItem } from "chart.js";

ensureChartsRegistered();

export default function ExpenseDoughnut({
  labels,
  data,
  currency = "RUB",
}: {
  labels: string[];
  data: number[]; // major units
  currency?: string;
}) {
  const chart = useMemo(() => {
    const palette = [
      "#1565c0",
      "#03a9f4",
      "#00bcd4",
      "#4caf50",
      "#ff9800",
      "#f44336",
      "#8e24aa",
      "#ef6c00",
      "#00695c",
    ];
    const gray = "#cbd5e1"; // Остальное
    const backgroundColor = labels.map((lbl, i) => (lbl === "Остальное" ? gray : palette[i % palette.length]));
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 0,
        },
      ],
    };
  }, [labels, data]);

  const options = useMemo(() => ({
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const label = ctx.label || "";
            const value = Number(ctx.raw || 0);
            const ds = ctx.chart.data.datasets?.[ctx.datasetIndex]?.data as number[] | undefined;
            const total = (ds || []).reduce((s, v) => s + Number(v || 0), 0);
            const pct = total > 0 ? (value / total) * 100 : 0;
            const amount = new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
            return `${label}: ${amount} • ${pct.toFixed(1)}%`;
          },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    hover: { mode: 'nearest' as const, intersect: true },
  }), [currency]);

  return <Doughnut data={chart} options={options} />;
}
