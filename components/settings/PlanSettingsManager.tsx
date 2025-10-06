"use client";

import { useMemo } from "react";
import styles from "./Settings.module.css";
import {
  addPlanType,
  updatePlanType,
  deletePlanType,
  addPlanPreset,
  updatePlanPreset,
  deletePlanPreset,
} from "@/app/(protected)/settings/actions";
import { formatMoney } from "@/lib/utils/format";

export type PlanTypeRecord = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
};

export type PlanPresetRecord = {
  id: string;
  name: string;
  plan_type_id: string | null;
  goal_amount: number | null;
  monthly_contribution: number | null;
  priority: "Высокий" | "Средний" | "Низкий";
  note: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

const PRIORITY_OPTIONS: Array<"Высокий" | "Средний" | "Низкий"> = ["Высокий", "Средний", "Низкий"];

type PlanSettingsManagerProps = {
  planTypes: PlanTypeRecord[];
  planPresets: PlanPresetRecord[];
};

export default function PlanSettingsManager({ planTypes, planPresets }: PlanSettingsManagerProps) {
  const typeOptions = useMemo(() => {
    return planTypes.map((t) => ({ id: t.id, label: t.name }));
  }, [planTypes]);

  return (
    <div className={styles.cardStack}>
      {/* Типы планов */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Типы планов</div>
        <div className={styles.sectionSubtitle}>
          Настройте категории планов (Накопление, Погашение и др.)
        </div>

        <form action={addPlanType} className={`${styles.formWrap} ${styles.planForm}`}>
          <input
            className={`${styles.input} ${styles.grow}`}
            name="name"
            placeholder="Название типа"
            required
          />
          <input className={styles.input} name="icon" placeholder="Иконка (savings)" />
          <input className={styles.input} name="color" placeholder="Цвет (#1565C0)" />
          <input
            className={styles.input}
            name="sort_order"
            type="number"
            placeholder="Порядок"
            defaultValue="0"
            style={{ width: "100px" }}
          />
          <button className={`${styles.btn} ${styles.planSubmitBtn}`} type="submit">
            <span className="material-icons" aria-hidden>
              add
            </span>
            Добавить
          </button>
        </form>

        <div className={styles.list}>
          {planTypes.length === 0 && <div className={styles.empty}>Типы планов отсутствуют.</div>}
          {planTypes.map((type) => (
            <div key={type.id} className={`${styles.itemBlock} ${styles.planItemBlock}`}>
              <div className={styles.planItemContent}>
                <div className={styles.planItemTitle}>
                  {type.icon && (
                    <span className="material-icons" style={{ fontSize: 18 }}>
                      {type.icon}
                    </span>
                  )}
                  {type.name}
                </div>
                <div className={styles.planItemMeta}>
                  Цвет: {type.color || "—"} • Порядок: {type.sort_order}
                </div>
              </div>
              <div className={styles.planActionsRow}>
                <form action={updatePlanType} className={styles.planItemForm}>
                  <input type="hidden" name="id" value={type.id} />
                  <input
                    className={styles.input}
                    name="name"
                    defaultValue={type.name}
                    placeholder="Название"
                    required
                  />
                  <input
                    className={styles.input}
                    name="icon"
                    defaultValue={type.icon ?? ""}
                    placeholder="Иконка"
                  />
                  <input
                    className={styles.input}
                    name="color"
                    defaultValue={type.color ?? ""}
                    placeholder="Цвет"
                  />
                  <input
                    className={styles.input}
                    name="sort_order"
                    type="number"
                    defaultValue={type.sort_order}
                    placeholder="Порядок"
                  />
                  <button className={`${styles.btn} ${styles.btnSecondary}`} type="submit">
                    Сохранить
                  </button>
                </form>
                <form action={deletePlanType} className={styles.planDeleteForm}>
                  <input type="hidden" name="id" value={type.id} />
                  <button type="submit" className={styles.planDeleteBtn} title="Удалить">
                    <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                      delete
                    </span>
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Пресеты планов */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Пресеты планов</div>
        <div className={styles.sectionSubtitle}>
          Создайте шаблоны для быстрого добавления типовых планов
        </div>

        <form action={addPlanPreset} className={`${styles.formWrap} ${styles.planForm}`}>
          <input
            className={`${styles.input} ${styles.grow}`}
            name="name"
            placeholder="Название пресета"
            required
          />
          <select className={styles.select} name="plan_type_id" defaultValue="">
            <option value="">Без типа</option>
            {typeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <input className={styles.input} name="goal_amount" placeholder="Цель (₽)" />
          <input className={styles.input} name="monthly_contribution" placeholder="Взнос (₽)" />
          <select className={styles.select} name="priority" defaultValue="Средний">
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input className={styles.input} name="icon" placeholder="Иконка" />
          <input
            className={styles.input}
            name="sort_order"
            type="number"
            placeholder="Порядок"
            defaultValue="0"
            style={{ width: "100px" }}
          />
          <button className={`${styles.btn} ${styles.planSubmitBtn}`} type="submit">
            <span className="material-icons" aria-hidden>
              add
            </span>
            Добавить
          </button>
        </form>

        <div className={styles.list}>
          {planPresets.length === 0 && <div className={styles.empty}>Пресеты отсутствуют.</div>}
          {planPresets.map((preset) => {
            const typeName = planTypes.find((t) => t.id === preset.plan_type_id)?.name ?? "—";
            const goalFormatted = preset.goal_amount ? formatMoney(preset.goal_amount, "RUB") : "—";
            const monthlyFormatted = preset.monthly_contribution
              ? formatMoney(preset.monthly_contribution, "RUB")
              : "—";

            return (
              <div key={preset.id} className={`${styles.itemBlock} ${styles.planItemBlock}`}>
                <div className={styles.planItemContent}>
                  <div className={styles.planItemTitle}>
                    {preset.icon && (
                      <span className="material-icons" style={{ fontSize: 18 }}>
                        {preset.icon}
                      </span>
                    )}
                    {preset.name}
                  </div>
                  <div className={styles.planItemMeta}>
                    Тип: {typeName} • Цель: {goalFormatted} • Взнос: {monthlyFormatted} • Приоритет:{" "}
                    {preset.priority}
                  </div>
                  {preset.note && <div className={styles.hint}>{preset.note}</div>}
                </div>
                <div className={styles.planActionsRow}>
                  <form action={updatePlanPreset} className={styles.planItemForm}>
                    <input type="hidden" name="id" value={preset.id} />
                    <input
                      className={styles.input}
                      name="name"
                      defaultValue={preset.name}
                      placeholder="Название"
                      required
                    />
                    <select
                      className={styles.select}
                      name="plan_type_id"
                      defaultValue={preset.plan_type_id ?? ""}
                    >
                      <option value="">Без типа</option>
                      {typeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.input}
                      name="goal_amount"
                      placeholder="Цель (₽)"
                      defaultValue={preset.goal_amount ? (preset.goal_amount / 100).toFixed(2) : ""}
                    />
                    <input
                      className={styles.input}
                      name="monthly_contribution"
                      placeholder="Взнос (₽)"
                      defaultValue={
                        preset.monthly_contribution ? (preset.monthly_contribution / 100).toFixed(2) : ""
                      }
                    />
                    <select className={styles.select} name="priority" defaultValue={preset.priority}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.input}
                      name="icon"
                      defaultValue={preset.icon ?? ""}
                      placeholder="Иконка"
                    />
                    <input
                      className={styles.input}
                      name="sort_order"
                      type="number"
                      defaultValue={preset.sort_order}
                      placeholder="Порядок"
                    />
                    <textarea
                      className={styles.textarea}
                      name="note"
                      defaultValue={preset.note ?? ""}
                      placeholder="Заметка"
                    />
                    <button className={`${styles.btn} ${styles.btnSecondary}`} type="submit">
                      Сохранить
                    </button>
                  </form>
                  <form action={deletePlanPreset} className={styles.planDeleteForm}>
                    <input type="hidden" name="id" value={preset.id} />
                    <button type="submit" className={styles.planDeleteBtn} title="Удалить">
                      <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
