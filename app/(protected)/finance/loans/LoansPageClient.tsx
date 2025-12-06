"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Loan, LoanSummary } from "@/lib/loans/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, Building2, Pencil, Trash2, Receipt, CheckCircle, Calendar, Percent, CreditCard, Clock, Landmark } from "lucide-react";
import LoanFormModal from "@/components/loans/LoanFormModal";
import LoanRepayModal from "@/components/loans/LoanRepayModal";
import LoanTransactionsModal from "@/components/loans/LoanTransactionsModal";
import { useToast } from "@/components/toast/ToastContext";

type LoansPageClientProps = {
  loans: Loan[];
  summary: LoanSummary;
};

export default function LoansPageClient({ loans, summary }: LoansPageClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "paid">("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [transactionsModalLoan, setTransactionsModalLoan] = useState<Loan | null>(null);

  const filteredLoans = loans.filter((loan) => {
    if (filter === "all") return true;
    return loan.status === filter;
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить кредит?")) return;

    const res = await fetch(`/api/loans?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show("Кредит удалён", { type: "success" });
      router.refresh();
    } else {
      toast.show("Ошибка при удалении кредита", { type: "error" });
    }
  };

  const handleOpenAddModal = () => {
    setEditingLoan(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingLoan(null);
  };

  const handleFormSuccess = () => {
    toast.show("Кредит сохранён", { type: "success" });
    router.refresh();
  };

  const handleRepaySuccess = () => {
    toast.show("Платёж записан", { type: "success" });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Кредиты</h1>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddModal}><Plus className="h-4 w-4 mr-1" />Добавить кредит</Button>
          <Button variant="outline" onClick={() => setIsRepayModalOpen(true)}><Wallet className="h-4 w-4 mr-1" />Погасить кредит</Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><CreditCard className="h-5 w-5 text-red-600" /></div>
              <div><div className="text-sm text-muted-foreground">Общий долг</div><div className="text-xl font-bold">{formatMoney(summary.totalDebt * 100, "RUB")}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Calendar className="h-5 w-5 text-blue-600" /></div>
              <div><div className="text-sm text-muted-foreground">Ежемесячный платёж</div><div className="text-xl font-bold">{formatMoney(summary.monthlyPayment * 100, "RUB")}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <div className="text-sm text-muted-foreground">Ближайший платёж</div>
                <div className="text-xl font-bold">{summary.nextPayment ? formatMoney(summary.nextPayment.amount * 100, "RUB") : "—"}</div>
                {summary.nextPayment && <div className="text-xs text-muted-foreground">через {summary.nextPayment.daysUntil} дн.</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список кредитов */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Мои кредиты ({filteredLoans.length})</CardTitle>
            <div className="flex gap-1">
              <Button variant={filter === "all" ? "default" : "ghost"} size="sm" onClick={() => setFilter("all")}>Все</Button>
              <Button variant={filter === "active" ? "default" : "ghost"} size="sm" onClick={() => setFilter("active")}>Активные</Button>
              <Button variant={filter === "paid" ? "default" : "ghost"} size="sm" onClick={() => setFilter("paid")}>Погашенные</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredLoans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Landmark className="h-12 w-12 mb-3 opacity-50" />
              <p>Нет кредитов</p>
            </div>
          )}

          {filteredLoans.map((loan) => (
            <div key={loan.id} className="p-4 rounded-lg border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg">{loan.name}</div>
                <div className="flex items-center gap-2">
                  {loan.isPaidThisMonth ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="h-3 w-3" />Оплачено</span>
                  ) : (
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", loan.status === "active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700")}>{loan.status === "active" ? "Активен" : "Погашен"}</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setTransactionsModalLoan(loan)}><Receipt className="h-4 w-4 mr-1" />Транзакции</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(loan)}><Pencil className="h-4 w-4 mr-1" />Изменить</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(loan.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div><div className="text-xs text-muted-foreground">Сумма кредита</div><div className="font-medium">{formatMoney(loan.principalAmount * 100, loan.currency)}</div></div>
                <div><div className="text-xs text-muted-foreground">Остаток долга</div><div className="font-medium text-red-600">{formatMoney(loan.remainingDebt * 100, loan.currency)}</div></div>
                <div><div className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Ставка</div><div className="font-medium">{loan.interestRate}%</div></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><div className="text-xs text-muted-foreground">Ежемесячный платёж</div><div className="font-medium">{formatMoney(loan.monthlyPayment * 100, loan.currency)}</div></div>
                <div><div className="text-xs text-muted-foreground">Следующий платёж</div><div className="font-medium">{formatDate(loan.nextPaymentDate)}</div></div>
                <div><div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Банк</div><div className="font-medium">{loan.bank}</div></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><div className="text-xs text-muted-foreground">Дата выдачи</div><div className="font-medium">{formatDate(loan.issueDate)}</div></div>
                <div><div className="text-xs text-muted-foreground">Срок кредита</div><div className="font-medium">{loan.termMonths ? `${loan.termMonths} мес` : "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Дата окончания</div><div className="font-medium">{formatDate(loan.endDate)}</div></div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Прогресс погашения</span><span className="font-medium">{loan.progressPercent}%</span></div>
                <Progress value={loan.progressPercent} className="h-2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Модальные окна */}
      <LoanFormModal open={isFormModalOpen} onClose={handleCloseFormModal} onSuccess={handleFormSuccess} loan={editingLoan} />
      <LoanRepayModal open={isRepayModalOpen} onClose={() => setIsRepayModalOpen(false)} onSuccess={handleRepaySuccess} loans={loans} />
      {transactionsModalLoan && <LoanTransactionsModal isOpen={true} onClose={() => setTransactionsModalLoan(null)} loan={transactionsModalLoan} />}
    </div>
  );
}
