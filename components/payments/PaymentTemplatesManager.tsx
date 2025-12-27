"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileDown, Loader2, LayoutTemplate, Calendar } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { formatMoney } from "@/lib/utils/format";
import type { PaymentTemplate, PaymentTemplateFormInput } from "@/lib/payments/templates-schema";
import PaymentTemplateFormModal from "./PaymentTemplateFormModal";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

type Props = {
  onApplied?: () => void;
};

export default function PaymentTemplatesManager({ onApplied }: Props) {
  const router = useRouter();
  const { show: showToast } = useToast();

  const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Применение шаблонов
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [applyYear, setApplyYear] = useState(new Date().getFullYear());
  const [applyMonth, setApplyMonth] = useState(new Date().getMonth());
  const [applying, setApplying] = useState(false);

  // Загрузка шаблонов
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payment-templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch {
      showToast("Ошибка загрузки шаблонов", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Создание/редактирование шаблона
  const handleSubmitTemplate = async (data: PaymentTemplateFormInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/payment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Ошибка сохранения");
      }

      showToast(formMode === "edit" ? "Шаблон обновлён" : "Шаблон создан", { type: "success" });
      setFormOpen(false);
      loadTemplates();
    } finally {
      setSaving(false);
    }
  };

  // Удаление шаблона
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Удалить этот шаблон?")) return;

    try {
      const res = await fetch(`/api/payment-templates?id=${id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Ошибка удаления");
      }

      showToast("Шаблон удалён", { type: "success" });
      loadTemplates();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка удаления", { type: "error" });
    }
  };

  // Применение шаблонов к месяцу
  const handleApplyTemplates = async () => {
    if (selectedTemplates.size === 0) {
      showToast("Выберите хотя бы один шаблон", { type: "error" });
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/api/payment-templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateIds: Array.from(selectedTemplates),
          year: applyYear,
          month: applyMonth,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Ошибка применения");
      }

      if (result.created > 0) {
        showToast(`Создано ${result.created} платежей`, { type: "success" });
      } else {
        showToast(result.message || "Платежи уже существуют", { type: "info" });
      }

      setApplyOpen(false);
      setSelectedTemplates(new Set());
      router.refresh();
      onApplied?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка применения", { type: "error" });
    } finally {
      setApplying(false);
    }
  };

  const openCreateForm = () => {
    setFormMode("create");
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const openEditForm = (template: PaymentTemplate) => {
    setFormMode("edit");
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const openApplyDialog = () => {
    // Выбираем все шаблоны по умолчанию
    setSelectedTemplates(new Set(templates.map((t) => t.id)));
    setApplyOpen(true);
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTemplates.size === templates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(templates.map((t) => t.id)));
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <LayoutTemplate className="h-4 w-4" />
            Шаблоны платежей
          </CardTitle>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <Button size="sm" variant="outline" onClick={openApplyDialog}>
                <FileDown className="h-4 w-4 mr-1" />
                Применить
              </Button>
            )}
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Нет шаблонов</p>
              <p className="text-sm">Создайте шаблон для быстрого добавления платежей</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{template.name}</span>
                      {template.dayOfMonth && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {template.dayOfMonth} числа
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className={
                          template.direction === "expense" ? "text-destructive" : "text-emerald-600"
                        }
                      >
                        {template.direction === "expense" ? "-" : "+"}
                        {formatMoney(template.amountMinor, template.currency)}
                      </span>
                      {template.categoryName && (
                        <>
                          <span>•</span>
                          <span>{template.categoryName}</span>
                        </>
                      )}
                    </div>
                    {/* Связь с кредитной картой или кредитом */}
                    {(template.linkedCreditCardName || template.linkedLoanName) && (
                      <div className="flex items-center gap-1 mt-1">
                        {template.linkedCreditCardName && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            💳 {template.linkedCreditCardName}
                          </span>
                        )}
                        {template.linkedLoanName && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            🏦 {template.linkedLoanName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditForm(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Форма создания/редактирования */}
      <PaymentTemplateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitTemplate}
        pending={saving}
        defaultValues={editingTemplate ?? undefined}
        mode={formMode}
      />

      {/* Диалог применения шаблонов */}
      <Dialog open={applyOpen} onOpenChange={(o) => !o && setApplyOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Применить шаблоны
            </DialogTitle>
            <DialogDescription>
              Выберите шаблоны и месяц для создания платежей
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Год</label>
                <Select value={String(applyYear)} onValueChange={(v) => setApplyYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Месяц</label>
                <Select value={String(applyMonth)} onValueChange={(v) => setApplyMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Шаблоны</label>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={toggleAll}>
                  {selectedTemplates.size === templates.length ? "Снять все" : "Выбрать все"}
                </Button>
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTemplates.has(template.id)}
                      onCheckedChange={() => toggleTemplate(template.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(template.amountMinor / 100, template.currency)}
                        {template.dayOfMonth && ` • ${template.dayOfMonth} числа`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Платежи с одинаковыми названиями в выбранном месяце не будут дублироваться
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={applying}>
              Отмена
            </Button>
            <Button onClick={handleApplyTemplates} disabled={applying || selectedTemplates.size === 0}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать платежи ({selectedTemplates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
