"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(protected)/finance/plans/page.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { PlanWithActivity } from "@/lib/plans/service";

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

const statusBadgeClass = (
  status: PlanWithActivity["status"],
  base: string,
  ahead: string,
  behind: string,
) => {
  if (status === "ahead") return `${base} ${ahead}`;
  if (status === "behind") return `${base} ${behind}`;
  return base;
};

export default function PlansPageClient({ plans }: PlansPageClientProps) {
  const router = useRouter();
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
      router.refresh();
    } catch (error) {
      console.error("Failed to save plan:", error);
      alert("Ошибка при сохранении плана");
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

      router.refresh();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      alert("Ошибка при удалении плана: проблема с сетью");
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
      router.refresh();
    } catch (error) {
      console.error("Failed to add topup:", error);
      alert("Ошибка при добавлении взноса");
      setIsSaving(false);
    }
  };

  const renderCreateModal = () => {
    if (!isCreateModalOpen) return null;

    return (
      <div className={styles.modalOverlay} role="dialog" aria-modal>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>{editMode ? "Редактировать план" : "Создать план"}</div>
            <button type="button" className={styles.modalClose} onClick={closeCreateModal} aria-label="Закрыть">
              <span className="material-icons" aria-hidden>
                close
              </span>
            </button>
          </div>

          <form className={styles.modalContent} onSubmit={handleSubmit}>
            <div className={styles.modalForm}>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor="plan-name">
                  Название плана
                </label>
                <input
                  id="plan-name"
                  className={styles.formInput}
                  placeholder="Например, Накопления на отпуск"
                  value={formData.name}
                  onChange={handleFormChange("name")}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-preset">
                  Пресет
                </label>
                <select
                  id="plan-preset"
                  className={styles.formSelect}
                  value={formData.preset}
                  onChange={handlePresetChange}
                >
                  <option value="">— Свой —</option>
                  {planPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-type">
                  Тип плана
                </label>
                <div className={styles.inlineActions}>
                  <select
                    id="plan-type"
                    className={styles.formSelect}
                    value={formData.type}
                    onChange={handleFormChange("type")}
                  >
                    {planTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={handleDeletePlanType}
                    disabled={planTypes.length <= 1}
                  >
                    Удалить тип
                  </button>
                </div>
                <div className={styles.inlineActions}>
                  <input
                    className={styles.formInput}
                    placeholder="Добавить новый тип"
                    value={newPlanTypeName}
                    onChange={(event) => setNewPlanTypeName(event.target.value)}
                  />
                  <button type="button" className={styles.btnSecondary} onClick={handleAddPlanType}>
                    Добавить
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-goal">
                  Цель (₽)
                </label>
                <input
                  id="plan-goal"
                  className={styles.formInput}
                  placeholder="Например, 100 000"
                  value={formData.goal}
                  onChange={handleFormChange("goal")}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-end">
                  Планируемая дата окончания
                </label>
                <input
                  id="plan-end"
                  className={styles.formInput}
                  type="date"
                  value={formData.endDate}
                  onChange={handleFormChange("endDate")}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-monthly">
                  Ежемесячный взнос (₽)
                </label>
                <input
                  id="plan-monthly"
                  className={styles.formInput}
                  placeholder="Например, 12 500"
                  value={formData.monthly}
                  onChange={handleFormChange("monthly")}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="plan-priority">
                  Приоритет
                </label>
                <select
                  id="plan-priority"
                  className={styles.formSelect}
                  value={formData.priority}
                  onChange={handleFormChange("priority")}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor="plan-tags">
                  Теги (через запятую)
                </label>
                <input
                  id="plan-tags"
                  className={styles.formInput}
                  placeholder="семья, личное, бизнес"
                  value={formData.tags}
                  onChange={handleFormChange("tags")}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor="plan-note">
                  Примечание
                </label>
                <textarea
                  id="plan-note"
                  className={styles.formTextarea}
                  placeholder="(необязательно)"
                  value={formData.note}
                  onChange={handleFormChange("note")}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor="plan-links">
                  Ссылки/файлы (URL, через запятую)
                </label>
                <input
                  id="plan-links"
                  className={styles.formInput}
                  placeholder="https://... , https://..."
                  value={formData.links}
                  onChange={handleFormChange("links")}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeCreateModal}>
                Отмена
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                {isSaving ? "Сохранение..." : editMode ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderTopupModal = () => {
    if (!isTopupModalOpen) return null;

    return (
      <div className={styles.modalOverlay} role="dialog" aria-modal>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Добавить взнос</div>
            <button type="button" className={styles.modalClose} onClick={closeTopupModal} aria-label="Закрыть">
              <span className="material-icons" aria-hidden>
                close
              </span>
            </button>
          </div>

          <form className={styles.modalContent} onSubmit={handleTopupSubmit}>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="topup-amount">
                  Сумма (₽) <span style={{ color: "#f44336" }}>*</span>
                </label>
                <input
                  id="topup-amount"
                  className={styles.formInput}
                  type="number"
                  step="0.01"
                  placeholder="Например, 10 000"
                  value={topupForm.amount}
                  onChange={(e) => setTopupForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="topup-type">
                  Тип операции
                </label>
                <select
                  id="topup-type"
                  className={styles.formSelect}
                  value={topupForm.type}
                  onChange={(e) =>
                    setTopupForm((prev) => ({ ...prev, type: e.target.value as "topup" | "withdrawal" }))
                  }
                >
                  <option value="topup">Пополнение (+)</option>
                  <option value="withdrawal">Снятие (−)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="topup-date">
                  Дата
                </label>
                <input
                  id="topup-date"
                  className={styles.formInput}
                  type="date"
                  value={topupForm.date}
                  onChange={(e) => setTopupForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor="topup-description">
                  Описание
                </label>
                <input
                  id="topup-description"
                  className={styles.formInput}
                  placeholder="Например, Ежемесячный взнос"
                  value={topupForm.description}
                  onChange={(e) => setTopupForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formCheckbox}>
                  <input
                    type="checkbox"
                    checked={topupForm.create_transaction}
                    onChange={(e) => setTopupForm((prev) => ({ ...prev, create_transaction: e.target.checked }))}
                  />
                  <span>Создать связанную транзакцию</span>
                </label>
                <div className={styles.formHint}>
                  При включении будет автоматически создана транзакция на указанном счёте
                </div>
              </div>

              {topupForm.create_transaction && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="topup-account">
                      Счёт <span style={{ color: "#f44336" }}>*</span>
                    </label>
                    <select
                      id="topup-account"
                      className={styles.formSelect}
                      value={topupForm.account_id}
                      onChange={(e) => setTopupForm((prev) => ({ ...prev, account_id: e.target.value }))}
                      required={topupForm.create_transaction}
                    >
                      {accounts.length === 0 && <option value="">Нет счетов</option>}
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="topup-category">
                      Категория
                    </label>
                    <select
                      id="topup-category"
                      className={styles.formSelect}
                      value={topupForm.category_id}
                      onChange={(e) => setTopupForm((prev) => ({ ...prev, category_id: e.target.value }))}
                    >
                      <option value="">Без категории</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeTopupModal}>
                Отмена
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                {isSaving ? "Сохранение..." : "Добавить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (plans.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.headerCard}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Финансовые планы</h1>
            <p className={styles.subtitle}>Создавайте цели и следите за прогрессом накоплений</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.addButton} onClick={openCreateModal}>
              <span className="material-icons" aria-hidden>
                add
              </span>
              Новый план
            </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          {stats.summaryCards.map((card) => (
            <article key={card.id} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statIcon}>
                  <span className="material-icons" aria-hidden>
                    {card.icon}
                  </span>
                </span>
                <div className={styles.statTitle}>{card.title}</div>
              </div>
              <div className={styles.statValue}>{card.value}</div>
              <div
                className={`${styles.statChange} ${
                  card.changeTone === "positive" ? styles.statChangePositive : styles.statChangeNeutral
                }`}
              >
                <span className="material-icons" aria-hidden>
                  {card.changeIcon}
                </span>
                <span>{card.changeLabel}</span>
              </div>
              <div className={styles.statMeta}>Добавьте цели, чтобы видеть детальную аналитику</div>
            </article>
          ))}
        </section>

        <div className={styles.detailCard}>
          У вас пока нет активных планов. Нажмите «Новый план», чтобы создать первую цель и настроить напоминания.
        </div>

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
    <div className={styles.container}>
      <header className={styles.headerCard}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Финансовые планы</h1>
          <p className={styles.subtitle}>Следите за ходом накоплений и сроками достижения целей</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.addButton} onClick={openCreateModal}>
            <span className="material-icons" aria-hidden>
              add
            </span>
            Новый план
          </button>
          <button type="button" className={styles.secondaryButton}>
            <span className="material-icons" aria-hidden>
              upload
            </span>
            Импорт целей
          </button>
        </div>
      </header>

      <section className={styles.statsGrid}>
        {stats.summaryCards.map((card) => (
          <article key={card.id} className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statIcon}>
                <span className="material-icons" aria-hidden>
                  {card.icon}
                </span>
              </span>
              <div className={styles.statTitle}>{card.title}</div>
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div
              className={`${styles.statChange} ${
                card.changeTone === "positive" ? styles.statChangePositive : styles.statChangeNeutral
              }`}
            >
              <span className="material-icons" aria-hidden>
                {card.changeIcon}
              </span>
              <span>{card.changeLabel}</span>
            </div>
            {card.id === "total" ? (
              <div className={styles.statMeta}>Распределите накопления по приоритетам</div>
            ) : card.id === "progress" ? (
              <div className={styles.statMeta}>Рост за последние 30 дней</div>
            ) : (
              <div className={styles.statMeta}>Контролируйте сроки достижения цели</div>
            )}
          </article>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.plansColumn}>
          <div className={styles.sectionTitle}>Мои цели</div>
          <div className={styles.planList}>
            {plans.map((plan) => {
              const planProgress = Math.min(100, Math.round((plan.currentAmount / plan.goalAmount) * 100));
              const isActive = plan.id === activePlan.id;
              const badgeClass = statusBadgeClass(
                plan.status,
                styles.planBadge,
                styles.planBadgeAhead,
                styles.planBadgeBehind,
              );

              return (
                <article
                  key={plan.id}
                  className={`${styles.planCard} ${isActive ? styles.planCardActive : ""}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                  aria-pressed={isActive}
                  role="button"
                >
                  <div className={styles.planHeader}>
                    <div className={styles.planName}>{plan.name}</div>
                    <span className={badgeClass}>{statusLabel[plan.status]}</span>
                  </div>

                  <div className={styles.planDetails}>
                    <div>
                      <div className={styles.planDetailLabel}>Цель</div>
                      <div className={styles.planDetailValue}>
                        {formatAmount(plan.goalAmount, plan.currency ?? defaultCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className={styles.planDetailLabel}>Ежемес. взнос</div>
                      <div className={styles.planDetailValue}>
                        {formatAmount(plan.monthlyContribution, plan.currency ?? defaultCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className={styles.planDetailLabel}>Прогресс</div>
                      <div className={styles.planDetailValue}>{planProgress}%</div>
                    </div>
                  </div>

                  <div className={styles.planMeta}>
                    {plan.targetDate ? (
                      <span>
                        <span className="material-icons" aria-hidden>
                          event
                        </span>
                        {MONTH_FORMATTER.format(new Date(plan.targetDate))}
                      </span>
                    ) : (
                      <span className={styles.badgeMuted}>Без дедлайна</span>
                    )}
                    {plan.account && plan.account !== "—" && (
                      <span>
                        <span className="material-icons" aria-hidden>
                          account_balance_wallet
                        </span>
                        {plan.account}
                      </span>
                    )}
                    <span>
                      <span className="material-icons" aria-hidden>
                        category
                      </span>
                      {plan.category}
                    </span>
                  </div>

                  <div className={styles.planAmount}>
                    <strong>{formatAmount(plan.currentAmount, plan.currency ?? defaultCurrency)}</strong>
                    <span className={styles.planProgressLabel}>
                      из {formatAmount(plan.goalAmount, plan.currency ?? defaultCurrency)}
                    </span>
                    <div className={styles.planProgress}>
                      <div className={styles.planProgressBar} style={{ width: `${planProgress}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.sectionTitle}>{activePlan.name}</div>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{activePlan.description}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span
                  className={statusBadgeClass(
                    activePlan.status,
                    styles.statusBadge,
                    styles.statusAhead,
                    styles.statusBehind,
                  )}
                >
                  <span className="material-icons" aria-hidden>
                    {activePlan.status === "ahead"
                      ? "trending_up"
                      : activePlan.status === "behind"
                      ? "trending_down"
                      : "schedule"}
                  </span>
                  {statusLabel[activePlan.status]}
                </span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => openEditModal(activePlan)}
                  title="Редактировать план"
                >
                  <span className="material-icons" aria-hidden>
                    edit
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => handleDeletePlan(activePlan.id)}
                  title="Удалить план"
                >
                  <span className="material-icons" aria-hidden>
                    delete
                  </span>
                </button>
              </div>
            </div>
            <div className={styles.planProgress}>
              <div className={styles.planProgressBar} style={{ width: `${progressPercent}%` }} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Прогресс {progressPercent}%</div>

            <div className={styles.detailStats}>
              <div className={styles.detailStat}>
                <span>Цель</span>
                <strong>{formatAmount(activePlan.goalAmount, activePlan.currency ?? defaultCurrency)}</strong>
              </div>
              <div className={styles.detailStat}>
                <span>Накоплено</span>
                <strong>{formatAmount(activePlan.currentAmount, activePlan.currency ?? defaultCurrency)}</strong>
              </div>
              <div className={styles.detailStat}>
                <span>Осталось накопить</span>
                <strong>{formatAmount(amountLeft, activePlan.currency ?? defaultCurrency)}</strong>
              </div>
              <div className={styles.detailStat}>
                <span>Ежемесячный взнос</span>
                <strong>{formatAmount(activePlan.monthlyContribution, activePlan.currency ?? defaultCurrency)}</strong>
              </div>
              <div className={styles.detailStat}>
                <span>Дата завершения</span>
                <strong>
                  {activePlan.targetDate
                    ? FULL_DATE_FORMATTER.format(new Date(activePlan.targetDate))
                    : "—"}
                </strong>
              </div>
              {activePlan.account && activePlan.account !== "—" && (
                <div className={styles.detailStat}>
                  <span>Счёт</span>
                  <strong>{activePlan.account}</strong>
                </div>
              )}
            </div>
          </section>

          <section className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div className={styles.sectionTitle}>История взносов</div>
              <button type="button" className={styles.secondaryButton} onClick={openTopupModal}>
                <span className="material-icons" aria-hidden>
                  add_circle
                </span>
                Добавить взнос
              </button>
            </div>
            <div className={styles.activityList}>
              {activePlan.activity.length === 0 ? (
                <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  Ещё не было взносов. Добавьте первый, чтобы увидеть динамику.
                </div>
              ) : (
                activePlan.activity.map((item) => (
                  <div key={item.id} className={styles.activityItem}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.description}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {FULL_DATE_FORMATTER.format(new Date(item.date))}
                      </div>
                    </div>
                    <div
                      className={
                        item.type === "topup" ? styles.activityAmountPositive : styles.activityAmountNegative
                      }
                    >
                      {item.type === "topup" ? "+" : "-"}
                      {formatAmount(item.amount, activePlan.currency ?? defaultCurrency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {renderCreateModal()}
      {renderTopupModal()}
    </div>
  );
}
