"use client";

import { useState } from "react";
import type { Debt } from "@/lib/debts/types";
import styles from "@/app/(protected)/debts/Debts.module.css";
import { createDebt, updateDebt } from "@/app/(protected)/debts/actions";

type DebtFormModalProps = {
  debt: Debt | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DebtFormModal({ debt, onClose, onSuccess }: DebtFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: debt?.type || ("owe" as "owe" | "owed"),
    creditor_debtor_name: debt?.creditorDebtorName || "",
    amount: debt ? String(debt.amount) : "",
    currency: debt?.currency || "RUB",
    date_created: debt?.dateCreated || new Date().toISOString().split("T")[0],
    date_due: debt?.dateDue || "",
    description: debt?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const formDataObj = new FormData();
      
      if (debt) {
        formDataObj.append("id", debt.id);
      }
      
      formDataObj.append("type", formData.type);
      formDataObj.append("creditor_debtor_name", formData.creditor_debtor_name);
      formDataObj.append("amount", formData.amount);
      formDataObj.append("currency", formData.currency);
      formDataObj.append("date_created", formData.date_created);
      if (formData.date_due) {
        formDataObj.append("date_due", formData.date_due);
      }
      if (formData.description) {
        formDataObj.append("description", formData.description);
      }

      if (debt) {
        await updateDebt(formDataObj);
      } else {
        await createDebt(formDataObj);
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Не удалось сохранить долг");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {debt ? "Редактировать долг" : "Добавить долг"}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Тип долга</label>
            <div className={styles.radioGroup}>
              <label
                className={`${styles.radioLabel} ${formData.type === "owe" ? styles.radioLabelChecked : ""}`}
              >
                <input
                  type="radio"
                  name="type"
                  value="owe"
                  checked={formData.type === "owe"}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "owe" })}
                  required
                />
                Вы должны
              </label>
              <label
                className={`${styles.radioLabel} ${formData.type === "owed" ? styles.radioLabelChecked : ""}`}
              >
                <input
                  type="radio"
                  name="type"
                  value="owed"
                  checked={formData.type === "owed"}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "owed" })}
                  required
                />
                Вам должны
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              {formData.type === "owe" ? "Кредитор (кому должны)" : "Должник (кто должен)"}
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.creditor_debtor_name}
              onChange={(e) => setFormData({ ...formData, creditor_debtor_name: e.target.value })}
              placeholder="Имя человека или организации"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Сумма (₽)</label>
            <input
              type="number"
              className={styles.input}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Дата создания долга</label>
            <input
              type="date"
              className={styles.input}
              value={formData.date_created}
              onChange={(e) => setFormData({ ...formData, date_created: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Срок возврата (опционально)</label>
            <input
              type="date"
              className={styles.input}
              value={formData.date_due}
              onChange={(e) => setFormData({ ...formData, date_due: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание (опционально)</label>
            <textarea
              className={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительная информация о долге"
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
              <span className="material-icons" aria-hidden>
                save
              </span>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
