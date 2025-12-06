"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Loader2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer" | "both";
};

type NetProfitCategory = {
  name: string;
  categoryId: string;
  displayId: string;
};

type CreditCard = {
  id: string;
  name: string;
  type: string;
};

type BudgetFormProps = {
  categories: Category[];
  netProfitCategories?: NetProfitCategory[];
  creditCards?: CreditCard[];
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function BudgetForm({ categories, netProfitCategories = [], creditCards = [], onSubmit }: BudgetFormProps) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    
    // Первый день месяца
    const firstDay = `${year}-${month}-01`;
    
    // Последний день месяца
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;
    
    setPeriodStart(firstDay);
    setPeriodEnd(lastDayStr);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const form = e.currentTarget;
    
    try {
      const formData = new FormData(form);
      await onSubmit(formData);
      
      // Показываем уведомление
      showToast("✅ Бюджет успешно создан", { type: "success" });
      
      // Очищаем форму перед refresh
      setPeriodStart("");
      setPeriodEnd("");
      if (form) {
        form.reset();
      }
      
      // Обновляем страницу (это может размонтировать компонент)
      router.refresh();
    } catch (error) {
      console.error("Error creating budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${errorMessage}`, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Создать бюджет</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Категория</Label>
            <select 
              name="category_id" 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">— выберите категорию —</option>
              {netProfitCategories.length > 0 && (
                <optgroup label="📊 Чистая прибыль (доход - расход)">
                  {netProfitCategories.map((cat) => (
                    <option key={cat.displayId} value={cat.displayId}>{cat.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="💰 Доходы">
                {categories.filter(c => c.kind === "income").map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </optgroup>
              <optgroup label="💸 Расходы">
                {categories.filter(c => c.kind === "expense").map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </optgroup>
              {creditCards.length > 0 && (
                <optgroup label="💳 Кредитные карты">
                  {creditCards.map((card) => (
                    <option key={`acc_${card.id}`} value={`acc_${card.id}`}>{card.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Начало</Label>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={setCurrentMonth} title="Текущий месяц">
                <Calendar className="h-3 w-3" />
              </Button>
            </div>
            <Input
              type="date"
              name="period_start"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Окончание</Label>
            <Input
              type="date"
              name="period_end"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Лимит (₽)</Label>
            <Input type="text" name="limit_amount" inputMode="decimal" required />
          </div>
          
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Комментарий (необязательно)</Label>
            <textarea 
              name="notes" 
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Добавьте заметку к бюджету..."
            />
          </div>
          
          <input type="hidden" name="currency" value="RUB" />
          
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Сохранение..." : "Сохранить бюджет"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
