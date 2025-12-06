"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type ExpenseStructItem = {
  label: string;
  amountMajor: number;
  percent: number;
};

export default function ExpenseStructure({ items, currency = "RUB" }: { items: ExpenseStructItem[]; currency?: string }) {
  const total = items.reduce((s, i) => s + i.amountMajor, 0) || 1;
  const fmt = (v: number) => new Intl.NumberFormat("ru-RU").format(v);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Структура расходов</CardTitle>
          <span className="text-sm text-muted-foreground">{fmt(total)} {currency}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, idx) => {
          const pct = Math.round((it.amountMajor / total) * 1000) / 10;
          return (
            <div key={`${it.label}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[150px]">{it.label}</span>
                <span className="text-muted-foreground">{fmt(it.amountMajor)} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">Нет расходов в текущем наборе транзакций</div>
        )}
      </CardContent>
    </Card>
  );
}
