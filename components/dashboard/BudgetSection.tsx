"use client";

import { useEffect, useState } from "react";
import BudgetStatusWidget from "@/components/dashboard/BudgetStatusWidget";
import { BudgetWithUsage } from "@/lib/budgets/service";
import BudgetQuickAddForm from "@/components/dashboard/BudgetQuickAddForm";
import { CategoryRecord } from "@/lib/categories/service";
import { deleteBudgetAction } from "@/app/(protected)/finance/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Wallet } from "lucide-react";

export type BudgetSectionProps = {
  budgets: BudgetWithUsage[];
  categories: CategoryRecord[];
  currency: string;
};

export default function BudgetSection({ budgets, categories, currency }: BudgetSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<BudgetWithUsage[]>(budgets);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalBudgets(budgets);
  }, [budgets]);

  const handleSuccess = (budget: BudgetWithUsage) => {
    setLocalBudgets((prev) => [budget, ...prev.filter((item) => item.id !== budget.id)]);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить бюджет?")) return;

    setDeletingId(id);
    try {
      const result = await deleteBudgetAction(id);
      if (result.success) {
        setLocalBudgets((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(result.error || "Не удалось удалить бюджет");
      }
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить бюджет");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Бюджет на месяц
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsFormOpen((prev) => !prev)}>
            {isFormOpen ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {isFormOpen ? "Отмена" : "Добавить"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isFormOpen && (
          <BudgetQuickAddForm
            currency={currency}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
        <BudgetStatusWidget
          budgets={localBudgets}
          currency={currency}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </CardContent>
    </Card>
  );
}
