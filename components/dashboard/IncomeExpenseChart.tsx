"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { ensureChartsRegistered } from "@/lib/charts/register";

ensureChartsRegistered();

type Props = {
  labels: string[];
  income: number[];
  expense: number[];
  currency?: string;
};

export default function IncomeExpenseChart({
  labels,
  income,
  expense,
  currency = "RUB",
}: Props) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Доходы",
          data: income,
          backgroundColor: "#2563eb",
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: "Расходы",
          data: expense,
          backgroundColor: "#dc2626",
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    }),
    [labels, income, expense]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" as const },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<"bar">) => {
              const value = Number(ctx.raw ?? 0);
              const amount = new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(value);
              return `${ctx.dataset.label}: ${amount}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          ticks: {
            maxRotation: 0,
            minRotation: 0,
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
      layout: {
        padding: { top: 8, bottom: 8, left: 0, right: 0 },
      },
      datasets: {
        bar: {
          categoryPercentage: 0.55,
          barPercentage: 0.72,
        },
      },
    }),
    [currency]
  );

  return <Bar data={data} options={options} />;
}