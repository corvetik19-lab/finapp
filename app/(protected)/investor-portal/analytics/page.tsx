"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Percent,
  Wallet,
} from "lucide-react";

export default function InvestorAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-muted-foreground">Статистика и доходность ваших инвестиций</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-green-500" />
              Средняя доходность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24.5%</div>
            <p className="text-xs text-muted-foreground">годовых</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              Всего заработано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 250 000 ₽</div>
            <p className="text-xs text-muted-foreground">за всё время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Средний срок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87 дней</div>
            <p className="text-xs text-muted-foreground">инвестиции</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Успешных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">возвратов в срок</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Динамика доходности
            </CardTitle>
            <CardDescription>Помесячный доход за последний год</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>График доходности</p>
                <p className="text-sm">В разработке</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-indigo-500" />
              Распределение по типам
            </CardTitle>
            <CardDescription>Структура инвестиционного портфеля</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Диаграмма распределения</p>
                <p className="text-sm">В разработке</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>История доходов</CardTitle>
          <CardDescription>Все полученные выплаты</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Дата</th>
                  <th className="text-left p-3 text-sm font-medium">Инвестиция</th>
                  <th className="text-left p-3 text-sm font-medium">Тип</th>
                  <th className="text-right p-3 text-sm font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 text-sm">15.03.2024</td>
                  <td className="p-3 text-sm">INV-2024-001</td>
                  <td className="p-3 text-sm">Проценты</td>
                  <td className="p-3 text-sm text-right font-medium text-green-600">+125 000 ₽</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm">01.03.2024</td>
                  <td className="p-3 text-sm">INV-2024-003</td>
                  <td className="p-3 text-sm">Основной долг</td>
                  <td className="p-3 text-sm text-right font-medium text-green-600">+500 000 ₽</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm">01.03.2024</td>
                  <td className="p-3 text-sm">INV-2024-003</td>
                  <td className="p-3 text-sm">Проценты</td>
                  <td className="p-3 text-sm text-right font-medium text-green-600">+45 000 ₽</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm">15.02.2024</td>
                  <td className="p-3 text-sm">INV-2024-001</td>
                  <td className="p-3 text-sm">Проценты</td>
                  <td className="p-3 text-sm text-right font-medium text-green-600">+125 000 ₽</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
