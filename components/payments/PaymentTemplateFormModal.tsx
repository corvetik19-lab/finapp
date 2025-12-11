"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Info } from "lucide-react";
import { paymentTemplateFormSchema, type PaymentTemplateFormInput, type PaymentTemplate } from "@/lib/payments/templates-schema";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentTemplateFormInput) => Promise<void>;
  pending?: boolean;
  defaultValues?: Partial<PaymentTemplate>;
  mode?: "create" | "edit";
};

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function PaymentTemplateFormModal({
  open,
  onClose,
  onSubmit,
  pending = false,
  defaultValues,
  mode = "create",
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentTemplateFormInput>({
    resolver: zodResolver(paymentTemplateFormSchema),
    defaultValues: {
      name: "",
      amountMajor: undefined,
      direction: "expense",
      categoryId: undefined,
      dayOfMonth: 15,
      description: "",
    },
  });

  // Загрузка категорий
  useEffect(() => {
    if (!open) return;

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, [open]);

  // Сброс формы при открытии
  useEffect(() => {
    if (open) {
      form.reset({
        id: defaultValues?.id,
        name: defaultValues?.name ?? "",
        amountMajor: defaultValues?.amountMinor ? defaultValues.amountMinor / 100 : undefined,
        direction: defaultValues?.direction ?? "expense",
        categoryId: defaultValues?.categoryId ?? undefined,
        dayOfMonth: defaultValues?.dayOfMonth ?? 15,
        description: defaultValues?.description ?? "",
      });
      setError(null);
    }
  }, [open, defaultValues, form]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = await form.trigger();
    if (!isValid) return;

    try {
      await onSubmit(form.getValues());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const direction = form.watch("direction");
  const filteredCategories = categories.filter((c) => c.kind === direction);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Редактирование шаблона" : "Новый шаблон"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Обновите данные шаблона платежа"
              : "Создайте шаблон для быстрого добавления платежей"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">{error}</div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <input type="hidden" {...form.register("id")} />

          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              placeholder="Например, Аренда квартиры"
              {...form.register("name")}
              disabled={pending}
            />
            {form.formState.errors.name && (
              <span className="text-sm text-destructive">{form.formState.errors.name.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...form.register("amountMajor")}
                disabled={pending}
              />
              {form.formState.errors.amountMajor && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.amountMajor.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>День месяца</Label>
              <Select
                value={String(form.watch("dayOfMonth") ?? 15)}
                onValueChange={(v) => form.setValue("dayOfMonth", Number(v))}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select
              value={direction}
              onValueChange={(v) => {
                form.setValue("direction", v as "income" | "expense");
                form.setValue("categoryId", undefined);
              }}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Расход</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Select
              value={form.watch("categoryId") ?? "__none__"}
              onValueChange={(v) => form.setValue("categoryId", v === "__none__" ? undefined : v)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбрана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не выбрана</SelectItem>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Описание (необязательно)</Label>
            <Textarea
              placeholder="Дополнительная информация"
              {...form.register("description")}
              disabled={pending}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>Шаблон можно применить к любому месяцу для создания платежей</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
