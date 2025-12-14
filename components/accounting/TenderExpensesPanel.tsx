"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Package,
  Wrench,
  Truck,
  Users,
  Building2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  getTenderExpenses,
  addTenderExpense,
  deleteTenderExpense,
  getTenderExpenseSummary,
} from "@/lib/accounting/tender-expenses";
import type { TenderExpense, TenderExpenseSummary } from "@/lib/accounting/tender-expenses-types";
import { EXPENSE_CATEGORIES } from "@/lib/accounting/tender-expenses-types";

interface TenderExpensesPanelProps {
  tenderId: string;
  tenderSubject?: string;
}

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  materials: <Package className="h-4 w-4" />,
  services: <Wrench className="h-4 w-4" />,
  logistics: <Truck className="h-4 w-4" />,
  salary: <Users className="h-4 w-4" />,
  overhead: <Building2 className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

export function TenderExpensesPanel({ tenderId, tenderSubject }: TenderExpensesPanelProps) {
  const { show } = useToast();
  const [expenses, setExpenses] = useState<TenderExpense[]>([]);
  const [summary, setSummary] = useState<TenderExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Форма добавления
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category: "other" as TenderExpense["category"],
    counterparty_name: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesData, summaryData] = await Promise.all([
        getTenderExpenses(tenderId),
        getTenderExpenseSummary(tenderId),
      ]);
      setExpenses(expensesData);
      setSummary(summaryData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const handleAdd = async () => {
    if (!formData.description || !formData.amount) {
      show("Заполните обязательные поля", { type: "error" });
      return;
    }
    
    setSubmitting(true);
    try {
      const amount = Math.round(parseFloat(formData.amount.replace(",", ".")) * 100);
      
      const result = await addTenderExpense({
        tender_id: tenderId,
        source_type: "manual",
        expense_date: formData.expense_date,
        description: formData.description,
        amount,
        category: formData.category,
        counterparty_name: formData.counterparty_name || undefined,
      });
      
      if (result.success) {
        show("Расход добавлен", { type: "success" });
        setIsAddOpen(false);
        setFormData({
          expense_date: new Date().toISOString().split("T")[0],
          description: "",
          amount: "",
          category: "other",
          counterparty_name: "",
        });
        loadData();
      } else {
        show(result.error || "Ошибка", { type: "error" });
      }
    } catch {
      show("Ошибка при добавлении", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить расход?")) return;
    
    const result = await deleteTenderExpense(id);
    if (result.success) {
      show("Расход удалён", { type: "success" });
      loadData();
    } else {
      show(result.error || "Ошибка", { type: "error" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Сводка */}
      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Финансовая сводка</CardTitle>
            {tenderSubject && (
              <CardDescription className="truncate">{tenderSubject}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">Цена контракта</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatMoney(summary.contract_price)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700">Расходы</p>
                <p className="text-lg font-bold text-red-600">
                  {formatMoney(summary.total_expenses)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${summary.gross_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-xs ${summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Валовая прибыль
                </p>
                <p className={`text-lg font-bold ${summary.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(summary.gross_profit)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${summary.margin_percent >= 20 ? 'bg-green-50' : summary.margin_percent >= 10 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <p className={`text-xs ${summary.margin_percent >= 20 ? 'text-green-700' : summary.margin_percent >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>
                  Маржа
                </p>
                <div className="flex items-center gap-1">
                  {summary.margin_percent >= 0 ? (
                    <TrendingUp className={`h-4 w-4 ${summary.margin_percent >= 20 ? 'text-green-600' : summary.margin_percent >= 10 ? 'text-yellow-600' : 'text-red-600'}`} />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <p className={`text-lg font-bold ${summary.margin_percent >= 20 ? 'text-green-600' : summary.margin_percent >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {summary.margin_percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Разбивка по категориям */}
            <div className="mt-4 grid gap-2 md:grid-cols-6">
              {EXPENSE_CATEGORIES.map(cat => {
                const amount = summary[cat.value as keyof TenderExpenseSummary] as number;
                if (amount === 0) return null;
                return (
                  <div key={cat.value} className="flex items-center gap-2 text-sm">
                    {CATEGORY_ICONS[cat.value]}
                    <span className="text-muted-foreground">{cat.label}:</span>
                    <span className="font-medium">{formatMoney(amount)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список расходов */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Расходы по тендеру</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить расход
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить расход</DialogTitle>
                  <DialogDescription>
                    Укажите данные расхода по тендеру
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Дата *</Label>
                      <Input
                        type="date"
                        value={formData.expense_date}
                        onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Категория</Label>
                      <Select
                        value={formData.category}
                        onValueChange={v => setFormData({ ...formData, category: v as TenderExpense["category"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                {CATEGORY_ICONS[cat.value]}
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Описание *</Label>
                    <Input
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Описание расхода"
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Сумма (₽) *</Label>
                      <Input
                        type="text"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Контрагент</Label>
                      <Input
                        value={formData.counterparty_name}
                        onChange={e => setFormData({ ...formData, counterparty_name: e.target.value })}
                        placeholder="Название"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAdd} disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      "Добавить"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {CATEGORY_ICONS[exp.category]}
                        {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {exp.counterparty_name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatMoney(exp.amount)}
                    </TableCell>
                    <TableCell>
                      {exp.source_type === "manual" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(exp.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Нет расходов по этому тендеру</p>
              <p className="text-sm mt-1">
                Добавьте расходы вручную или привяжите документы
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
