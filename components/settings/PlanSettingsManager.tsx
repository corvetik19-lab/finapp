"use client";

import { useMemo, useTransition } from "react";
import { useToast } from "@/components/toast/ToastContext";
import {
  addPlanType,
  updatePlanType,
  deletePlanType,
  addPlanPreset,
  updatePlanPreset,
  deletePlanPreset,
} from "@/app/(protected)/settings/actions";
import { formatMoney } from "@/lib/utils/format";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  const typeOptions = useMemo(() => {
    return planTypes.map((t) => ({ id: t.id, label: t.name }));
  }, [planTypes]);

  const handleUpdatePlanType = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await updatePlanType(formData);
        show("Тип плана сохранён!", { type: "success" });
      } catch (error) {
        show("Ошибка сохранения", { type: "error" });
        console.error(error);
      }
    });
  };

  const handleUpdatePlanPreset = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await updatePlanPreset(formData);
        show("Пресет сохранён!", { type: "success" });
      } catch (error) {
        show("Ошибка сохранения", { type: "error" });
        console.error(error);
      }
    });
  };

  const handleAddPlanType = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await addPlanType(formData);
        show("Тип плана добавлен!", { type: "success" });
      } catch (error) {
        show("Ошибка добавления", { type: "error" });
        console.error(error);
      }
    });
  };

  const handleAddPlanPreset = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await addPlanPreset(formData);
        show("Пресет добавлен!", { type: "success" });
      } catch (error) {
        show("Ошибка добавления", { type: "error" });
        console.error(error);
      }
    });
  };

  const handleDeletePlanType = async (formData: FormData) => {
    if (!confirm("Удалить тип плана? Это действие нельзя отменить.")) return;
    
    startTransition(async () => {
      try {
        await deletePlanType(formData);
        show("Тип плана удалён!", { type: "success" });
      } catch (error) {
        show("Ошибка удаления", { type: "error" });
        console.error(error);
      }
    });
  };

  const handleDeletePlanPreset = async (formData: FormData) => {
    if (!confirm("Удалить пресет? Это действие нельзя отменить.")) return;
    
    startTransition(async () => {
      try {
        await deletePlanPreset(formData);
        show("Пресет удалён!", { type: "success" });
      } catch (error) {
        show("Ошибка удаления", { type: "error" });
        console.error(error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Типы планов */}
      <div className="bg-card rounded-xl border p-6">
        <div className="text-lg font-semibold">Типы планов</div>
        <div className="text-sm text-muted-foreground mb-4">
          Настройте категории планов (Накопление, Погашение и др.)
        </div>

        <form
          className="flex flex-wrap items-center gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddPlanType(formData);
            e.currentTarget.reset();
          }}
        >
          <Input
            className="flex-1 min-w-[150px]"
            name="name"
            placeholder="Название типа"
            required
          />
          <Input
            className="w-24"
            name="sort_order"
            type="number"
            placeholder="Порядок"
            defaultValue="0"
          />
          <Button type="submit" disabled={isPending}>
            <Plus className="h-4 w-4 mr-1" aria-hidden />
            {isPending ? "Добавление..." : "Добавить"}
          </Button>
        </form>

        <div className="space-y-2">
          {planTypes.length === 0 && <div className="text-muted-foreground py-4">Типы планов отсутствуют.</div>}
          {planTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div>
                <div className="font-medium">{type.name}</div>
                <div className="text-sm text-muted-foreground">Порядок: {type.sort_order}</div>
              </div>
              <div className="flex items-center gap-2">
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdatePlanType(formData);
                  }}
                >
                  <input type="hidden" name="id" value={type.id} />
                  <Input
                    className="w-32"
                    name="name"
                    defaultValue={type.name}
                    placeholder="Название"
                    required
                  />
                  <Input
                    className="w-20"
                    name="sort_order"
                    type="number"
                    defaultValue={type.sort_order}
                    placeholder="Порядок"
                  />
                  <Button variant="secondary" size="sm" type="submit" disabled={isPending}>
                    {isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </form>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleDeletePlanType(formData);
                  }}
                >
                  <input type="hidden" name="id" value={type.id} />
                  <Button variant="ghost" size="icon" type="submit" title="Удалить" disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Пресеты планов */}
      <div className="bg-card rounded-xl border p-6">
        <div className="text-lg font-semibold">Пресеты планов</div>
        <div className="text-sm text-muted-foreground mb-4">
          Создайте шаблоны для быстрого добавления типовых планов
        </div>

        <form
          className="flex flex-wrap items-center gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddPlanPreset(formData);
            e.currentTarget.reset();
          }}
        >
          <Input
            className="flex-1 min-w-[150px]"
            name="name"
            placeholder="Название пресета"
            required
          />
          <select className="px-3 py-2 border border-input bg-background rounded-md text-sm" name="plan_type_id" defaultValue="">
            <option value="">Без типа</option>
            {typeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <Input className="w-24" name="goal_amount" placeholder="Цель (₽)" />
          <Input className="w-24" name="monthly_contribution" placeholder="Взнос (₽)" />
          <select className="px-3 py-2 border border-input bg-background rounded-md text-sm" name="priority" defaultValue="Средний">
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Input
            className="w-24"
            name="sort_order"
            type="number"
            placeholder="Порядок"
            defaultValue="0"
          />
          <Button type="submit" disabled={isPending}>
            <Plus className="h-4 w-4 mr-1" aria-hidden />
            {isPending ? "Добавление..." : "Добавить"}
          </Button>
        </form>

        <div className="space-y-2">
          {planPresets.length === 0 && <div className="text-muted-foreground py-4">Пресеты отсутствуют.</div>}
          {planPresets.map((preset) => {
            const typeName = planTypes.find((t) => t.id === preset.plan_type_id)?.name ?? "—";
            const goalFormatted = preset.goal_amount ? formatMoney(preset.goal_amount, "RUB") : "—";
            const monthlyFormatted = preset.monthly_contribution
              ? formatMoney(preset.monthly_contribution, "RUB")
              : "—";

            return (
              <div key={preset.id} className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border">
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Тип: {typeName} • Цель: {goalFormatted} • Взнос: {monthlyFormatted} • Приоритет:{" "}
                    {preset.priority}
                  </div>
                  {preset.note && <div className="text-sm text-muted-foreground italic">{preset.note}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleUpdatePlanPreset(formData);
                    }}
                  >
                    <input type="hidden" name="id" value={preset.id} />
                    <Input
                      className="w-32"
                      name="name"
                      defaultValue={preset.name}
                      placeholder="Название"
                      required
                    />
                    <select
                      className="px-2 py-1.5 border border-input bg-background rounded-md text-sm"
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
                    <Input
                      className="w-24"
                      name="goal_amount"
                      placeholder="Цель (₽)"
                      defaultValue={preset.goal_amount ? (preset.goal_amount / 100).toFixed(2) : ""}
                    />
                    <Input
                      className="w-24"
                      name="monthly_contribution"
                      placeholder="Взнос (₽)"
                      defaultValue={
                        preset.monthly_contribution ? (preset.monthly_contribution / 100).toFixed(2) : ""
                      }
                    />
                    <select className="px-2 py-1.5 border border-input bg-background rounded-md text-sm" name="priority" defaultValue={preset.priority}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="w-20"
                      name="sort_order"
                      type="number"
                      defaultValue={preset.sort_order}
                      placeholder="Порядок"
                    />
                    <textarea
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
                      name="note"
                      defaultValue={preset.note ?? ""}
                      placeholder="Заметка"
                      rows={2}
                    />
                    <Button variant="secondary" size="sm" type="submit" disabled={isPending}>
                      {isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </form>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleDeletePlanPreset(formData);
                    }}
                  >
                    <input type="hidden" name="id" value={preset.id} />
                    <Button variant="ghost" size="icon" type="submit" title="Удалить" disabled={isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    </Button>
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
