"use client";

import { Debt } from "@/types/debt";
import { DebtCard } from "./DebtCard";
import { DebtFormModal } from "./DebtFormModal";
import { createDebt, updateDebt, deleteDebt } from "@/lib/debts/service";
import { DebtFormSchema } from "@/lib/validation/debt";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./DebtList.module.css";
import { formatMoney } from "@/lib/utils/format";

interface DebtListProps {
  initialDebts: Debt[];
}

export function DebtList({ initialDebts }: DebtListProps) {
  const router = useRouter();
  const [debts, setDebts] = useState(initialDebts);
  const [filter, setFilter] = useState<'all' | 'owe' | 'owed' | 'archive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Синхронизация с начальными данными при обновлении сервера
  useEffect(() => {
    setDebts(initialDebts);
  }, [initialDebts]);

  const filteredDebts = debts.filter(debt => {
    if (filter === 'archive') return debt.status === 'paid';
    if (debt.status === 'paid') return false; // Hide paid from other tabs
    if (filter === 'all') return true;
    return debt.type === filter;
  });

  const stats = {
    owed: debts.filter(d => d.type === 'owed' && d.status !== 'paid').reduce((acc, curr) => acc + (curr.amount - curr.amount_paid), 0),
    owe: debts.filter(d => d.type === 'owe' && d.status !== 'paid').reduce((acc, curr) => acc + (curr.amount - curr.amount_paid), 0),
    overdue: debts.filter(d => d.date_due && new Date(d.date_due) < new Date() && d.status !== 'paid').reduce((acc, curr) => acc + (curr.amount - curr.amount_paid), 0)
  };

  const handleCreate = async (data: DebtFormSchema) => {
    try {
      const newDebt = await createDebt(data);
      setDebts(prev => [newDebt, ...prev]);
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при создании долга');
    }
  };

  const handleUpdate = async (data: DebtFormSchema) => {
    if (!editingDebt) return;
    try {
      const updated = await updateDebt(editingDebt.id, data);
      setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
      setIsModalOpen(false);
      setEditingDebt(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при обновлении');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены?')) return;
    try {
      await deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handlePay = async (debt: Debt) => {
    const amountToPay = (debt.amount - debt.amount_paid) / 100;
    const input = prompt(`Введите сумму оплаты (Остаток: ${amountToPay})`, amountToPay.toString());
    if (input === null) return;
    
    const payAmount = parseFloat(input.replace(',', '.'));
    if (isNaN(payAmount) || payAmount <= 0) {
        alert('Некорректная сумма');
        return;
    }

    try {
        const newAmountPaidMinor = debt.amount_paid + Math.round(payAmount * 100);
        // Ограничиваем чтобы не оплатить больше долга? Или разрешаем? 
        // Обычно нельзя платить больше.
        const finalAmountPaid = Math.min(newAmountPaidMinor, debt.amount);
        
        const newStatus = finalAmountPaid >= debt.amount ? 'paid' : 'partially_paid';
        
        const updated = await updateDebt(debt.id, { 
            amount_paid: finalAmountPaid / 100,
            status: newStatus
        });
        
        setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
        router.refresh();
    } catch (error) {
        console.error(error);
        alert('Ошибка при оплате');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
            <div className={styles.statLabel}>Мне должны</div>
            <div className={`${styles.statValue} ${styles.positive}`}>{formatMoney(stats.owed, 'RUB')}</div>
        </div>
        <div className={styles.statCard}>
            <div className={styles.statLabel}>Я должен</div>
            <div className={`${styles.statValue} ${styles.negative}`}>{formatMoney(stats.owe, 'RUB')}</div>
        </div>
        <div className={styles.statCard}>
            <div className={styles.statLabel}>Просрочено</div>
            <div className={`${styles.statValue} ${styles.textOverdue}`}>{formatMoney(stats.overdue, 'RUB')}</div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.tabs}>
            <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>Все</button>
            <button className={`${styles.tab} ${filter === 'owed' ? styles.activeTab : ''}`} onClick={() => setFilter('owed')}>Мне должны</button>
            <button className={`${styles.tab} ${filter === 'owe' ? styles.activeTab : ''}`} onClick={() => setFilter('owe')}>Я должен</button>
            <button className={`${styles.tab} ${filter === 'archive' ? styles.activeTab : ''}`} onClick={() => setFilter('archive')}>Архив</button>
        </div>
        <button className={styles.addBtn} onClick={() => { setEditingDebt(null); setIsModalOpen(true); }}>
            + Добавить долг
        </button>
      </div>

      <div className={styles.grid}>
        {filteredDebts.map(debt => (
            <DebtCard 
                key={debt.id} 
                debt={debt} 
                onEdit={(d) => { setEditingDebt(d); setIsModalOpen(true); }}
                onDelete={handleDelete}
                onPay={handlePay}
            />
        ))}
        {filteredDebts.length === 0 && (
            <div className={styles.empty}>
                {filter === 'archive' ? 'Архив пуст' : 'Список долгов пуст'}
            </div>
        )}
      </div>

      <DebtFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={editingDebt ? handleUpdate : handleCreate}
        initialData={editingDebt}
      />
    </div>
  );
}
