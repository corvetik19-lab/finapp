"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  FileText, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import Link from "next/link";
import { AdvanceReport, AdvanceReportStatus } from "@/lib/accounting/documents/types";
import { formatMoney } from "@/lib/accounting/types";

interface AdvanceReportsPageProps {
  reports: AdvanceReport[];
}

const statusLabels: Record<AdvanceReportStatus, string> = {
  draft: "Черновик",
  submitted: "На рассмотрении",
  approved: "Утверждён",
  rejected: "Отклонён",
  paid: "Оплачен",
};

const statusColors: Record<AdvanceReportStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-emerald-100 text-emerald-800",
};

const statusIcons: Record<AdvanceReportStatus, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  submitted: <Send className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  paid: <CheckCircle className="h-3 w-3" />,
};

export function AdvanceReportsPage({ reports }: AdvanceReportsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdvanceReportStatus | "all">("all");

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      !searchQuery ||
      report.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_number.toString().includes(searchQuery);

    const matchesStatus = statusFilter === "all" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft").length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    approved: reports.filter((r) => r.status === "approved").length,
    totalAmount: reports.reduce((sum, r) => sum + r.spent_amount, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Авансовые отчёты</h1>
          <p className="text-muted-foreground">Форма АО-1</p>
        </div>
        <Link href="/tenders/accounting/advance-reports/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать отчёт
          </Button>
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Всего</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Черновики</div>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">На рассмотрении</div>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Утверждено</div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Общая сумма</div>
            <div className="text-2xl font-bold">{formatMoney(stats.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по сотруднику или назначению..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Все
              </Button>
              {(Object.keys(statusLabels) as AdvanceReportStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {statusLabels[status]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>Список отчётов</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Авансовые отчёты не найдены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Назначение</TableHead>
                  <TableHead className="text-right">Аванс</TableHead>
                  <TableHead className="text-right">Израсходовано</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.report_number}
                    </TableCell>
                    <TableCell>
                      {new Date(report.report_date).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <div>{report.employee_name}</div>
                      {report.employee_position && (
                        <div className="text-xs text-muted-foreground">
                          {report.employee_position}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {report.purpose || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(report.advance_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(report.spent_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.balance_amount >= 0 ? (
                        <span className="text-green-600">
                          +{formatMoney(report.balance_amount)}
                        </span>
                      ) : (
                        <span className="text-red-600">
                          {formatMoney(report.balance_amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[report.status]}>
                        <span className="flex items-center gap-1">
                          {statusIcons[report.status]}
                          {statusLabels[report.status]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tenders/accounting/advance-reports/${report.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
