"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Calendar, Clock, Users } from "lucide-react";

interface TimesheetDay {
  day: number;
  day_type: "work" | "weekend" | "holiday" | "sick" | "vacation" | "absent";
  hours: number;
}

interface EmployeeTimesheet {
  id: string;
  full_name: string;
  position: string;
  days: TimesheetDay[];
  total_work_days: number;
  total_hours: number;
  sick_days: number;
  vacation_days: number;
  absent_days: number;
}

interface Props {
  year: number;
  month: number;
  month_name: string;
  employees: EmployeeTimesheet[];
  work_days_in_month: number;
  work_hours_in_month: number;
}

const dayTypeColors: Record<string, string> = {
  work: "bg-emerald-100 text-emerald-700",
  weekend: "bg-gray-100 text-gray-500",
  holiday: "bg-red-100 text-red-700",
  sick: "bg-amber-100 text-amber-700",
  vacation: "bg-blue-100 text-blue-700",
  absent: "bg-red-200 text-red-800",
};

const dayTypeLabels: Record<string, string> = {
  work: "Я", weekend: "В", holiday: "П", sick: "Б", vacation: "О", absent: "Н",
};

export function TimesheetPage({ year, month, month_name, employees, work_days_in_month, work_hours_in_month }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(`${year}-${month.toString().padStart(2, "0")}`);

  const avgAttendance = employees.length > 0 ? (employees.reduce((sum, e) => sum + e.total_work_days, 0) / employees.length / work_days_in_month) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Табель учёта рабочего времени</h1>
          <p className="text-muted-foreground">{month_name} {year} • Форма Т-13</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">Январь 2025</SelectItem>
              <SelectItem value="2025-02">Февраль 2025</SelectItem>
              <SelectItem value="2025-03">Март 2025</SelectItem>
              <SelectItem value="2024-12">Декабрь 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Экспорт Т-13</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Сотрудников</div><div className="text-2xl font-bold">{employees.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Рабочих дней</div><div className="text-2xl font-bold">{work_days_in_month}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Норма часов</div><div className="text-2xl font-bold">{work_hours_in_month}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Средняя явка</div><div className={`text-2xl font-bold ${avgAttendance >= 90 ? "text-emerald-600" : avgAttendance >= 70 ? "text-amber-600" : "text-red-600"}`}>{avgAttendance.toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Легенда</CardTitle>
            <div className="flex gap-2">
              {Object.entries(dayTypeLabels).map(([type, label]) => (
                <Badge key={type} variant="outline" className={dayTypeColors[type]}>{label} — {type === "work" ? "Явка" : type === "weekend" ? "Выходной" : type === "holiday" ? "Праздник" : type === "sick" ? "Больничный" : type === "vacation" ? "Отпуск" : "Неявка"}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Табель</CardTitle></CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 sticky left-0 bg-background min-w-[200px]">Сотрудник</th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="text-center py-2 px-1 w-8">{i + 1}</th>
                ))}
                <th className="text-center py-2 px-2">Дн</th>
                <th className="text-center py-2 px-2">Час</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2 sticky left-0 bg-background">
                    <div className="font-medium">{e.full_name}</div>
                    <div className="text-xs text-muted-foreground">{e.position}</div>
                  </td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = e.days.find(d => d.day === i + 1);
                    return (
                      <td key={i} className="text-center py-1 px-0.5">
                        {day ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${dayTypeColors[day.day_type]}`}>
                            {day.day_type === "work" ? day.hours : dayTypeLabels[day.day_type]}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-2 font-medium">{e.total_work_days}</td>
                  <td className="text-center py-2 px-2 font-medium">{e.total_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
