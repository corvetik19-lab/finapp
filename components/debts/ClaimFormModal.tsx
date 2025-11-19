"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Debt, CLAIM_STAGE_LABELS } from "@/types/debt";
import { debtFormSchema, DebtFormSchema } from "@/lib/validation/debt";
import styles from "./ClaimFormModal.module.css";
import { useEffect, useState } from "react";
import { getTenders } from "@/lib/debts/service";

interface ClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DebtFormSchema) => Promise<void>;
  initialData?: Debt | null;
}

export function ClaimFormModal({ isOpen, onClose, onSubmit, initialData }: ClaimFormModalProps) {
  const [tenders, setTenders] = useState<Array<{ id: string; number: string; title: string }>>([]);
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      type: 'owed' as const, // По умолчанию "Мне должны" для претензий
      currency: 'RUB', // Всегда RUB по умолчанию
      stage: 'new' as const,
    }
  });

  const type = watch('type');

  useEffect(() => {
    if (isOpen) {
      // Загружаем список тендеров
      getTenders().then(setTenders).catch(console.error);
      
      if (initialData) {
        setValue('type', initialData.type);
        setValue('creditor_debtor_name', initialData.creditor_debtor_name);
        setValue('amount', initialData.amount / 100);
        setValue('currency', initialData.currency);
        setValue('date_created', initialData.date_created.split('T')[0]);
        setValue('date_due', initialData.date_due ? initialData.date_due.split('T')[0] : undefined);
        setValue('description', initialData.description || undefined);
        setValue('tender_id', initialData.tender_id || undefined);
        setValue('application_number', initialData.application_number || undefined);
        setValue('contract_number', initialData.contract_number || undefined);
        setValue('stage', initialData.stage);
        setValue('plaintiff', initialData.plaintiff || undefined);
        setValue('defendant', initialData.defendant || undefined);
        setValue('comments', initialData.comments || undefined);
      } else {
        reset({
          type: 'owed',
          currency: 'RUB', // Всегда RUB
          stage: 'new',
          amount: undefined,
          date_created: new Date().toISOString().split('T')[0],
          creditor_debtor_name: '',
          description: '',
          tender_id: undefined,
          application_number: undefined,
          contract_number: undefined,
          plaintiff: undefined,
          defendant: undefined,
          comments: undefined,
        });
      }
    }
  }, [initialData, reset, setValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>{initialData ? 'Редактировать претензию' : 'Добавить претензию'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Тип долга */}
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

          {/* Связь с тендером */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Тендер (название)</label>
            <select {...register('tender_id')} className={styles.select}>
              <option value="">Выберите тендер с просроченной оплатой</option>
              {tenders.map(tender => (
                <option key={tender.id} value={tender.id}>
                  {tender.number} - {tender.title}
                </option>
              ))}
            </select>
          </div>

          {/* Номера заявки и договора */}
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>№ Заявки</label>
              <input {...register('application_number')} placeholder="Номер заявки" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>№ Договора</label>
              <input {...register('contract_number')} placeholder="Номер договора" className={styles.input} />
            </div>
          </div>

          {/* Истец и ответчик */}
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Истец</label>
              <input {...register('plaintiff')} placeholder="Наша организация" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ответчик (должник)</label>
              <input {...register('defendant')} placeholder="Должник" className={styles.input} />
            </div>
          </div>

          {/* Имя кредитора/должника (основное поле) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {type === 'owe' ? 'Кому должны (Имя кредитора)' : 'Кто должен (Имя должника)'}
            </label>
            <input {...register('creditor_debtor_name')} placeholder="Иван Иванов" className={styles.input} />
            {errors.creditor_debtor_name && <span className={styles.errorText}>{errors.creditor_debtor_name.message}</span>}
          </div>

          {/* Сумма долга */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Основной долг (сумма в рублях)</label>
            <input 
              type="number" 
              step="0.01" 
              {...register('amount', { valueAsNumber: true })} 
              className={styles.input}
              placeholder="0.00" 
            />
            {errors.amount && <span className={styles.errorText}>{errors.amount.message}</span>}
            {/* Скрытое поле для валюты - всегда RUB */}
            <input type="hidden" {...register('currency')} value="RUB" />
          </div>

          {/* Даты */}
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

          {/* Этап взыскания */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Этап взыскания</label>
            <select {...register('stage')} className={styles.select}>
              <option value="new">{CLAIM_STAGE_LABELS.new}</option>
              <option value="claim">{CLAIM_STAGE_LABELS.claim}</option>
              <option value="court">{CLAIM_STAGE_LABELS.court}</option>
              <option value="writ">{CLAIM_STAGE_LABELS.writ}</option>
              <option value="bailiff">{CLAIM_STAGE_LABELS.bailiff}</option>
              <option value="paid">{CLAIM_STAGE_LABELS.paid}</option>
            </select>
          </div>

          {/* Описание */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea {...register('description')} className={styles.textarea} rows={2} placeholder="Детали долга..." />
          </div>

          {/* Комментарии */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Комментарии</label>
            <textarea {...register('comments')} className={styles.textarea} rows={3} placeholder="Комментарии по претензии..." />
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
