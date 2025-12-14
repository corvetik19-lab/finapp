"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Percent,
  Building2,
} from "lucide-react";

type ReportPeriod = "month" | "quarter" | "year" | "custom";

interface ReportData {
  incomeExpense?: IncomeExpenseData;
  vat?: VatData;
  profitLoss?: ProfitLossData;
  counterparty?: CounterpartyData;
  tender?: TenderData;
}

interface IncomeExpenseData {
  summary: { totalIncome: number; totalExpense: number; balance: number };
  byMonth: { month: string; income: number; expense: number; balance: number }[];
  topIncomeSources: { counterpartyName: string; amount: number }[];
  topExpenseCategories: { categoryName: string; amount: number }[];
}

interface VatData {
  summary: { vatReceived: number; vatPaid: number; vatToPay: number };
  outputVat: { documentNumber: string; documentDate: string; counterpartyName: string; totalAmount: number; vatAmount: number }[];
  inputVat: { documentNumber: string; documentDate: string; counterpartyName: string; totalAmount: number; vatAmount: number }[];
}

interface ProfitLossData {
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: { category: string; amount: number }[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  taxes: number;
  netProfit: number;
  profitMargin: number;
}

interface CounterpartyData {
  counterparties: { id: string; name: string; inn: string | null; documentsCount: number; totalInvoiced: number; totalPaid: number; debt: number }[];
  totalInvoiced: number;
  totalPaid: number;
  totalDebt: number;
}

interface TenderData {
  summary: { totalTenders: number; wonTenders: number; totalContractValue: number; totalPaid: number; totalExpenses: number; profit: number; winRate: number };
  tenders: { id: string; purchaseNumber: string; customer: string; contractPrice: number | null; status: string; documentsCount: number; paid: number; expenses: number; profit: number }[];
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
}

export function AccountingReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("income-expense");
  const [reportData, setReportData] = useState<ReportData>({});

  async function loadReport(reportType: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        dateFrom,
        dateTo,
        type: reportType,
      });

      const res = await fetch(`/api/accounting/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(prev => ({ ...prev, [reportType.replace("-", "")]: data }));
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(newPeriod: ReportPeriod) {
    setPeriod(newPeriod);
    const now = new Date();

    switch (newPeriod) {
      case "month": {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(first.toISOString().split("T")[0]);
        setDateTo(last.toISOString().split("T")[0]);
        break;
      }
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3);
        const first = new Date(now.getFullYear(), q * 3, 1);
        const last = new Date(now.getFullYear(), q * 3 + 3, 0);
        setDateFrom(first.toISOString().split("T")[0]);
        setDateTo(last.toISOString().split("T")[0]);
        break;
      }
      case "year": {
        setDateFrom(`${now.getFullYear()}-01-01`);
        setDateTo(`${now.getFullYear()}-12-31`);
        break;
      }
    }
  }

  async function handleExport(format: "xlsx" | "pdf") {
    const params = new URLSearchParams({
      period,
      dateFrom,
      dateTo,
      type: activeTab,
      format,
    });

    window.open(`/api/accounting/reports/export?${params}`, "_blank");
  }

  const incomeExpense = reportData.incomeExpense as IncomeExpenseData | undefined;
  const vat = reportData.vat as VatData | undefined;
  const profitLoss = reportData.profitLoss as ProfitLossData | undefined;
  const counterparty = reportData.counterparty as CounterpartyData | undefined;
  const tender = reportData.tender as TenderData | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёты</h1>
          <p className="text-muted-foreground">Финансовая аналитика и отчётность</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("xlsx")}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Фильтры периода */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Период</Label>
              <Select value={period} onValueChange={(v) => handlePeriodChange(v as ReportPeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="quarter">Квартал</SelectItem>
                  <SelectItem value="year">Год</SelectItem>
                  <SelectItem value="custom">Произвольный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>С</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>По</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={() => loadReport(activeTab)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Сформировать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Вкладки отчётов */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="income-expense" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Доходы/Расходы</span>
          </TabsTrigger>
          <TabsTrigger value="vat" className="flex items-center gap-1">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">НДС</span>
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">P&L</span>
          </TabsTrigger>
          <TabsTrigger value="counterparty" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Контрагенты</span>
          </TabsTrigger>
          <TabsTrigger value="tender" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Тендеры</span>
          </TabsTrigger>
        </TabsList>

        {/* Доходы/Расходы */}
        <TabsContent value="income-expense" className="space-y-4">
          {incomeExpense ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Доходы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatMoney(incomeExpense.summary.totalIncome)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Расходы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatMoney(incomeExpense.summary.totalExpense)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Баланс
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${incomeExpense.summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatMoney(incomeExpense.summary.balance)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">По месяцам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Месяц</TableHead>
                          <TableHead className="text-right">Доход</TableHead>
                          <TableHead className="text-right">Расход</TableHead>
                          <TableHead className="text-right">Баланс</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeExpense.byMonth.map((row) => (
                          <TableRow key={row.month}>
                            <TableCell>{formatMonthName(row.month)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatMoney(row.income)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatMoney(row.expense)}</TableCell>
                            <TableCell className={`text-right font-medium ${row.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatMoney(row.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Топ расходов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {incomeExpense.topExpenseCategories.map((cat, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm">{cat.categoryName}</span>
                          <span className="font-medium">{formatMoney(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите период и нажмите «Сформировать»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* НДС */}
        <TabsContent value="vat" className="space-y-4">
          {vat ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">НДС к начислению</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(vat.summary.vatReceived)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">НДС к вычету</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(vat.summary.vatPaid)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">НДС к уплате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${vat.summary.vatToPay > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatMoney(vat.summary.vatToPay)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Исходящий НДС</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Документ</TableHead>
                          <TableHead>Контрагент</TableHead>
                          <TableHead className="text-right">НДС</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vat.outputVat.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{row.documentNumber}</TableCell>
                            <TableCell className="truncate max-w-[150px]">{row.counterpartyName}</TableCell>
                            <TableCell className="text-right">{formatMoney(row.vatAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Входящий НДС</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Документ</TableHead>
                          <TableHead>Контрагент</TableHead>
                          <TableHead className="text-right">НДС</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vat.inputVat.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{row.documentNumber}</TableCell>
                            <TableCell className="truncate max-w-[150px]">{row.counterpartyName}</TableCell>
                            <TableCell className="text-right">{formatMoney(row.vatAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите период и нажмите «Сформировать»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* P&L */}
        <TabsContent value="profit-loss" className="space-y-4">
          {profitLoss ? (
            <Card>
              <CardHeader>
                <CardTitle>Отчёт о прибылях и убытках</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Выручка</TableCell>
                      <TableCell className="text-right text-lg">{formatMoney(profitLoss.revenue)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6">Себестоимость</TableCell>
                      <TableCell className="text-right text-red-600">−{formatMoney(profitLoss.costOfSales)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium">Валовая прибыль</TableCell>
                      <TableCell className="text-right text-lg font-medium">{formatMoney(profitLoss.grossProfit)}</TableCell>
                    </TableRow>
                    {profitLoss.operatingExpenses.map((exp, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="pl-6">{exp.category}</TableCell>
                        <TableCell className="text-right text-red-600">−{formatMoney(exp.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t">
                      <TableCell className="pl-6 font-medium">Итого операционные расходы</TableCell>
                      <TableCell className="text-right text-red-600">−{formatMoney(profitLoss.totalOperatingExpenses)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium">Операционная прибыль</TableCell>
                      <TableCell className="text-right text-lg font-medium">{formatMoney(profitLoss.operatingProfit)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6">Налоги</TableCell>
                      <TableCell className="text-right text-red-600">−{formatMoney(profitLoss.taxes)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold text-lg">Чистая прибыль</TableCell>
                      <TableCell className={`text-right text-xl font-bold ${profitLoss.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatMoney(profitLoss.netProfit)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Рентабельность</TableCell>
                      <TableCell className="text-right">{profitLoss.profitMargin.toFixed(1)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите период и нажмите «Сформировать»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Контрагенты */}
        <TabsContent value="counterparty" className="space-y-4">
          {counterparty ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Выставлено</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(counterparty.totalInvoiced)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Оплачено</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(counterparty.totalPaid)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Дебиторская задолженность</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatMoney(counterparty.totalDebt)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">По контрагентам</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Контрагент</TableHead>
                        <TableHead>ИНН</TableHead>
                        <TableHead className="text-center">Док-тов</TableHead>
                        <TableHead className="text-right">Выставлено</TableHead>
                        <TableHead className="text-right">Оплачено</TableHead>
                        <TableHead className="text-right">Долг</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {counterparty.counterparties.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="font-mono text-sm">{c.inn || "—"}</TableCell>
                          <TableCell className="text-center">{c.documentsCount}</TableCell>
                          <TableCell className="text-right">{formatMoney(c.totalInvoiced)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatMoney(c.totalPaid)}</TableCell>
                          <TableCell className={`text-right font-medium ${c.debt > 0 ? "text-orange-600" : ""}`}>
                            {formatMoney(c.debt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите период и нажмите «Сформировать»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Тендеры */}
        <TabsContent value="tender" className="space-y-4">
          {tender ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Тендеров
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tender.summary.totalTenders}</div>
                    <p className="text-xs text-muted-foreground">Побед: {tender.summary.wonTenders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Сумма контрактов
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(tender.summary.totalContractValue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${tender.summary.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatMoney(tender.summary.profit)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tender.summary.winRate.toFixed(0)}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Тендеры за период</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Номер</TableHead>
                        <TableHead>Заказчик</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Цена контракта</TableHead>
                        <TableHead className="text-right">Оплачено</TableHead>
                        <TableHead className="text-right">Прибыль</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tender.tenders.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-sm">{t.purchaseNumber}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{t.customer}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              t.status === "won" ? "bg-green-100 text-green-700" :
                              t.status === "lost" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {t.status === "won" ? "Выигран" : t.status === "lost" ? "Проигран" : "В работе"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{t.contractPrice ? formatMoney(t.contractPrice) : "—"}</TableCell>
                          <TableCell className="text-right text-green-600">{formatMoney(t.paid)}</TableCell>
                          <TableCell className={`text-right font-medium ${t.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatMoney(t.profit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите период и нажмите «Сформировать»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
