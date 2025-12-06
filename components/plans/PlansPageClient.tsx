"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils/format";
import type { PlanWithActivity } from "@/lib/plans/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar, Loader2, ArrowDownCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/toast/ToastContext";

export type PlansPageClientProps = {
  plans: PlanWithActivity[];
};

type SummaryCard = {
  id: "total" | "progress" | "soon";
  title: string;
  value: string;
  icon: string;
  changeLabel: string;
  changeIcon: string;
  changeTone: "positive" | "neutral";
};

type CreatePlanForm = {
  id?: string;
  name: string;
  preset: string;
  type: string;
  goal: string;
  endDate: string;
  monthly: string;
  priority: "Высокий" | "Средний" | "Низкий";
  tags: string;
  note: string;
  links: string;
};

type PlanType = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type PlanPreset = {
  id: string;
  name: string;
  plan_type_id: string | null;
  goal_amount: number | null;
  monthly_contribution: number | null;
  priority: "Высокий" | "Средний" | "Низкий";
  note: string | null;
  icon: string;
};

const statusLabel: Record<PlanWithActivity["status"], string> = {
  active: "В процессе",
  ahead: "Впереди графика",
  behind: "Отстаёт",
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

const DEFAULT_PLAN_TYPES = ["Накопление", "Погашение", "Путешествие", "Образование"];

const PRIORITY_OPTIONS: CreatePlanForm["priority"][] = ["Высокий", "Средний", "Низкий"];

const createInitialForm = (defaultType: string): CreatePlanForm => ({
  name: "",
  preset: "",
  type: defaultType,
  goal: "",
  endDate: "",
  monthly: "",
  priority: "Средний",
  tags: "",
  note: "",
  links: "",
});

const formatAmount = (amountMajor: number, currency: string) =>
  formatMoney(Math.round(amountMajor * 100), currency);

export default function PlansPageClient({ plans }: PlansPageClientProps) {
  const router = useRouter();
  const toast = useToast();
  const defaultCurrency = plans[0]?.currency ?? "RUB";
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id ?? "");
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [planPresets, setPlanPresets] = useState<PlanPreset[]>([]);
  const [formData, setFormData] = useState<CreatePlanForm>(() => createInitialForm(""));
  const [newPlanTypeName, setNewPlanTypeName] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupForm, setTopupForm] = useState({
    amount: "",
    type: "topup" as "topup" | "withdrawal",
    description: "",
    date: new Date().toISOString().split("T")[0],
    create_transaction: true,
    account_id: "",
    category_id: "",
  });
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Загрузка типов и пресетов при монтировании
  useEffect(() => {
    loadPlanSettings();
    loadAccountsAndCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlanSettings() {
    try {
      const [typesRes, presetsRes] = await Promise.all([
        fetch("/api/plan-types"),
        fetch("/api/plan-presets"),
      ]);

      if (typesRes.ok) {
        const { planTypes: types } = await typesRes.json();
        if (types && types.length > 0) {
          setPlanTypes(types);
        } else {
          // Создаём начальные типы, если их нет
          await initializeDefaultTypes();
        }
      }

      if (presetsRes.ok) {
        const { planPresets: presets } = await presetsRes.json();
        setPlanPresets(presets || []);
      }
    } catch (error) {
      console.error("Failed to load plan settings:", error);
    }
  }

  async function loadAccountsAndCategories() {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(
          (data.categories || []).filter((c: { kind: string }) => c.kind === "expense")
        );
      }
    } catch (error) {
      console.error("Failed to load accounts/categories:", error);
    }
  }

  async function initializeDefaultTypes() {
    const newTypes: PlanType[] = [];
    for (let i = 0; i < DEFAULT_PLAN_TYPES.length; i++) {
      try {
        const res = await fetch("/api/plan-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: DEFAULT_PLAN_TYPES[i],
            sort_order: i,
          }),
        });
        if (res.ok) {
          const { planType } = await res.json();
          newTypes.push(planType);
        }
      } catch (err) {
        console.error("Failed to create default type:", err);
      }
    }
    if (newTypes.length > 0) {
      setPlanTypes(newTypes);
    }
  }

  const selectedPlan = useMemo(() => {
    if (plans.length === 0) return undefined;
    return plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  }, [plans, selectedPlanId]);

  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const averageProgress =
      totalPlans === 0
        ? 0
        : Math.round(
            plans.reduce((sum, plan) => {
              if (plan.goalAmount <= 0) return sum;
              return sum + Math.min(100, (plan.currentAmount / plan.goalAmount) * 100);
            }, 0) / totalPlans,
          );

    const nearestTarget = plans
      .filter((plan) => plan.targetDate)
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        targetDate: plan.targetDate!,
        amountRemaining: plan.goalAmount - plan.currentAmount,
        currency: plan.currency ?? defaultCurrency,
      }))
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];

    let upcomingLabel = "Нет ближайших целей";
    if (nearestTarget) {
      const diffDays = Math.ceil(
        (new Date(nearestTarget.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      upcomingLabel = diffDays > 0 ? `через ${diffDays} дн.` : "срок наступил";
    }

    const summaryCards: SummaryCard[] = [
      {
        id: "total",
        title: "Активных планов",
        value: String(totalPlans),
        icon: "playlist_add_check",
        changeLabel: totalPlans > 0 ? "1 новый за месяц" : "Создайте первую цель",
        changeIcon: totalPlans > 0 ? "arrow_upward" : "schedule",
        changeTone: totalPlans > 0 ? "positive" : "neutral",
      },
      {
        id: "progress",
        title: "Общий прогресс",
        value: `${averageProgress}%`,
        icon: "donut_large",
        changeLabel: averageProgress > 0 ? "+8% за месяц" : "Начните движение к цели",
        changeIcon: averageProgress > 0 ? "arrow_upward" : "schedule",
        changeTone: averageProgress > 0 ? "positive" : "neutral",
      },
      {
        id: "soon",
        title: "Ближайшая цель",
        value: nearestTarget
          ? formatAmount(Math.max(0, nearestTarget.amountRemaining), nearestTarget.currency)
          : formatAmount(0, defaultCurrency),
        icon: "event",
        changeLabel: upcomingLabel,
        changeIcon: "schedule",
        changeTone: "neutral",
      },
    ];

    return { summaryCards, nearestTarget };
  }, [plans, defaultCurrency]);

  const openCreateModal = () => {
    setEditMode(false);
    setFormData(createInitialForm(planTypes[0]?.id ?? ""));
    setIsCreateModalOpen(true);
  };

  const openEditModal = (plan: PlanWithActivity) => {
    setEditMode(true);
    setFormData({
      id: plan.id,
      name: plan.name,
      preset: "",
      type: planTypes.find((t) => t.name === plan.category)?.id ?? "",
      goal: String(plan.goalAmount),
      endDate: plan.targetDate ? new Date(plan.targetDate).toISOString().split("T")[0] : "",
      monthly: String(plan.monthlyContribution),
      priority: "Средний",
      tags: "",
      note: plan.description || "",
      links: "",
    });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditMode(false);
    setFormData(createInitialForm(planTypes[0]?.id ?? ""));
    setNewPlanTypeName("");
    setIsSaving(false);
  };

  const handleFormChange = (
    field: keyof CreatePlanForm,
  ) =>
    (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      const { value } = event.target;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const presetId = event.target.value;
    if (!presetId) {
      setFormData((prev) => ({ ...prev, preset: "" }));
      return;
    }

    const preset = planPresets.find((p) => p.id === presetId);
    if (!preset) return;

    setFormData((prev) => ({
      ...prev,
      preset: presetId,
      name: preset.name,
      type: preset.plan_type_id ?? prev.type,
      goal: preset.goal_amount ? String(preset.goal_amount / 100) : prev.goal,
      monthly: preset.monthly_contribution ? String(preset.monthly_contribution / 100) : prev.monthly,
      priority: preset.priority,
      note: preset.note ?? prev.note,
    }));
  };

  const handleAddPlanType = async () => {
    const trimmed = newPlanTypeName.trim();
    if (!trimmed) return;
    if (planTypes.some((t) => t.name === trimmed)) {
      setNewPlanTypeName("");
      return;
    }

    try {
      const res = await fetch("/api/plan-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          sort_order: planTypes.length,
        }),
      });

      if (res.ok) {
        const { planType } = await res.json();
        setPlanTypes((prev) => [...prev, planType]);
        setFormData((prev) => ({ ...prev, type: planType.id }));
        setNewPlanTypeName("");
      }
    } catch (error) {
      console.error("Failed to add plan type:", error);
    }
  };

  const handleDeletePlanType = async () => {
    if (planTypes.length <= 1) return;
    const currentType = planTypes.find((t) => t.id === formData.type);
    if (!currentType) return;

    try {
      const res = await fetch(`/api/plan-types?id=${currentType.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlanTypes((prev) => {
          const filtered = prev.filter((item) => item.id !== formData.type);
          setFormData((current) => ({ ...current, type: filtered[0]?.id ?? "" }));
          return filtered;
        });
      }
    } catch (error) {
      console.error("Failed to delete plan type:", error);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);

    try {
      const goalAmount = parseFloat(formData.goal) || 0;
      const monthlyContribution = parseFloat(formData.monthly) || 0;
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const linksArray = formData.links
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      const isEdit = editMode && formData.id;
      const url = isEdit ? `/api/plans/${formData.id}` : "/api/plans";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          plan_type_id: formData.type || null,
          goal_amount: goalAmount,
          monthly_contribution: monthlyContribution,
          target_date: formData.endDate || null,
          priority: formData.priority,
          tags: tagsArray,
          note: formData.note || null,
          links: linksArray,
          currency: defaultCurrency,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error(`Failed to ${isEdit ? "update" : "create"} plan:`, error);
        alert(`Ошибка при ${isEdit ? "обновлении" : "создании"} плана`);
        setIsSaving(false);
        return;
      }

      closeCreateModal();
      toast.show(isEdit ? "План обновлён" : "План создан", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to save plan:", error);
      toast.show("Ошибка при сохранении плана", { type: "error" });
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот план?")) return;

    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to delete plan:", error);
        alert(`Ошибка при удалении плана: ${error.error || "Неизвестная ошибка"}`);
        return;
      }

      // Если удаляем текущий выбранный план, переключаемся на первый доступный
      if (selectedPlanId === planId) {
        const remainingPlans = plans.filter(p => p.id !== planId);
        if (remainingPlans.length > 0) {
          setSelectedPlanId(remainingPlans[0].id);
        } else {
          setSelectedPlanId("");
        }
      }

      toast.show("План удалён", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.show("Ошибка при удалении плана", { type: "error" });
    }
  };

  const openTopupModal = () => {
    setTopupForm({
      amount: "",
      type: "topup",
      description: "",
      date: new Date().toISOString().split("T")[0],
      create_transaction: true,
      account_id: accounts[0]?.id || "",
      category_id: "",
    });
    setIsTopupModalOpen(true);
  };

  const closeTopupModal = () => {
    setIsTopupModalOpen(false);
    setIsSaving(false);
  };

  const handleTopupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    if (!selectedPlanId) {
      alert("Выберите план перед добавлением взноса");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        plan_id: selectedPlanId,
        amount: parseFloat(topupForm.amount) || 0,
        type: topupForm.type,
        description: topupForm.description || null,
        date: topupForm.date,
        create_transaction: topupForm.create_transaction,
        account_id: topupForm.create_transaction ? topupForm.account_id : null,
        category_id: topupForm.create_transaction ? topupForm.category_id : null,
      };

      console.log("Sending topup request:", payload);

      const res = await fetch("/api/plan-topups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to add topup:", error);
        alert(`Ошибка при добавлении взноса: ${error.error || "Неизвестная ошибка"}`);
        setIsSaving(false);
        return;
      }

      closeTopupModal();
      toast.show("Взнос добавлен", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to add topup:", error);
      toast.show("Ошибка при добавлении взноса", { type: "error" });
      setIsSaving(false);
    }
  };

  const renderCreateModal = () => (
    <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && closeCreateModal()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Редактировать план" : "Создать план"}</DialogTitle>
          <DialogDescription>Укажите параметры финансового плана</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Название плана</Label>
            <Input
              id="plan-name"
              placeholder="Например, Накопления на отпуск"
              value={formData.name}
              onChange={handleFormChange("name")}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-preset">Пресет</Label>
              <select
                id="plan-preset"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.preset}
                onChange={handlePresetChange}
              >
                <option value="">— Свой —</option>
                {planPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-type">Тип плана</Label>
              <div className="flex gap-2">
                <select
                  id="plan-type"
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={handleFormChange("type")}
                >
                  {planTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <Button type="button" variant="destructive" size="sm" onClick={handleDeletePlanType} disabled={planTypes.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Добавить новый тип"
                  value={newPlanTypeName}
                  onChange={(event) => setNewPlanTypeName(event.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddPlanType}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-goal">Цель (₽)</Label>
              <Input
                id="plan-goal"
                placeholder="Например, 100 000"
                value={formData.goal}
                onChange={handleFormChange("goal")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-end">Дата окончания</Label>
              <Input
                id="plan-end"
                type="date"
                value={formData.endDate}
                onChange={handleFormChange("endDate")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-monthly">Ежемесячный взнос (₽)</Label>
              <Input
                id="plan-monthly"
                placeholder="Например, 12 500"
                value={formData.monthly}
                onChange={handleFormChange("monthly")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-priority">Приоритет</Label>
              <select
                id="plan-priority"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.priority}
                onChange={handleFormChange("priority")}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-tags">Теги (через запятую)</Label>
            <Input id="plan-tags" placeholder="семья, личное, бизнес" value={formData.tags} onChange={handleFormChange("tags")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-note">Примечание</Label>
            <textarea
              id="plan-note"
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="(необязательно)"
              value={formData.note}
              onChange={handleFormChange("note")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-links">Ссылки (URL, через запятую)</Label>
            <Input id="plan-links" placeholder="https://..." value={formData.links} onChange={handleFormChange("links")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreateModal}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Сохранение...</> : editMode ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const renderTopupModal = () => (
    <Dialog open={isTopupModalOpen} onOpenChange={(open) => !open && closeTopupModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить взнос</DialogTitle>
          <DialogDescription>Внесите средства в план накопления</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTopupSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Сумма (₽) *</Label>
              <Input
                id="topup-amount"
                type="number"
                step="0.01"
                placeholder="10 000"
                value={topupForm.amount}
                onChange={(e) => setTopupForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup-type">Тип операции</Label>
              <select
                id="topup-type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={topupForm.type}
                onChange={(e) => setTopupForm((prev) => ({ ...prev, type: e.target.value as "topup" | "withdrawal" }))}
              >
                <option value="topup">Пополнение (+)</option>
                <option value="withdrawal">Снятие (−)</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="topup-date">Дата</Label>
              <Input
                id="topup-date"
                type="date"
                value={topupForm.date}
                onChange={(e) => setTopupForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-description">Описание</Label>
            <Input
              id="topup-description"
              placeholder="Ежемесячный взнос"
              value={topupForm.description}
              onChange={(e) => setTopupForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-tx"
                checked={topupForm.create_transaction}
                onCheckedChange={(checked) => setTopupForm((prev) => ({ ...prev, create_transaction: !!checked }))}
              />
              <Label htmlFor="create-tx" className="cursor-pointer">Создать связанную транзакцию</Label>
            </div>
            <p className="text-xs text-muted-foreground">При включении будет создана транзакция на указанном счёте</p>
          </div>

          {topupForm.create_transaction && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topup-account">Счёт *</Label>
                <select
                  id="topup-account"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={topupForm.account_id}
                  onChange={(e) => setTopupForm((prev) => ({ ...prev, account_id: e.target.value }))}
                  required
                >
                  {accounts.length === 0 && <option value="">Нет счетов</option>}
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topup-category">Категория</Label>
                <select
                  id="topup-category"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={topupForm.category_id}
                  onChange={(e) => setTopupForm((prev) => ({ ...prev, category_id: e.target.value }))}
                >
                  <option value="">Без категории</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeTopupModal}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Сохранение...</> : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Финансовые планы</h1>
            <p className="text-sm text-muted-foreground">Создавайте цели и следите за прогрессом накоплений</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" /> Новый план
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.summaryCards.map((card) => (
            <Card key={card.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-lg font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.changeLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            У вас пока нет активных планов. Нажмите «Новый план», чтобы создать первую цель.
          </CardContent>
        </Card>

        {renderCreateModal()}
      </div>
    );
  }

  const activePlan = selectedPlan ?? plans[0];
  const progressPercent = Math.min(
    100,
    activePlan.goalAmount > 0 ? Math.round((activePlan.currentAmount / activePlan.goalAmount) * 100) : 0,
  );
  const amountLeft = Math.max(0, activePlan.goalAmount - activePlan.currentAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Финансовые планы</h1>
          <p className="text-sm text-muted-foreground">Следите за ходом накоплений и сроками достижения целей</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" /> Новый план
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.summaryCards.map((card) => (
          <Card key={card.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  card.id === "total" ? "bg-purple-100 text-purple-600" :
                  card.id === "progress" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {card.id === "total" ? <Target className="h-5 w-5" /> :
                   card.id === "progress" ? <TrendingUp className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className={`text-xs ${card.changeTone === "positive" ? "text-green-600" : "text-muted-foreground"}`}>
                    {card.changeLabel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plans List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-lg font-semibold">Мои цели</h3>
          <div className="space-y-3">
            {plans.map((plan) => {
              const planProgress = Math.min(100, Math.round((plan.currentAmount / plan.goalAmount) * 100));
              const isActive = plan.id === activePlan.id;

              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${isActive ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{plan.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        plan.status === "ahead" ? "bg-green-100 text-green-700" :
                        plan.status === "behind" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {statusLabel[plan.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Цель</span><br /><strong>{formatAmount(plan.goalAmount, plan.currency ?? defaultCurrency)}</strong></div>
                      <div><span className="text-muted-foreground">Взнос</span><br /><strong>{formatAmount(plan.monthlyContribution, plan.currency ?? defaultCurrency)}</strong></div>
                      <div><span className="text-muted-foreground">Прогресс</span><br /><strong>{planProgress}%</strong></div>
                    </div>
                    <Progress value={planProgress} className="h-1.5" />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {plan.targetDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {MONTH_FORMATTER.format(new Date(plan.targetDate))}
                        </span>
                      )}
                      {plan.category && <span>{plan.category}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Plan Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{activePlan.name}</CardTitle>
                  {activePlan.description && <p className="text-sm text-muted-foreground mt-1">{activePlan.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    activePlan.status === "ahead" ? "bg-green-100 text-green-700" :
                    activePlan.status === "behind" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {activePlan.status === "ahead" ? <TrendingUp className="h-3 w-3" /> :
                     activePlan.status === "behind" ? <ArrowDownCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    {statusLabel[activePlan.status]}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(activePlan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(activePlan.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">Прогресс {progressPercent}%</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Цель</span><br /><strong>{formatAmount(activePlan.goalAmount, activePlan.currency ?? defaultCurrency)}</strong></div>
                <div><span className="text-muted-foreground">Накоплено</span><br /><strong>{formatAmount(activePlan.currentAmount, activePlan.currency ?? defaultCurrency)}</strong></div>
                <div><span className="text-muted-foreground">Осталось</span><br /><strong>{formatAmount(amountLeft, activePlan.currency ?? defaultCurrency)}</strong></div>
                <div><span className="text-muted-foreground">Ежемесячный взнос</span><br /><strong>{formatAmount(activePlan.monthlyContribution, activePlan.currency ?? defaultCurrency)}</strong></div>
                <div><span className="text-muted-foreground">Дата завершения</span><br /><strong>{activePlan.targetDate ? FULL_DATE_FORMATTER.format(new Date(activePlan.targetDate)) : "—"}</strong></div>
                {activePlan.account && activePlan.account !== "—" && (
                  <div><span className="text-muted-foreground">Счёт</span><br /><strong>{activePlan.account}</strong></div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">История взносов</CardTitle>
                <Button variant="outline" size="sm" onClick={openTopupModal}>
                  <Plus className="h-4 w-4 mr-1" /> Добавить взнос
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activePlan.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ещё не было взносов. Добавьте первый, чтобы увидеть динамику.
                </p>
              ) : (
                <div className="space-y-2">
                  {activePlan.activity.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground">{FULL_DATE_FORMATTER.format(new Date(item.date))}</div>
                      </div>
                      <div className={`font-semibold ${item.type === "topup" ? "text-green-600" : "text-red-600"}`}>
                        {item.type === "topup" ? "+" : "-"}{formatAmount(item.amount, activePlan.currency ?? defaultCurrency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {renderCreateModal()}
      {renderTopupModal()}
    </div>
  );
}
