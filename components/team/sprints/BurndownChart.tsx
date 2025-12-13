"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

interface BurndownChartProps {
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPointsByDay: Record<string, number>; // date -> completed points
}

export function BurndownChart({
  startDate,
  endDate,
  totalPoints,
  completedPointsByDay,
}: BurndownChartProps) {
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const days: { date: string; ideal: number; actual: number | null }[] = [];
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const pointsPerDay = totalPoints / totalDays;
    
    let cumulativeCompleted = 0;
    
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      
      const idealRemaining = Math.max(0, totalPoints - (pointsPerDay * i));
      
      // Add completed points for this day
      if (completedPointsByDay[dateStr]) {
        cumulativeCompleted += completedPointsByDay[dateStr];
      }
      
      const actualRemaining = currentDate <= today ? totalPoints - cumulativeCompleted : null;
      
      days.push({
        date: dateStr,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: actualRemaining !== null ? Math.round(actualRemaining * 10) / 10 : null,
      });
    }
    
    return days;
  }, [startDate, endDate, totalPoints, completedPointsByDay]);

  const maxPoints = totalPoints;
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (index: number) => (index / (chartData.length - 1)) * innerWidth;
  const yScale = (value: number) => innerHeight - (value / maxPoints) * innerHeight;

  // Generate path for ideal line
  const idealPath = chartData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.ideal)}`)
    .join(" ");

  // Generate path for actual line (only where we have data)
  const actualData = chartData.filter((d) => d.actual !== null);
  const actualPath = actualData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(chartData.indexOf(d))} ${yScale(d.actual!)}`)
    .join(" ");

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Burndown Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="min-w-full">
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => {
                const y = yScale((percent / 100) * maxPoints);
                return (
                  <g key={percent}>
                    <line
                      x1={0}
                      y1={y}
                      x2={innerWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={-8}
                      y={y}
                      textAnchor="end"
                      alignmentBaseline="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {Math.round((percent / 100) * maxPoints)}
                    </text>
                  </g>
                );
              })}

              {/* Ideal line */}
              <path
                d={idealPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6,4"
              />

              {/* Actual line */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              )}

              {/* Data points for actual */}
              {actualData.map((d, i) => (
                <circle
                  key={i}
                  cx={xScale(chartData.indexOf(d))}
                  cy={yScale(d.actual!)}
                  r={4}
                  fill="#3b82f6"
                />
              ))}

              {/* X-axis labels */}
              {chartData.length <= 14 ? (
                chartData.map((d, i) => (
                  <text
                    key={i}
                    x={xScale(i)}
                    y={innerHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {formatDate(d.date)}
                  </text>
                ))
              ) : (
                // Show only first, middle, and last
                [0, Math.floor(chartData.length / 2), chartData.length - 1].map((i) => (
                  <text
                    key={i}
                    x={xScale(i)}
                    y={innerHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {formatDate(chartData[i].date)}
                  </text>
                ))
              )}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-400" style={{ borderStyle: "dashed" }} />
            <span className="text-muted-foreground">Идеальный</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">Фактический</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
