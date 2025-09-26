// Chart.js global registration for react-chartjs-2
"use client";
import { Chart, registerables } from "chart.js";

// idempotent registration guard
let registered = false;
export function ensureChartsRegistered() {
  if (!registered) {
    Chart.register(...registerables);
    registered = true;
  }
}
