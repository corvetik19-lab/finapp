"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/investors/calculations";
import type { Investment, InvestmentStatus } from "@/lib/investors/types";

interface InvestmentsPipelineClientProps {
  initialInvestments: Investment[];
}

interface PipelineColumn {
  id: InvestmentStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const columns: PipelineColumn[] = [
  {
    id: "draft",
    title: "Черновики",
    icon: <FileText className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  {
    id: "requested",
    title: "Запрошено",
    icon: <Clock className="h-4 w-4" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "approved",
    title: "Одобрено",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "received",
    title: "Получено",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "in_progress",
    title: "В работе",
    icon: <ArrowRight className="h-4 w-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "returning",
    title: "Возврат",
    icon: <ArrowRight className="h-4 w-4 rotate-180" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "overdue",
    title: "Просрочено",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: "completed",
    title: "Завершено",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

export function InvestmentsPipelineClient({ initialInvestments }: InvestmentsPipelineClientProps) {
  const [investments] = useState<Investment[]>(initialInvestments);
  const [visibleColumns, setVisibleColumns] = useState<InvestmentStatus[]>([
    "requested",
    "approved",
    "received",
    "in_progress",
    "returning",
    "overdue",
  ]);

  const getInvestmentsByStatus = (status: InvestmentStatus): Investment[] => {
    return investments.filter((inv) => inv.status === status);
  };

  const totalByStatus = (status: InvestmentStatus): number => {
    return getInvestmentsByStatus(status).reduce(
      (sum, inv) => sum + (inv.approved_amount || 0),
      0
    );
  };

  const toggleColumn = (status: InvestmentStatus) => {
    setVisibleColumns((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const activeColumns = columns.filter((col) => visibleColumns.includes(col.id));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline инвестиций</h1>
          <p className="text-muted-foreground">
            Kanban-доска для управления статусами инвестиций
          </p>
        </div>
        <div className="flex gap-2">
          {columns.map((col) => (
            <Button
              key={col.id}
              variant={visibleColumns.includes(col.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleColumn(col.id)}
              className="text-xs"
            >
              {col.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeColumns.map((column) => {
          const columnInvestments = getInvestmentsByStatus(column.id);
          const columnTotal = totalByStatus(column.id);

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 rounded-lg ${column.bgColor}`}
            >
              <div className={`p-3 border-b ${column.color} font-medium flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  {column.icon}
                  <span>{column.title}</span>
                  <Badge variant="secondary" className="ml-1">
                    {columnInvestments.length}
                  </Badge>
                </div>
                <span className="text-xs font-normal">
                  {formatMoney(columnTotal)}
                </span>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="p-2 space-y-2">
                  {columnInvestments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Нет инвестиций
                    </div>
                  ) : (
                    columnInvestments.map((inv) => (
                      <InvestmentCard key={inv.id} investment={inv} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего инвестиций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {investments.filter((i) => ["requested", "approved", "received", "in_progress"].includes(i.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">На возврате</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {investments.filter((i) => i.status === "returning").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {investments.filter((i) => i.status === "overdue").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  const daysUntilDue = Math.ceil(
    (new Date(investment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntilDue <= 7 && daysUntilDue > 0;
  const isOverdue = daysUntilDue < 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <Link
            href={`/investors/investments/${investment.id}`}
            className="font-medium text-sm hover:text-blue-600"
          >
            {investment.investment_number}
          </Link>
          <span className="text-sm font-bold">
            {formatMoney(investment.approved_amount)}
          </span>
        </div>

        {investment.source && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            {investment.source.name}
          </div>
        )}

        {investment.tender && (
          <Link
            href={`/tenders/${investment.tender.id}`}
            className="block text-xs text-muted-foreground hover:text-blue-600 truncate"
          >
            {investment.tender.purchase_number}
          </Link>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" />
            {new Date(investment.due_date).toLocaleDateString("ru-RU")}
          </div>
          <Badge variant="outline" className="text-xs">
            {investment.interest_rate}%
          </Badge>
        </div>

        {(isUrgent || isOverdue) && (
          <div className={`text-xs ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
            {isOverdue
              ? `Просрочено на ${Math.abs(daysUntilDue)} дн.`
              : `Осталось ${daysUntilDue} дн.`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
