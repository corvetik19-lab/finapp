"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Shield,
  PiggyBank,
  FileText,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/investors/calculations";
import {
  INVESTMENT_STATUS_LABELS,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_STATUS_LABELS,
  FUNDING_STAGE_LABELS,
} from "@/lib/investors/types";
import type { Investment, BankGuarantee, InvestmentStatus, GuaranteeStatus } from "@/lib/investors/types";
import type { Tender } from "@/lib/tenders/types";

interface TenderFinancingClientProps {
  tender: Tender;
}

interface FinancingData {
  investments: Investment[];
  guarantees: BankGuarantee[];
  loading: boolean;
}

export function TenderFinancingClient({ tender }: TenderFinancingClientProps) {
  const [data, setData] = useState<FinancingData>({
    investments: [],
    guarantees: [],
    loading: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [investmentsRes, guaranteesRes] = await Promise.all([
          fetch(`/api/investors/investments?tender_id=${tender.id}`),
          fetch(`/api/investors/guarantees?tender_id=${tender.id}`),
        ]);

        const investments = investmentsRes.ok ? await investmentsRes.json() : [];
        const guarantees = guaranteesRes.ok ? await guaranteesRes.json() : [];

        setData({
          investments: investments.data || [],
          guarantees: guarantees.data || [],
          loading: false,
        });
      } catch (error) {
        console.error("Error loading financing data:", error);
        setData((prev) => ({ ...prev, loading: false }));
      }
    }

    loadData();
  }, [tender.id]);

  const totalInvested = data.investments.reduce(
    (sum, inv) => sum + (inv.approved_amount || 0),
    0
  );
  const totalInterest = data.investments.reduce(
    (sum, inv) => sum + (inv.interest_amount || 0),
    0
  );
  const totalReturned = data.investments.reduce(
    (sum, inv) => sum + (inv.returned_principal || 0) + (inv.returned_interest || 0),
    0
  );
  const totalGuarantees = data.guarantees
    .filter((g) => g.status === "active")
    .reduce((sum, g) => sum + (g.guarantee_amount || 0), 0);
  const totalCommission = data.guarantees.reduce(
    (sum, g) => sum + (g.commission_amount || 0),
    0
  );

  const tenderCost = tender.nmck || 0;
  const ownFunds = (tender as Tender & { own_funds_amount?: number }).own_funds_amount || 0;
  const investmentShare = tenderCost > 0 ? (totalInvested / tenderCost) * 100 : 0;
  const ownFundsShare = tenderCost > 0 ? (ownFunds / tenderCost) * 100 : 0;
  const fundingGap = Math.max(0, tenderCost - totalInvested - ownFunds);

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    requested: "outline",
    approved: "default",
    received: "default",
    in_progress: "default",
    returning: "outline",
    completed: "secondary",
    overdue: "destructive",
    cancelled: "secondary",
  };

  const guaranteeStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    pending: "outline",
    active: "default",
    expired: "secondary",
    claimed: "destructive",
    returned: "secondary",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/tenders/${tender.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Финансирование тендера</h1>
            <p className="text-sm text-muted-foreground">
              {tender.purchase_number} — {tender.subject?.substring(0, 80)}...
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/investors/guarantees/new?tender_id=${tender.id}`}>
              <Shield className="mr-2 h-4 w-4" />
              Добавить гарантию
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/investors/investments/new?tender_id=${tender.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Привлечь инвестицию
            </Link>
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Стоимость тендера</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(tenderCost)}</div>
            <p className="text-xs text-muted-foreground">Начальная максимальная цена</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Привлечено</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalInvested)}</div>
            <p className="text-xs text-muted-foreground">
              {investmentShare.toFixed(1)}% от стоимости
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Собственные средства</CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(ownFunds)}</div>
            <p className="text-xs text-muted-foreground">
              {ownFundsShare.toFixed(1)}% от стоимости
            </p>
          </CardContent>
        </Card>

        <Card className={fundingGap > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Недофинансирование</CardTitle>
            {fundingGap > 0 ? (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${fundingGap > 0 ? "text-orange-600" : "text-green-600"}`}>
              {fundingGap > 0 ? formatMoney(fundingGap) : "Полностью"}
            </div>
            <p className="text-xs text-muted-foreground">
              {fundingGap > 0 ? "Требуется привлечь" : "Тендер профинансирован"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Структура финансирования */}
      <Card>
        <CardHeader>
          <CardTitle>Структура финансирования</CardTitle>
          <CardDescription>Распределение источников финансирования тендера</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Собственные средства</span>
              <span>{formatMoney(ownFunds)} ({ownFundsShare.toFixed(1)}%)</span>
            </div>
            <Progress value={ownFundsShare} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Инвестиции</span>
              <span>{formatMoney(totalInvested)} ({investmentShare.toFixed(1)}%)</span>
            </div>
            <Progress value={investmentShare} className="h-2 bg-blue-100 [&>div]:bg-blue-600" />
          </div>
          {fundingGap > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-orange-600">
                <span>Не хватает</span>
                <span>{formatMoney(fundingGap)} ({((fundingGap / tenderCost) * 100).toFixed(1)}%)</span>
              </div>
              <Progress 
                value={(fundingGap / tenderCost) * 100} 
                className="h-2 bg-orange-100 [&>div]:bg-orange-500" 
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
            <div>
              <p className="text-sm text-muted-foreground">Стоимость процентов</p>
              <p className="text-lg font-semibold text-red-600">{formatMoney(totalInterest)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Комиссия за гарантии</p>
              <p className="text-lg font-semibold text-red-600">{formatMoney(totalCommission)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Инвестиции */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Инвестиции ({data.investments.length})
            </CardTitle>
            <CardDescription>Привлечённые инвестиции для этого тендера</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/investors/investments/new?tender_id=${tender.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : data.investments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Инвестиции не привлекались
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Этап</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Ставка</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.investments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/investors/investments/${inv.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {inv.investment_number}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.source?.name || "—"}</TableCell>
                    <TableCell>
                      {inv.funding_stage ? (
                        <Badge variant="outline">
                          {FUNDING_STAGE_LABELS[inv.funding_stage]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(inv.approved_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Percent className="h-3 w-3" />
                        {inv.interest_rate}%
                      </div>
                    </TableCell>
                    <TableCell>{new Date(inv.due_date).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[inv.status]}>
                        {INVESTMENT_STATUS_LABELS[inv.status as InvestmentStatus]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Банковские гарантии */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Банковские гарантии ({data.guarantees.length})
            </CardTitle>
            <CardDescription>Гарантии обеспечения по тендеру</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/investors/guarantees/new?tender_id=${tender.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : data.guarantees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Банковские гарантии не оформлены
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Банк</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Комиссия</TableHead>
                  <TableHead>Действует до</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.guarantees.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Link
                        href={`/investors/guarantees/${g.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {g.guarantee_number || "Без номера"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {GUARANTEE_TYPE_LABELS[g.guarantee_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{g.bank_name || g.source?.name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(g.guarantee_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(g.commission_amount)}
                    </TableCell>
                    <TableCell>{new Date(g.end_date).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <Badge variant={guaranteeStatusVariants[g.status]}>
                        {GUARANTEE_STATUS_LABELS[g.status as GuaranteeStatus]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Итоги */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle>Финансовый итог</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Всего привлечено</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(totalInvested)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Стоимость финансирования</p>
              <p className="text-xl font-bold text-red-600">{formatMoney(totalInterest + totalCommission)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Возвращено</p>
              <p className="text-xl font-bold">{formatMoney(totalReturned)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Активных гарантий</p>
              <p className="text-xl font-bold">{formatMoney(totalGuarantees)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
