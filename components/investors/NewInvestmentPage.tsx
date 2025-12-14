"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import type { InvestmentSource, CreateInvestmentInput, InterestType } from "@/lib/investors/types";
import { INTEREST_TYPE_LABELS } from "@/lib/investors/types";
import { calculateInterest, formatMoney } from "@/lib/investors/calculations";
import { createInvestment } from "@/lib/investors/service";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewInvestmentPageProps {
  sources: InvestmentSource[];
  tenders: { id: string; name: string; registry_number: string; contract_amount: number }[];
  defaultNumber: string;
}

export function NewInvestmentPage({ sources, tenders, defaultNumber }: NewInvestmentPageProps) {
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const defaultDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    source_id: "",
    tender_id: "",
    investment_number: defaultNumber,
    investment_date: today,
    requested_amount: "",
    approved_amount: "",
    interest_rate: "",
    interest_type: "annual" as InterestType,
    period_days: "60",
    due_date: defaultDueDate,
    tender_total_cost: "",
    own_funds_amount: "",
    purpose: "",
    notes: "",
  });

  const calculation = formData.approved_amount && formData.interest_rate && formData.period_days
    ? calculateInterest({
        principal: Math.round(parseFloat(formData.approved_amount) * 100),
        interestRate: parseFloat(formData.interest_rate),
        interestType: formData.interest_type,
        periodDays: parseInt(formData.period_days),
      })
    : null;

  const handleSourceChange = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    setFormData({
      ...formData,
      source_id: sourceId,
      interest_rate: source?.default_interest_rate?.toString() || formData.interest_rate,
      period_days: source?.default_period_days?.toString() || formData.period_days,
    });
  };

  const handleTenderChange = (tenderId: string) => {
    const tender = tenders.find((t) => t.id === tenderId);
    setFormData({
      ...formData,
      tender_id: tenderId,
      tender_total_cost: tender ? (tender.contract_amount / 100).toString() : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.source_id) {
      show("Выберите источник финансирования", { type: "error" });
      return;
    }
    if (!formData.approved_amount || parseFloat(formData.approved_amount) <= 0) {
      show("Введите сумму инвестиции", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const input: CreateInvestmentInput = {
        source_id: formData.source_id,
        tender_id: formData.tender_id || undefined,
        investment_number: formData.investment_number,
        investment_date: formData.investment_date,
        requested_amount: Math.round(parseFloat(formData.requested_amount || formData.approved_amount) * 100),
        approved_amount: Math.round(parseFloat(formData.approved_amount) * 100),
        interest_rate: parseFloat(formData.interest_rate),
        interest_type: formData.interest_type,
        period_days: parseInt(formData.period_days),
        due_date: formData.due_date,
        tender_total_cost: formData.tender_total_cost
          ? Math.round(parseFloat(formData.tender_total_cost) * 100)
          : undefined,
        own_funds_amount: formData.own_funds_amount
          ? Math.round(parseFloat(formData.own_funds_amount) * 100)
          : undefined,
        purpose: formData.purpose || undefined,
        notes: formData.notes || undefined,
      };

      await createInvestment(input);
      show("Инвестиция создана", { type: "success" });
      router.push("/investors/investments");
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/investors/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Новая инвестиция</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Основные данные</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Номер договора</Label>
                <Input
                  value={formData.investment_number}
                  onChange={(e) => setFormData({ ...formData, investment_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={formData.investment_date}
                  onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Источник финансирования *</Label>
                <Select value={formData.source_id} onValueChange={handleSourceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите источник" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тендер (опционально)</Label>
                <Select value={formData.tender_id} onValueChange={handleTenderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тендер" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenders.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Финансовые условия</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Сумма инвестиции (₽) *</Label>
                <Input
                  type="number"
                  value={formData.approved_amount}
                  onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                  placeholder="1000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Процентная ставка (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  placeholder="18"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип ставки</Label>
                <Select
                  value={formData.interest_type}
                  onValueChange={(v) => setFormData({ ...formData, interest_type: v as InterestType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTEREST_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Срок (дней)</Label>
                <Input
                  type="number"
                  value={formData.period_days}
                  onChange={(e) => setFormData({ ...formData, period_days: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата возврата</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Назначение</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Цель привлечения средств..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {calculation && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Расчёт
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Основной долг:</span>
                  <span className="font-medium">{formatMoney(Math.round(parseFloat(formData.approved_amount) * 100))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Проценты:</span>
                  <span className="font-medium text-orange-600">{formatMoney(calculation.interestAmount)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium">К возврату:</span>
                  <span className="font-bold text-lg">{formatMoney(calculation.totalReturn)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Создание..." : "Создать инвестицию"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/investors/investments">Отмена</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
