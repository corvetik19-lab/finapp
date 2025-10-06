"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Loan, LoanSummary } from "@/lib/loans/types";
import { formatMoney } from "@/lib/utils/format";
import LoanFormModal from "@/components/loans/LoanFormModal";
import LoanRepayModal from "@/components/loans/LoanRepayModal";
import styles from "./Loans.module.css";

type LoansPageClientProps = {
  loans: Loan[];
  summary: LoanSummary;
};

export default function LoansPageClient({ loans, summary }: LoansPageClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "paid">("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

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
      router.refresh();
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
    router.refresh();
  };

  const handleRepaySuccess = () => {
    router.refresh();
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.topBar}>
        <h1 className={styles.pageTitle}>Кредиты</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.addBtn} onClick={handleOpenAddModal}>
            <span className="material-icons">add</span>
            Добавить кредит
          </button>
          <button className={styles.repayBtn} onClick={() => setIsRepayModalOpen(true)}>
            <span className="material-icons">payments</span>
            Погасить кредит
          </button>
        </div>
      </header>

      {/* Статистика */}
      <div className={styles.summaryContainer}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>Общий долг</div>
          <div className={styles.summaryValue}>{formatMoney(summary.totalDebt * 100, "RUB")}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>Ежемесячный платёж</div>
          <div className={styles.summaryValue}>{formatMoney(summary.monthlyPayment * 100, "RUB")}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>Ближайший платёж</div>
          <div className={styles.summaryValue}>
            {summary.nextPayment ? formatMoney(summary.nextPayment.amount * 100, "RUB") : "—"}
          </div>
          {summary.nextPayment && (
            <div className={styles.summaryChange}>через {summary.nextPayment.daysUntil} дн.</div>
          )}
        </div>
      </div>

      {/* Список кредитов */}
      <div className={styles.loansContainer}>
        <div className={styles.loansHeader}>
          <div className={styles.loansTitle}>Мои кредиты ({filteredLoans.length})</div>
          <div className={styles.loansFilters}>
            <button className={filter === "all" ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter("all")}>
              Все
            </button>
            <button className={filter === "active" ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter("active")}>
              Активные
            </button>
            <button className={filter === "paid" ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter("paid")}>
              Погашенные
            </button>
          </div>
        </div>

        {filteredLoans.length === 0 && (
          <div className={styles.emptyState}>
            <span className="material-icons" style={{ fontSize: 48, color: "#ccc", marginBottom: 12 }}>
              account_balance
            </span>
            <p>Нет кредитов</p>
          </div>
        )}

        {filteredLoans.map((loan) => (
          <div key={loan.id} className={styles.loanItem}>
            <div className={styles.loanHeader}>
              <div className={styles.loanName}>{loan.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className={styles.loanStatus}>{loan.status === "active" ? "Активен" : "Погашен"}</div>
                <button className={styles.editBtn} onClick={() => handleOpenEditModal(loan)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                  Изменить
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(loan.id)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
            
            <div className={styles.loanDetails}>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Сумма кредита</div>
                <div className={styles.loanDetailValue}>{formatMoney(loan.principalAmount * 100, loan.currency)}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Остаток долга</div>
                <div className={styles.loanDetailValue}>{formatMoney(loan.remainingDebt * 100, loan.currency)}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Процентная ставка</div>
                <div className={styles.loanDetailValue}>{loan.interestRate}%</div>
              </div>
            </div>

            <div className={styles.loanDetails}>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Ежемесячный платёж</div>
                <div className={styles.loanDetailValue}>{formatMoney(loan.monthlyPayment * 100, loan.currency)}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Следующий платёж</div>
                <div className={styles.loanDetailValue}>{formatDate(loan.nextPaymentDate)}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Банк</div>
                <div className={styles.loanDetailValue}>{loan.bank}</div>
              </div>
            </div>

            <div className={styles.loanDetails}>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Дата выдачи</div>
                <div className={styles.loanDetailValue}>{formatDate(loan.issueDate)}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Срок кредита</div>
                <div className={styles.loanDetailValue}>{loan.termMonths ? `${loan.termMonths} мес` : "—"}</div>
              </div>
              <div className={styles.loanDetail}>
                <div className={styles.loanDetailLabel}>Дата окончания</div>
                <div className={styles.loanDetailValue}>{formatDate(loan.endDate)}</div>
              </div>
            </div>

            <div className={styles.loanProgress}>
              <div className={styles.loanProgressBar} style={{ width: `${loan.progressPercent}%` }} />
              <div className={styles.loanProgressLabel} style={{ left: `${loan.progressPercent}%` }}>
                {loan.progressPercent}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальные окна */}
      <LoanFormModal
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSuccess={handleFormSuccess}
        loan={editingLoan}
      />

      <LoanRepayModal
        open={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        onSuccess={handleRepaySuccess}
        loans={loans}
      />
    </div>
  );
}
