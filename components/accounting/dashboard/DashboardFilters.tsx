"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom";

interface DashboardFiltersProps {
  onPeriodChange: (startDate: Date, endDate: Date, periodType: PeriodType) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

function getPeriodDates(periodType: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (periodType) {
    case "today":
      return { start: today, end: today };
    case "week": {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { start: weekStart, end: weekEnd };
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: monthStart, end: monthEnd };
    }
    case "quarter": {
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0);
      return { start: quarterStart, end: quarterEnd };
    }
    case "year": {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const yearEnd = new Date(today.getFullYear(), 11, 31);
      return { start: yearStart, end: yearEnd };
    }
    default:
      return { start: today, end: today };
  }
}

export function DashboardFilters({
  onPeriodChange,
  onRefresh,
  isLoading,
}: DashboardFiltersProps) {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  const handlePeriodChange = (value: PeriodType) => {
    setPeriodType(value);
    if (value !== "custom") {
      const { start, end } = getPeriodDates(value);
      onPeriodChange(start, end, value);
    }
  };

  const handleCustomDateChange = (start: Date | undefined, end: Date | undefined) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (start && end) {
      onPeriodChange(start, end, "custom");
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={periodType} onValueChange={(v) => handlePeriodChange(v as PeriodType)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Сегодня</SelectItem>
          <SelectItem value="week">Эта неделя</SelectItem>
          <SelectItem value="month">Этот месяц</SelectItem>
          <SelectItem value="quarter">Этот квартал</SelectItem>
          <SelectItem value="year">Этот год</SelectItem>
          <SelectItem value="custom">Произвольный</SelectItem>
        </SelectContent>
      </Select>

      {periodType === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStart ? format(customStart, "dd.MM.yyyy") : "Начало"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={(date) => handleCustomDateChange(date, customEnd)}
                locale={ru}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEnd ? format(customEnd, "dd.MM.yyyy") : "Конец"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(date) => handleCustomDateChange(customStart, date)}
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
