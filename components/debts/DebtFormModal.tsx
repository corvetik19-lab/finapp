"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Debt } from "@/types/debt";
import { debtFormSchema, DebtFormSchema } from "@/lib/validation/debt";
import styles from "./DebtFormModal.module.css";
import { useEffect } from "react";

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DebtFormSchema) => Promise<void>;
  initialData?: Debt | null;
}

export function DebtFormModal({ isOpen, onClose, onSubmit, initialData }: DebtFormModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      type: 'owe' as const,
      currency: 'RUB',
      stage: 'new' as const,
      // amount is undefined initially to show placeholder or empty
    }
  });

  const type = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue('type', initialData.type);
        setValue('creditor_debtor_name', initialData.creditor_debtor_name);
        setValue('amount', initialData.amount / 100);
        setValue('currency', initialData.currency);
        setValue('date_created', initialData.date_created.split('T')[0]);
        setValue('date_due', initialData.date_due ? initialData.date_due.split('T')[0] : undefined);
        setValue('description', initialData.description || undefined);
      } else {
        reset({
          type: 'owe',
          currency: 'RUB',
          amount: undefined,
          date_created: new Date().toISOString().split('T')[0],
          creditor_debtor_name: '',
          description: ''
        });
      }
    }
  }, [initialData, reset, setValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{initialData ? 'Редактировать долг' : 'Добавить долг'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Тип</label>
            <div className={styles.radioGroup}>
              <label className={`${styles.radioLabel} ${type === 'owe' ? styles.radioActive : ''}`}>
                <input type="radio" value="owe" {...register('type')} className={styles.radioInput} /> 
                Я должен
              </label>
              <label className={`${styles.radioLabel} ${type === 'owed' ? styles.radioActive : ''}`}>
                <input type="radio" value="owed" {...register('type')} className={styles.radioInput} /> 
                Мне должны
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
                {type === 'owe' ? 'Кому должны (Имя кредитора)' : 'Кто должен (Имя должника)'}
            </label>
            <input {...register('creditor_debtor_name')} placeholder="Иван Иванов" className={styles.input} />
            {errors.creditor_debtor_name && <span className={styles.errorText}>{errors.creditor_debtor_name.message}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Сумма</label>
              <input 
                type="number" 
                step="0.01" 
                {...register('amount', { valueAsNumber: true })} 
                className={styles.input}
                placeholder="0.00" 
              />
              {errors.amount && <span className={styles.errorText}>{errors.amount.message}</span>}
            </div>
            <div className={styles.formGroup}>
               <label className={styles.label}>Валюта</label>
               <select {...register('currency')} className={styles.select}>
                 <option value="RUB">RUB</option>
                 <option value="USD">USD</option>
                 <option value="EUR">EUR</option>
               </select>
            </div>
          </div>

          <div className={styles.row}>
             <div className={styles.formGroup}>
                <label className={styles.label}>Дата возникновения</label>
                <input type="date" {...register('date_created')} className={styles.input} />
                {errors.date_created && <span className={styles.errorText}>{errors.date_created.message}</span>}
             </div>
             <div className={styles.formGroup}>
                <label className={styles.label}>Срок возврата</label>
                <input type="date" {...register('date_due')} className={styles.input} />
             </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea {...register('description')} className={styles.textarea} rows={3} placeholder="Детали долга..." />
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Отмена</button>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
