"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { ensureChartsRegistered } from "@/lib/charts/register";

ensureChartsRegistered();

export type MonthlyTrendChartProps = {
  labels: string[];
  income: number[]; // major units
  expense: number[]; // major units (positive numbers)
  currency?: string;
};

export default function MonthlyTrendChart({
  labels,
  income,
  expense,
  currency = "RUB",
}: MonthlyTrendChartProps) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Доходы",
          data: income,
          fill: false,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          pointRadius: 4,
          tension: 0.35,
        },
        {
          label: "Расходы",
          data: expense,
          fill: false,
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          pointRadius: 4,
          tension: 0.35,
        },
      ],
    }),
    [labels, income, expense],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const rawValue = Number(ctx.raw ?? 0);
              const formatted = new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(rawValue);
              return `${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            minRotation: 0,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (tickValue: string | number) =>
              new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(Number(tickValue)),
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "nearest" as const,
      },
    }),
    [currency],
  );

  return <Line data={data} options={options} />;
}
