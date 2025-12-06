"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import type { PlanWithActivity } from "@/lib/plans/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Target, Plus, ArrowRight, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<PlanWithActivity["status"], string> = {
  ahead: "bg-green-500",
  active: "bg-blue-500",
  behind: "bg-red-500",
};

type PlansWidgetProps = {
  plans: PlanWithActivity[];
  currency: string;
};

function formatMinor(valueMajor: number, currency: string) {
  return formatMoney(Math.round(valueMajor * 100), currency);
}

export default function PlansWidget({ plans, currency }: PlansWidgetProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    endDate: "",
    monthly: "",
    note: "",
  });

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setFormData({
      name: "",
      goal: "",
      endDate: "",
      monthly: "",
      note: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);

    try {
      const goalAmount = parseFloat(formData.goal) || 0;
      const monthlyContribution = parseFloat(formData.monthly) || 0;

      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          plan_type_id: null,
          goal_amount: goalAmount,
          monthly_contribution: monthlyContribution,
          target_date: formData.endDate || null,
          priority: "Средний",
          tags: [],
          note: formData.note || null,
          links: [],
          currency,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to create plan:", error);
        alert("Ошибка при создании плана");
        setIsSaving(false);
        return;
      }

      closeModal();
      router.refresh();
    } catch (error) {
      console.error("Failed to save plan:", error);
      alert("Ошибка при сохранении плана");
      setIsSaving(false);
    }
  };
  const highlightedPlans = plans.slice(0, 4);

  const totals = plans.reduce(
    (acc, plan) => {
      acc.goalMinor += Math.max(0, Math.round(plan.goalAmount * 100));
      acc.currentMinor += Math.max(0, Math.round(plan.currentAmount * 100));
      if (plan.status === "ahead") acc.ahead += 1;
      if (plan.status === "behind") acc.behind += 1;
      if (plan.status === "active") acc.active += 1;
      return acc;
    },
    { goalMinor: 0, currentMinor: 0, ahead: 0, behind: 0, active: 0 },
  );

  const completion = totals.goalMinor > 0 ? Math.min(100, Math.round((totals.currentMinor / totals.goalMinor) * 100)) : 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Планы
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {plans.length > 0 ? `Выполнено ${completion}% от общей цели` : "Следите за прогрессом ваших финансовых целей"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openModal}>
              <Plus className="h-4 w-4 mr-1" />
              Новый план
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Всего планов</div>
              <div className="text-lg font-bold">{plans.length}</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Накоплено</div>
              <div className="text-lg font-bold">{formatMoney(totals.currentMinor, currency)}</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">До цели</div>
              <div className="text-lg font-bold">{formatMoney(Math.max(totals.goalMinor - totals.currentMinor, 0), currency)}</div>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              Планы ещё не созданы. Создайте первый, чтобы видеть прогресс накоплений.
            </div>
          ) : (
            <div className="space-y-3">
              {highlightedPlans.map((plan) => {
                const progress = plan.goalAmount > 0 ? Math.min(100, Math.round((plan.currentAmount / plan.goalAmount) * 100)) : 0;
                const statusColor = STATUS_COLORS[plan.status] ?? "bg-blue-500";
                return (
                  <Link key={plan.id} href={`/finance/plans?id=${plan.id}`} className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-1 h-full min-h-[40px] rounded-full ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{plan.name}</div>
                        <div className="text-xs text-muted-foreground space-x-2">
                          <span>{formatMinor(plan.currentAmount, currency)} из {formatMinor(plan.goalAmount, currency)}</span>
                          {plan.targetDate && <span>до {new Date(plan.targetDate).toLocaleDateString("ru-RU")}</span>}
                        </div>
                        <Progress value={progress} className="h-1.5 mt-2" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Взнос/мес</div>
                        <div className="text-sm font-medium">{formatMinor(plan.monthlyContribution, currency)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/finance/plans">
              Посмотреть все планы
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый план</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name-quick">Название плана *</Label>
              <Input id="plan-name-quick" placeholder="Например, Отпуск в Италии" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-goal-quick">Цель (₽) *</Label>
              <Input id="plan-goal-quick" type="number" step="0.01" placeholder="Например, 100 000" value={formData.goal} onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-end-quick">Планируемая дата</Label>
              <Input id="plan-end-quick" type="date" value={formData.endDate} onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-monthly-quick">Ежемесячный взнос (₽)</Label>
              <Input id="plan-monthly-quick" type="number" step="0.01" placeholder="Например, 12 500" value={formData.monthly} onChange={(e) => setFormData((prev) => ({ ...prev, monthly: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-note-quick">Примечание</Label>
              <Textarea id="plan-note-quick" placeholder="(необязательно)" value={formData.note} onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Отмена</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создание...</> : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
