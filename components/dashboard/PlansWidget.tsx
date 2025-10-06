"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { PlanWithActivity } from "@/lib/plans/service";

const STATUS_CLASS: Record<PlanWithActivity["status"], string> = {
  ahead: styles.statusAhead,
  active: styles.statusActive,
  behind: styles.statusBehind,
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
    <section className={styles.plansWidget}>
      <div className={styles.plansHeader}>
        <div className={styles.plansHeaderTitle}>
          <div className={styles.plansTitle}>Планы</div>
          <div className={styles.plansSubtitle}>
            {plans.length > 0 ? `Выполнено ${completion}% от общей цели` : "Следите за прогрессом ваших финансовых целей"}
          </div>
        </div>
        <div className={styles.plansActions}>
          <button type="button" onClick={openModal} className={styles.plansQuickAdd}>
            <span className="material-icons" aria-hidden>
              add_circle
            </span>
            Новый план
          </button>
        </div>
      </div>

      <div className={styles.plansStats}>
        <div className={styles.plansStatCard}>
          <div className={styles.plansStatLabel}>Всего планов</div>
          <div className={styles.plansStatValue}>{plans.length}</div>
        </div>
        <div className={styles.plansStatCard}>
          <div className={styles.plansStatLabel}>Накоплено</div>
          <div className={styles.plansStatValue}>{formatMoney(totals.currentMinor, currency)}</div>
        </div>
        <div className={styles.plansStatCard}>
          <div className={styles.plansStatLabel}>До цели</div>
          <div className={styles.plansStatValue}>
            {formatMoney(Math.max(totals.goalMinor - totals.currentMinor, 0), currency)}
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className={styles.plansEmpty}>
          Планы ещё не созданы. Создайте первый, чтобы видеть прогресс накоплений.
        </div>
      ) : (
        <div className={styles.plansList}>
          {highlightedPlans.map((plan) => {
            const progress = plan.goalAmount > 0 ? Math.min(100, Math.round((plan.currentAmount / plan.goalAmount) * 100)) : 0;
            const statusClass = STATUS_CLASS[plan.status] ?? styles.statusActive;

            return (
              <Link key={plan.id} href={`/plans?id=${plan.id}`} className={styles.plansItem}>
                <span className={`${styles.plansItemStatus} ${statusClass}`} aria-hidden />
                <div className={styles.plansItemBody}>
                  <div className={styles.plansItemTitle}>{plan.name}</div>
                  <div className={styles.plansItemMeta}>
                    <span>{formatMinor(plan.currentAmount, currency)} из {formatMinor(plan.goalAmount, currency)}</span>
                    {plan.targetDate && <span>до {new Date(plan.targetDate).toLocaleDateString("ru-RU")}</span>}
                    <span>{plan.category}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className={styles.plansItemProgress}>
                  <div className={styles.plansStatLabel}>Ежемесячный взнос</div>
                  <div className={styles.plansStatValue}>{formatMinor(plan.monthlyContribution, currency)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/plans" className={styles.plansFooterLink}>
        Посмотреть все планы
        <span className="material-icons" aria-hidden>
          arrow_forward
        </span>
      </Link>

      {isModalOpen && (
        <div className={styles.modalRoot} role="presentation" onClick={closeModal}>
          <div className={styles.modal} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Создать новый план</div>
              <button type="button" className={styles.modalClose} onClick={closeModal} aria-label="Закрыть">
                <span className="material-icons" aria-hidden>
                  close
                </span>
              </button>
            </div>

            <form className={styles.modalContent} onSubmit={handleSubmit}>
              <div className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="plan-name-quick">
                    Название плана <span style={{ color: "#f44336" }}>*</span>
                  </label>
                  <input
                    id="plan-name-quick"
                    className={styles.formInput}
                    placeholder="Например, Отпуск в Италии"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="plan-goal-quick">
                    Цель (₽) <span style={{ color: "#f44336" }}>*</span>
                  </label>
                  <input
                    id="plan-goal-quick"
                    className={styles.formInput}
                    type="number"
                    step="0.01"
                    placeholder="Например, 100 000"
                    value={formData.goal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="plan-end-quick">
                    Планируемая дата
                  </label>
                  <input
                    id="plan-end-quick"
                    className={styles.formInput}
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="plan-monthly-quick">
                    Ежемесячный взнос (₽)
                  </label>
                  <input
                    id="plan-monthly-quick"
                    className={styles.formInput}
                    type="number"
                    step="0.01"
                    placeholder="Например, 12 500"
                    value={formData.monthly}
                    onChange={(e) => setFormData((prev) => ({ ...prev, monthly: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel} htmlFor="plan-note-quick">
                    Примечание
                  </label>
                  <textarea
                    id="plan-note-quick"
                    className={styles.formTextarea}
                    placeholder="(необязательно)"
                    value={formData.note}
                    onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                  {isSaving ? "Создание..." : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
