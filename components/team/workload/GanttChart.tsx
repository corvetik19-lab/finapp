"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart3 } from "lucide-react";
import type { WorkloadAllocation, CardPriority } from "@/lib/team/types";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface GanttChartProps {
  allocations: WorkloadAllocation[];
  employees: Employee[];
  startDate?: Date;
  endDate?: Date;
}

const priorityColors: Record<CardPriority, string> = {
  low: "#94a3b8",
  normal: "#3b82f6",
  high: "#f97316",
  urgent: "#ef4444",
};

export function GanttChart({
  allocations,
  employees,
  startDate: propStartDate,
}: GanttChartProps) {
  // Calculate date range
  const { startDate, days, totalDays } = useMemo(() => {
    const today = new Date();
    
    // Default to current month if no allocations
    let minDate = propStartDate || new Date(today.getFullYear(), today.getMonth(), 1);
    let maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Find actual range from allocations
    allocations.forEach((a) => {
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Generate days array
    const days: Date[] = [];
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      startDate: minDate,
      days,
      totalDays: days.length,
    };
  }, [allocations, propStartDate]);

  // Group allocations by employee
  const employeeAllocations = useMemo(() => {
    const result: Record<string, WorkloadAllocation[]> = {};
    employees.forEach((emp) => {
      result[emp.id] = allocations.filter((a) => a.user_id === emp.id);
    });
    return result;
  }, [allocations, employees]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const getBarStyle = (allocation: WorkloadAllocation) => {
    const allocStart = new Date(allocation.start_date);
    const allocEnd = new Date(allocation.end_date);

    const startOffset = Math.max(
      0,
      (allocStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.min(
      totalDays - startOffset,
      (allocEnd.getTime() - allocStart.getTime()) / (1000 * 60 * 60 * 24) + 1
    );

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: allocation.color || priorityColors[allocation.priority],
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Get week markers
  const weekMarkers = useMemo(() => {
    const markers: { date: Date; index: number }[] = [];
    days.forEach((day, index) => {
      if (day.getDay() === 1 || index === 0) {
        markers.push({ date: day, index });
      }
    });
    return markers;
  }, [days]);

  const rowHeight = 48;
  const headerHeight = 60;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Gantt-диаграмма загрузки
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Left sidebar - Employee names */}
          <div className="w-48 flex-shrink-0 border-r">
            <div
              className="flex items-center px-4 font-medium text-sm text-muted-foreground border-b"
              style={{ height: headerHeight }}
            >
              Сотрудник
            </div>
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 px-4 border-b"
                style={{ height: rowHeight }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(emp.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{emp.name}</span>
              </div>
            ))}
          </div>

          {/* Right side - Timeline */}
          <div className="flex-1 overflow-x-auto">
            <div style={{ minWidth: totalDays * 30 }}>
              {/* Header - Dates */}
              <div
                className="flex border-b relative"
                style={{ height: headerHeight }}
              >
                {/* Week markers */}
                {weekMarkers.map(({ date, index }) => (
                  <div
                    key={index}
                    className="absolute text-xs text-muted-foreground"
                    style={{
                      left: `${(index / totalDays) * 100}%`,
                      top: 4,
                    }}
                  >
                    {formatDate(date)}
                  </div>
                ))}
                
                {/* Day columns */}
                <div className="flex w-full absolute bottom-0" style={{ height: 24 }}>
                  {days.map((day, index) => (
                    <div
                      key={index}
                      className={`flex-1 border-r text-center text-xs ${
                        isToday(day)
                          ? "bg-primary/20 font-bold"
                          : isWeekend(day)
                          ? "bg-muted/50"
                          : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows - Employee allocations */}
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="relative border-b"
                  style={{ height: rowHeight }}
                >
                  {/* Grid background */}
                  <div className="absolute inset-0 flex">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`flex-1 border-r ${
                          isToday(day)
                            ? "bg-primary/10"
                            : isWeekend(day)
                            ? "bg-muted/30"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  {/* Allocation bars */}
                  {employeeAllocations[emp.id]?.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="absolute top-2 h-8 rounded text-xs text-white flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                      style={getBarStyle(allocation)}
                      title={`${allocation.title} (${allocation.allocated_hours}ч)`}
                    >
                      <span className="truncate">{allocation.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 p-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: priorityColors.low }} />
            <span className="text-muted-foreground">Низкий</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: priorityColors.normal }} />
            <span className="text-muted-foreground">Обычный</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: priorityColors.high }} />
            <span className="text-muted-foreground">Высокий</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: priorityColors.urgent }} />
            <span className="text-muted-foreground">Срочный</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
