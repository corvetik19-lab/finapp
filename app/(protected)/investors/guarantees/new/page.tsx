"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast/ToastContext";
import { GUARANTEE_TYPE_LABELS } from "@/lib/investors/types";
import type { GuaranteeType, InvestmentSource } from "@/lib/investors/types";

interface TenderOption {
  id: string;
  purchase_number: string;
  subject: string;
}

export default function NewGuaranteePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<InvestmentSource[]>([]);
  const [tenders, setTenders] = useState<TenderOption[]>([]);

  const preselectedTenderId = searchParams.get("tender_id");

  const [formData, setFormData] = useState({
    tender_id: preselectedTenderId || "",
    source_id: "",
    guarantee_type: "contract" as GuaranteeType,
    guarantee_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    guarantee_amount: "",
    commission_amount: "",
    commission_rate: "",
    bank_name: "",
    bank_bik: "",
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [sourcesRes, tendersRes] = await Promise.all([
          fetch("/api/investors/sources"),
          fetch("/api/tenders?limit=100"),
        ]);

        if (sourcesRes.ok) {
          const data = await sourcesRes.json();
          setSources(data.data || []);
        }

        if (tendersRes.ok) {
          const data = await tendersRes.json();
          setTenders(data.data || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/investors/guarantees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tender_id: formData.tender_id || null,
          source_id: formData.source_id || null,
          guarantee_amount: Math.round(parseFloat(formData.guarantee_amount) * 100) || 0,
          commission_amount: Math.round(parseFloat(formData.commission_amount) * 100) || 0,
          commission_rate: parseFloat(formData.commission_rate) || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка создания гарантии");
      }

      show("Банковская гарантия создана", { type: "success" });
      router.push("/investors/guarantees");
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = () => {
    if (formData.guarantee_amount && formData.commission_rate) {
      const amount = parseFloat(formData.guarantee_amount);
      const rate = parseFloat(formData.commission_rate);
      const commission = (amount * rate) / 100;
      setFormData((prev) => ({ ...prev, commission_amount: commission.toFixed(2) }));
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/investors/guarantees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Новая банковская гарантия
          </h1>
          <p className="text-muted-foreground">
            Добавление банковской гарантии для тендера
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
            <CardDescription>Тип и привязка гарантии</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип гарантии *</Label>
                <Select
                  value={formData.guarantee_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, guarantee_type: v as GuaranteeType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GUARANTEE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Номер гарантии</Label>
                <Input
                  value={formData.guarantee_number}
                  onChange={(e) => setFormData((p) => ({ ...p, guarantee_number: e.target.value }))}
                  placeholder="БГ-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Тендер</Label>
              <Select
                value={formData.tender_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, tender_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тендер" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map((tender) => (
                    <SelectItem key={tender.id} value={tender.id}>
                      {tender.purchase_number} — {tender.subject?.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Источник (банк/гарант)</Label>
              <Select
                value={formData.source_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, source_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Или укажите банк вручную ниже
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Банк-гарант</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData((p) => ({ ...p, bank_name: e.target.value }))}
                  placeholder="Сбербанк"
                />
              </div>
              <div className="space-y-2">
                <Label>БИК банка</Label>
                <Input
                  value={formData.bank_bik}
                  onChange={(e) => setFormData((p) => ({ ...p, bank_bik: e.target.value }))}
                  placeholder="044525225"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Суммы и сроки</CardTitle>
            <CardDescription>Финансовые условия гарантии</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Сумма гарантии, ₽ *</Label>
                <Input
                  type="number"
                  value={formData.guarantee_amount}
                  onChange={(e) => setFormData((p) => ({ ...p, guarantee_amount: e.target.value }))}
                  onBlur={calculateCommission}
                  placeholder="1000000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ставка комиссии, %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData((p) => ({ ...p, commission_rate: e.target.value }))}
                  onBlur={calculateCommission}
                  placeholder="2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Комиссия, ₽</Label>
                <Input
                  type="number"
                  value={formData.commission_amount}
                  onChange={(e) => setFormData((p) => ({ ...p, commission_amount: e.target.value }))}
                  placeholder="25000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Дата выдачи *</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData((p) => ({ ...p, issue_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Начало действия *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Окончание действия *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Примечания</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Дополнительная информация о гарантии..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/investors/guarantees">Отмена</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Создать гарантию
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
