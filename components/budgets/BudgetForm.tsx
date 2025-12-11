"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, CalendarDays } from "lucide-react";

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

type ProductItem = {
  id: string;
  name: string;
};

type BudgetFormProps = {
  categories: Category[];
  netProfitCategories?: NetProfitCategory[];
  creditCards?: CreditCard[];
  products?: ProductItem[];
  onSubmit: (formData: FormData) => Promise<void>;
};

// Форматировать дату в YYYY-MM-DD (локальное время)
function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Получить период месяца по смещению (0 = текущий, 1 = следующий)
function getMonthPeriod(offset: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  return {
    start: formatLocalDate(firstDay),
    end: formatLocalDate(lastDay),
    label: firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    value: `${offset}`,
  };
}

// Получить доступные месяцы (текущий и следующий)
function getAvailableMonths() {
  return [
    getMonthPeriod(0), // Текущий
    getMonthPeriod(1), // Следующий
  ];
}

export default function BudgetForm({ categories, netProfitCategories = [], creditCards = [], products = [], onSubmit }: BudgetFormProps) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  
  // Доступные месяцы (текущий и следующий)
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const selectedPeriod = useMemo(() => getMonthPeriod(selectedMonthOffset), [selectedMonthOffset]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const form = e.currentTarget;
    
    try {
      const formData = new FormData(form);
      
      // Устанавливаем период выбранного месяца
      formData.set('period_start', selectedPeriod.start);
      formData.set('period_end', selectedPeriod.end);
      
      await onSubmit(formData);
      
      // Показываем уведомление
      showToast("✅ Бюджет успешно создан", { type: "success" });
      
      // Очищаем форму перед refresh
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
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Создать бюджет
        </CardTitle>
        <CardDescription>
          Выберите месяц и категорию или товар для бюджета
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Месяц</Label>
            <select 
              value={selectedMonthOffset}
              onChange={(e) => setSelectedMonthOffset(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
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
              {products.length > 0 && (
                <optgroup label="📦 Товары">
                  {products.map((product) => (
                    <option key={`prod_${product.id}`} value={`prod_${product.id}`}>{product.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Лимит (₽)</Label>
            <Input type="text" name="limit_amount" inputMode="decimal" placeholder="0" required />
          </div>
          
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>Комментарий</Label>
            <Input 
              name="notes" 
              placeholder="Заметка..."
            />
          </div>
          
          <input type="hidden" name="currency" value="RUB" />
          
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Сохранение..." : "Добавить бюджет"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
