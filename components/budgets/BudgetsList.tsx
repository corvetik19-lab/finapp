"use client";

import { useState } from "react";
import { BudgetWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { deleteBudget, updateBudget } from "@/app/(protected)/finance/budgets/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, Save, X, CreditCard, Package } from "lucide-react";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer" | "both";
};

type BudgetsListProps = {
  budgets: BudgetWithUsage[];
  categories: Category[];
};

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BudgetsList({ budgets, categories }: BudgetsListProps) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    category_id: string;
    period_start: string;
    period_end: string;
    limit_amount: string;
    currency: string;
    notes: string;
  } | null>(null);

  const handleEdit = (budget: BudgetWithUsage) => {
    setEditingId(budget.id);
    setEditForm({
      category_id: budget.category_id ?? "",
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_amount: String(budget.limit_major),
      currency: budget.currency,
      notes: budget.notes ?? "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (budgetId: string) => {
    if (!editForm) return;

    try {
      const formData = new FormData();
      formData.append("id", budgetId);
      formData.append("category_id", editForm.category_id);
      formData.append("period_start", editForm.period_start);
      formData.append("period_end", editForm.period_end);
      formData.append("limit_amount", editForm.limit_amount);
      formData.append("currency", editForm.currency);
      formData.append("notes", editForm.notes);

      await updateBudget(formData);
      setEditingId(null);
      setEditForm(null);
      showToast("✅ Бюджет успешно обновлен", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to update budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${errorMessage}`, { type: "error" });
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!window.confirm("Удалить бюджет?")) return;

    try {
      const formData = new FormData();
      formData.append("id", budgetId);
      await deleteBudget(formData);
      showToast("✅ Бюджет успешно удален", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${errorMessage}`, { type: "error" });
    }
  };

  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Бюджеты ещё не настроены. Создайте первый лимит в форме выше.
        </CardContent>
      </Card>
    );
  }

  // Группируем бюджеты
  const incomeBudgets = budgets.filter(b => b.category?.kind === "income" || b.category?.kind === "both");
  const expenseBudgets = budgets.filter(b => (b.category?.kind === "expense" || b.account_id) && !b.product_id); // Кредитные карты тоже в расходах
  const productBudgets = budgets.filter(b => b.product_id); // Бюджеты по товарам

  const renderBudget = (budget: BudgetWithUsage) => {
    const isEditing = editingId === budget.id;
    const isIncome = budget.category?.kind === "income" || budget.category?.kind === "both";
    const progressValue = Math.min(Math.max(budget.progress, 0), 1) * 100;
    
    const cardStyle = budget.status === "over" 
      ? "bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card border-red-200/50 dark:border-red-800/30" 
      : budget.status === "warning" 
        ? "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card border-amber-200/50 dark:border-amber-800/30" 
        : "bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-200/50 dark:border-green-800/30";

    return (
      <Card key={budget.id} className={`${cardStyle} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">
                {budget.product_id ? (
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {budget.product?.name ?? "Товар"}
                  </span>
                ) : budget.account_id ? (
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {budget.account?.name ?? "Кредитная карта"}
                  </span>
                ) : (
                  budget.category?.name ?? "Без категории"
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
              </p>
            </div>
            {!isEditing && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(budget.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing && editForm ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                  >
                    <option value="">— выберите категорию —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Лимит (₽)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.limit_amount}
                    onChange={(e) => setEditForm({ ...editForm, limit_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дата начала</Label>
                  <Input
                    type="date"
                    value={editForm.period_start}
                    onChange={(e) => setEditForm({ ...editForm, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дата окончания</Label>
                  <Input
                    type="date"
                    value={editForm.period_end}
                    onChange={(e) => setEditForm({ ...editForm, period_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Добавьте заметку к бюджету..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Отмена
                </Button>
                <Button onClick={() => handleSaveEdit(budget.id)}>
                  <Save className="h-4 w-4 mr-1" /> Сохранить
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{isIncome ? "План" : "Лимит"}</p>
                  <p className="font-semibold">{formatMoney(budget.limit_minor, budget.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{isIncome ? "Получено" : "Потрачено"}</p>
                  <p className="font-semibold">{formatMoney(budget.spent_minor, budget.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {isIncome
                      ? (budget.remaining_minor < 0 ? "Недобор" : "Сверх плана")
                      : (budget.remaining_minor >= 0 ? "Остаток" : "Перерасход")
                    }
                  </p>
                  <p className={`font-semibold ${budget.remaining_minor < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMoney(Math.abs(budget.remaining_minor), budget.currency)}
                  </p>
                </div>
              </div>

              <div className="relative">
                <Progress value={progressValue} className="h-2" />
                <span className="absolute right-0 -top-5 text-xs text-muted-foreground">
                  {Math.round(progressValue)}%
                </span>
              </div>

              <div className={`flex items-center gap-2 text-xs ${
                budget.status === "over" ? "text-red-600" : budget.status === "warning" ? "text-amber-600" : "text-green-600"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  budget.status === "over" ? "bg-red-500" : budget.status === "warning" ? "bg-amber-500" : "bg-green-500"
                }`} />
                {isIncome
                  ? (budget.progress >= 1 ? "План выполнен" : "План не выполнен")
                  : (budget.status === "over" ? "Лимит превышен" : budget.status === "warning" ? "Осталось менее 15%" : "В пределах лимита")
                }
              </div>

              {budget.notes && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded italic">
                  💬 {budget.notes}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Считаем итоговые суммы
  const totalIncomeLimit = incomeBudgets.reduce((sum, b) => sum + b.limit_minor, 0);
  const totalExpenseLimit = expenseBudgets.reduce((sum, b) => sum + b.limit_minor, 0);
  const totalProductLimit = productBudgets.reduce((sum, b) => sum + b.limit_minor, 0);

  return (
    <div className="space-y-6">
      {incomeBudgets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              💰 Доходы
            </h3>
            <span className="text-sm font-medium text-green-600">
              {formatMoney(totalIncomeLimit, 'RUB')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {incomeBudgets.map(renderBudget)}
          </div>
        </div>
      )}
      
      {expenseBudgets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              💸 Расходы
            </h3>
            <span className="text-sm font-medium text-red-600">
              {formatMoney(totalExpenseLimit, 'RUB')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {expenseBudgets.map(renderBudget)}
          </div>
        </div>
      )}

      {productBudgets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📦 Товары
            </h3>
            <span className="text-sm font-medium text-blue-600">
              {formatMoney(totalProductLimit, 'RUB')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {productBudgets.map(renderBudget)}
          </div>
        </div>
      )}
    </div>
  );
}
