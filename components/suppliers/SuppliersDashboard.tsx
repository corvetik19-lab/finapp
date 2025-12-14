"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  Star,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  SupplierStats,
  TopSupplier,
  SuppliersByCategory,
  SuppliersByStatus,
  MonthlyActivity,
} from "@/lib/suppliers/analytics-service";
import { SUPPLIER_STATUSES } from "@/lib/suppliers/types";

interface SuppliersDashboardProps {
  stats: SupplierStats;
  topSuppliers: TopSupplier[];
  byCategory: SuppliersByCategory[];
  byStatus: SuppliersByStatus[];
  monthlyActivity: MonthlyActivity[];
}

export function SuppliersDashboard({
  stats,
  topSuppliers,
  byCategory,
  byStatus,
  monthlyActivity,
}: SuppliersDashboardProps) {
  const getStatusColor = (status: string) => {
    const info = SUPPLIER_STATUSES[status as keyof typeof SUPPLIER_STATUSES];
    return info?.color || "gray";
  };

  const getStatusName = (status: string) => {
    const info = SUPPLIER_STATUSES[status as keyof typeof SUPPLIER_STATUSES];
    return info?.name || status;
  };

  return (
    <div className="space-y-6">
      {/* Основные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSuppliers}</p>
                <p className="text-sm text-gray-500">Всего поставщиков</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeSuppliers}</p>
                <p className="text-sm text-gray-500">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRating || "—"}</p>
                <p className="text-sm text-gray-500">Средний рейтинг</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeContracts}</p>
                <p className="text-sm text-gray-500">Активных договоров</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Предупреждения */}
      {(stats.overdueTasks > 0 || stats.expiringContracts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.overdueTasks > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700">Просроченные задачи</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.expiringContracts > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-700">Истекающие договоры (30 дней)</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.expiringContracts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ поставщиков */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Топ поставщиков по рейтингу
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSuppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map((supplier, idx) => (
                  <div
                    key={supplier.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <span className="text-lg font-bold text-gray-400 w-6">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{supplier.name}</p>
                      <p className="text-xs text-gray-500">
                        {supplier.category || "Без категории"}
                        {supplier.contractsCount > 0 && ` • ${supplier.contractsCount} дог.`}
                        {supplier.tendersCount > 0 && ` • ${supplier.tendersCount} тенд.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{supplier.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Распределение по категориям */}
        <Card>
          <CardHeader>
            <CardTitle>По категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{cat.categoryName}</p>
                      <p className="text-xs text-gray-500">
                        Средний рейтинг: {cat.avgRating || "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3">
                      {cat.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Распределение по статусам */}
        <Card>
          <CardHeader>
            <CardTitle>По статусам</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {byStatus.map((item) => {
                  const color = getStatusColor(item.status);
                  const bgColors: Record<string, string> = {
                    green: "bg-green-100 text-green-700",
                    gray: "bg-gray-100 text-gray-700",
                    red: "bg-red-100 text-red-700",
                  };
                  return (
                    <div
                      key={item.status}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bgColors[color] || "bg-gray-100"}`}
                    >
                      <span className="text-2xl font-bold">{item.count}</span>
                      <span>{getStatusName(item.status)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Активность по месяцам */}
        <Card>
          <CardHeader>
            <CardTitle>Активность за 6 месяцев</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Месяц</th>
                      <th className="text-right py-2">Новые</th>
                      <th className="text-right py-2">Задачи</th>
                      <th className="text-right py-2">Выполнено</th>
                      <th className="text-right py-2">Договоры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyActivity.map((m) => (
                      <tr key={m.month} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.month}</td>
                        <td className="text-right py-2">{m.newSuppliers}</td>
                        <td className="text-right py-2">{m.tasksCreated}</td>
                        <td className="text-right py-2 text-green-600">{m.tasksCompleted}</td>
                        <td className="text-right py-2">{m.contractsSigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gray-400">{stats.inactiveSuppliers}</p>
            <p className="text-sm text-gray-500">Неактивных</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-400">{stats.blacklistedSuppliers}</p>
            <p className="text-sm text-gray-500">В чёрном списке</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-500">{stats.totalContracts}</p>
            <p className="text-sm text-gray-500">Всего договоров</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-orange-500">{stats.pendingTasks}</p>
            <p className="text-sm text-gray-500">Активных задач</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
