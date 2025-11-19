"use client";

import { Debt } from "@/types/debt";
import { formatMoney } from "@/lib/utils/format";
import styles from "./DebtCard.module.css";

interface DebtCardProps {
  debt: Debt;
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onPay: (debt: Debt) => void;
}

export function DebtCard({ debt, onEdit, onDelete, onPay }: DebtCardProps) {
  const isOwed = debt.type === 'owed';
  const isOverdue = debt.date_due && new Date(debt.date_due) < new Date() && debt.status !== 'paid';
  const percentPaid = Math.min(100, Math.round((debt.amount_paid / debt.amount) * 100));
  
  const statusLabel = {
    'active': 'Активен',
    'paid': 'Оплачен',
    'partially_paid': 'Частично оплачен'
  }[debt.status];

  return (
    <div className={`${styles.card} ${isOverdue ? styles.overdue : ''} ${debt.status === 'paid' ? styles.paidCard : ''}`}>
        <div className={styles.header}>
            <div className={`${styles.typeBadge} ${isOwed ? styles.typeOwed : styles.typeOwe}`}>
                {isOwed ? "Мне должны" : "Я должен"}
            </div>
            <div className={styles.actions}>
                {debt.status !== 'paid' && (
                    <button className={styles.actionBtn} onClick={() => onPay(debt)} title="Внести оплату">💰</button>
                )}
                <button className={styles.actionBtn} onClick={() => onEdit(debt)} title="Редактировать">✏️</button>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(debt.id)} title="Удалить">🗑️</button>
            </div>
        </div>
        
        <div className={styles.body}>
            <h3 className={styles.name}>{debt.creditor_debtor_name}</h3>
            
            <div className={styles.amountRow}>
                <span className={`${styles.amount} ${isOwed ? styles.positive : styles.negative}`}>
                    {formatMoney(debt.amount, debt.currency)}
                </span>
            </div>

            {debt.description && <p className={styles.description}>{debt.description}</p>}
            
            <div className={styles.meta}>
                {debt.date_due && (
                    <div className={`${styles.metaItem} ${isOverdue ? styles.textOverdue : ''}`}>
                        <span className={styles.icon}>📅</span>
                        Срок: {new Date(debt.date_due).toLocaleDateString('ru-RU')}
                    </div>
                )}
                <div className={`${styles.metaItem} ${styles.statusBadge} ${styles[debt.status]}`}>
                    {statusLabel}
                </div>
            </div>

            <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                    <span>Оплачено: {formatMoney(debt.amount_paid, debt.currency)}</span>
                    <span>{percentPaid}%</span>
                </div>
                <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{ width: `${percentPaid}%` }}></div>
                </div>
            </div>
        </div>
    </div>
  );
}
