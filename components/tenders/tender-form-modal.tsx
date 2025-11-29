'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { createTenderSchema } from '@/lib/tenders/validation';
import type { TenderType, Tender, TenderStageTemplate } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { useToast } from '@/components/toast/ToastContext';
import styles from './tender-form-modal.module.css';

interface Platform {
  id: string;
  name: string;
  short_name: string | null;
}

interface TenderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  types: TenderType[];
  templates?: TenderStageTemplate[]; // Шаблоны этапов
  managers?: Array<{ id: string; full_name: string; role?: string }>;
  platforms?: Platform[]; // Справочник площадок
  tender?: Tender | null; // Для режима редактирования
  eisData?: EISTenderData | null; // Данные из ЕИС для автозаполнения
  mode?: 'create' | 'edit';
}

export function TenderFormModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  types,
  templates = [],
  managers = [],
  platforms = [],
  tender = null,
  eisData = null,
  mode = 'create',
}: TenderFormModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [existingTenderWarning, setExistingTenderWarning] = useState<string | null>(null);
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('system');
  const [isTemplateLockedByType, setIsTemplateLockedByType] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(createTenderSchema),
    defaultValues: {
      company_id: companyId,
      responsible_ids: [],
    },
  });

  const watchedTypeId = watch('type_id');

  // Заполняем форму при редактировании или данными из ЕИС
  useEffect(() => {
    if (mode === 'edit' && tender && isOpen) {
      reset({
        company_id: tender.company_id,
        purchase_number: tender.purchase_number,
        subject: tender.subject,
        customer: tender.customer,
        nmck: tender.nmck / 100, // копейки -> рубли
        submission_deadline: tender.submission_deadline.slice(0, 16), // datetime-local format
        stage_id: tender.stage_id,
        project_name: tender.project_name || undefined,
        method: tender.method || undefined,
        type_id: tender.type_id || undefined,
        city: tender.city || undefined,
        platform: tender.platform || undefined,
        platform_id: tender.platform_id || undefined,
        our_price: tender.our_price ? tender.our_price / 100 : undefined, // копейки -> рубли
        contract_price: tender.contract_price ? tender.contract_price / 100 : undefined, // копейки -> рубли
        application_security: tender.application_security ? tender.application_security / 100 : undefined, // копейки -> рубли
        contract_security: tender.contract_security ? tender.contract_security / 100 : undefined, // копейки -> рубли
        auction_date: tender.auction_date?.slice(0, 16),
        results_date: tender.results_date?.slice(0, 16),
        review_date: tender.review_date?.slice(0, 16),
        manager_id: tender.manager_id || undefined,
        specialist_id: tender.specialist_id || undefined,
        investor_id: tender.investor_id || undefined,
        executor_id: tender.executor_id || undefined,
        comment: tender.comment || undefined,
        tags: tender.tags || undefined,
      });
      
      // Устанавливаем выбранный шаблон
      if (tender.template_id) {
        setSelectedTemplateId(tender.template_id);
      } else {
        setSelectedTemplateId('system');
      }
    } else if (mode === 'create' && eisData && isOpen) {
      // Автозаполнение данными из ЕИС
      const typeId = types.find(t => 
        t.name.includes(eisData.tender_type || '')
      )?.id;

      reset({
        company_id: companyId,
        purchase_number: eisData.purchase_number,
        subject: eisData.subject,
        customer: eisData.customer,
        nmck: eisData.nmck,
        submission_deadline: eisData.submission_deadline?.slice(0, 16),
        platform: eisData.platform,
        method: eisData.procurement_method,
        type_id: typeId,
        application_security: eisData.bid_security,
        contract_security: eisData.contract_security,
        auction_date: eisData.auction_date?.slice(0, 16),
        results_date: eisData.results_date?.slice(0, 16),
        review_date: eisData.application_review_date?.slice(0, 16),
      });
    } else if (mode === 'create' && isOpen) {
      reset({
        company_id: companyId,
      });
    }
  }, [mode, tender, eisData, isOpen, reset, companyId, types]);

  // Автоматический выбор шаблона ЗМО при выборе типа ЗМО и обновление списка способов определения
  useEffect(() => {
    if (!watchedTypeId) {
      setIsTemplateLockedByType(prev => {
        if (prev !== false) return false;
        return prev;
      });
      setAvailableMethods(prev => {
        if (prev.length !== 0) return [];
        return prev;
      });
      return;
    }

    const selectedType = types.find(t => t.id === watchedTypeId);
    
    // Обновляем список доступных способов определения
    let newMethods: string[] = [];
    if (selectedType?.methods && selectedType.methods.length > 0) {
      newMethods = selectedType.methods.map(m => m.name);
    } else if (selectedType?.procurement_methods) {
      // Fallback для старого формата (если есть)
      newMethods = selectedType.procurement_methods;
    }
    
    setAvailableMethods(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newMethods)) return prev;
      return newMethods;
    });
    
    // Автовыбор шаблона в зависимости от типа закупки
    if (selectedType?.name === 'ЗМО') {
      const zmoTemplate = templates.find(t => t.name === 'ЗМО');
      if (zmoTemplate) {
        setSelectedTemplateId(prev => {
          if (prev !== zmoTemplate.id) return zmoTemplate.id;
          return prev;
        });
        setIsTemplateLockedByType(prev => {
          if (prev !== true) return true;
          return prev;
        });
      }
    } else if (selectedType?.name === 'ФЗ-44' || selectedType?.name === 'ФЗ-223') {
      // Ищем шаблон по точному имени или по вхождению (для надежности)
      const systemTemplate = templates.find(t => 
        t.name === 'Системный (ФЗ-44/223)' || 
        (t.is_system && t.name.includes('ФЗ-44/223'))
      );
      if (systemTemplate) {
        setSelectedTemplateId(prev => {
          if (prev !== systemTemplate.id) return systemTemplate.id;
          return prev;
        });
        setIsTemplateLockedByType(prev => {
          if (prev !== true) return true;
          return prev;
        });
      }
    } else {
      setIsTemplateLockedByType(prev => {
        if (prev !== false) return false;
        return prev;
      });
    }
  }, [watchedTypeId, types, templates]);

  // Функция проверки существования номера тендера
  const checkTenderNumber = async (purchaseNumber: string) => {
    if (!purchaseNumber || purchaseNumber.trim() === '') {
      setExistingTenderWarning(null);
      return;
    }

    // Не проверяем в режиме редактирования если номер не изменился
    if (mode === 'edit' && tender && tender.purchase_number === purchaseNumber) {
      setExistingTenderWarning(null);
      return;
    }

    try {
      setCheckingNumber(true);
      const response = await fetch(`/api/tenders/check-number?purchase_number=${encodeURIComponent(purchaseNumber)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setExistingTenderWarning(`⚠️ В системе уже есть тендер с номером ${purchaseNumber}`);
        } else {
          setExistingTenderWarning(null);
        }
      }
    } catch (error) {
      console.error('Error checking tender number:', error);
    } finally {
      setCheckingNumber(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof createTenderSchema>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Конвертируем рубли в копейки для БД
      const payload = {
        ...data,
        nmck: Math.round(data.nmck * 100), // рубли -> копейки
        contract_price: data.contract_price ? Math.round(data.contract_price * 100) : undefined,
        application_security: data.application_security ? Math.round(data.application_security * 100) : undefined,
        contract_security: data.contract_security ? Math.round(data.contract_security * 100) : undefined,
        // Добавляем список ответственных (фильтруем пустые значения)
        responsible_ids: responsibleIds.filter(id => id !== ''),
        // Преобразуем пустые строки в undefined для дат и опциональных полей
        auction_date: data.auction_date || undefined,
        results_date: data.results_date || undefined,
        review_date: data.review_date || undefined,
        // Преобразуем пустые строки в undefined только для опциональных foreign key полей
        investor_id: data.investor_id || undefined,
        executor_id: data.executor_id || undefined,
        type_id: data.type_id || undefined,
        template_id: selectedTemplateId || undefined,
      };

      // Удаляем undefined значения и пустые строки из payload для дат
      Object.keys(payload).forEach(key => {
        const value = payload[key as keyof typeof payload];
        if (value === undefined || value === '') {
          delete payload[key as keyof typeof payload];
        }
      });

      console.log('Sending payload:', payload);

      const url = mode === 'edit' && tender 
        ? `/api/tenders/${tender.id}` 
        : '/api/tenders';
      
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 
          `Ошибка при ${mode === 'edit' ? 'обновлении' : 'создании'} тендера`;
        throw new Error(errorMessage);
      }

      // Успешное создание/обновление
      toast.show(
        mode === 'edit' ? 'Тендер успешно обновлён' : 'Тендер успешно создан',
        { type: 'success' }
      );
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} tender:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast.show(errorMessage, { type: 'error', duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      {/* Overlay */}
      <div
        className={styles.modalBackdrop}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {mode === 'edit' ? '✏️ Редактировать тендер' : '➕ Добавить тендер'}
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            type="button"
          >
            <svg
              style={{ width: '1.5rem', height: '1.5rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

          {/* Body */}
          <div className={styles.modalBody}>
            <form onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className={styles.errorMessage}>
                  ⚠️ {error}
                </div>
              )}
              
              {existingTenderWarning && (
                <div className={styles.warningMessage}>
                  ⚠️ {existingTenderWarning}
                </div>
              )}

              {/* Основная информация */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  Основная информация
                </h3>
                <div className={styles.formRow}>
                  {/* Номер закупки */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Номер закупки <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      {...register('purchase_number')}
                      placeholder="0123456789012345678"
                      onBlur={(e) => checkTenderNumber(e.target.value)}
                    />
                    {errors.purchase_number && (
                      <p className={styles.fieldError}>
                        {errors.purchase_number.message}
                      </p>
                    )}
                    {checkingNumber && (
                      <p className={styles.fieldInfo}>
                        Проверка номера...
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Детали закупки */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  Детали закупки
                </h3>
                <div className={styles.formRow}>
                  {/* Предмет закупки */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>
                      Предмет закупки <span className={styles.required}>*</span>
                    </label>
                    <textarea
                      {...register('subject')}
                      rows={3}
                      className={styles.textarea}
                      placeholder="Поставка медицинского оборудования..."
                    />
                    {errors.subject && (
                      <p className={styles.fieldError}>
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  {/* Название проекта */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Название проекта
                    </label>
                    <input
                      type="text"
                      {...register('project_name')}
                      className={styles.input}
                      placeholder="Проект Альфа"
                    />
                  </div>

                  {/* Тип закупки */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Тип закупки
                    </label>
                    <select
                      {...register('type_id')}
                      className={styles.select}
                      onChange={(e) => {
                        setValue('type_id', e.target.value);
                      }}
                    >
                      <option value="">Выберите тип</option>
                      {types.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Шаблон этапов */}
                  {mode === 'create' && templates.length > 0 && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        📚 Шаблон этапов
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className={styles.select}
                        disabled={isTemplateLockedByType}
                      >
                        <option value="system">🔧 Системный шаблон (все системные этапы)</option>
                        {templates
                          .filter(t => t.is_active)
                          .map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.icon} {template.name}
                              {template.description && ` — ${template.description}`}
                            </option>
                          ))}
                      </select>
                      {isTemplateLockedByType ? (
                        <p className={styles.hint}>
                          🔒 Шаблон выбран автоматически на основе типа закупки
                        </p>
                      ) : selectedTemplateId === 'system' ? (
                        <p className={styles.hint}>
                          ✓ Будут доступны все системные этапы. Тендер будет помещён на первый этап.
                        </p>
                      ) : (
                        <p className={styles.hint}>
                          ✓ Этапы из шаблона будут добавлены к системным этапам. Тендер будет помещён на первый этап шаблона.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Способ определения */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Способ определения
                    </label>
                    <select
                      {...register('method')}
                      className={styles.select}
                      disabled={availableMethods.length === 0}
                    >
                      <option value="">
                        {availableMethods.length === 0 
                          ? 'Сначала выберите тип закупки' 
                          : 'Выберите способ'}
                      </option>
                      {availableMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Площадка */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Электронная площадка
                    </label>
                    {platforms.length > 0 ? (
                      <select
                        {...register('platform_id')}
                        className={styles.select}
                      >
                        <option value="">Выберите площадку</option>
                        {platforms.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        {...register('platform')}
                        className={styles.input}
                        placeholder="РТС-тендер, ЭТП ГПБ и т.д."
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Заказчик */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  Заказчик
                </h3>
                <div className={styles.formRow}>
                  {/* Название заказчика */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Наименование заказчика <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      {...register('customer')}
                      className={styles.input}
                      placeholder="ГБУЗ Городская больница №1"
                    />
                    {errors.customer && (
                      <p className={styles.fieldError}>
                        {errors.customer.message}
                      </p>
                    )}
                  </div>

                  {/* Город */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Город
                    </label>
                    <input
                      type="text"
                      {...register('city')}
                      className={styles.input}
                      placeholder="Москва"
                    />
                  </div>
                </div>
              </div>

              {/* Финансы */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  Финансовая информация
                </h3>
                <div className={styles.formRow}>
                  {/* НМЦК */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      НМЦК (₽) <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      {...register('nmck', { valueAsNumber: true })}
                      className={styles.input}
                      placeholder="5645255.27"
                    />
                    {errors.nmck && (
                      <p className={styles.fieldError}>
                        {errors.nmck.message}
                      </p>
                    )}
                  </div>

                  {/* Обеспечение заявки */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Обеспечение заявки (руб.)
                    </label>
                    <input
                      type="number"
                      {...register('application_security', {
                        setValueAs: (v) => v === '' || v === null || v === undefined ? undefined : Number(v)
                      })}
                      className={styles.input}
                      placeholder="500.00"
                    />
                  </div>

                  {/* Обеспечение контракта */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Обеспечение контракта (руб.)
                    </label>
                    <input
                      type="number"
                      {...register('contract_security', {
                        setValueAs: (v) => v === '' || v === null || v === undefined ? undefined : Number(v)
                      })}
                      className={styles.input}
                      placeholder="1000.00"
                    />
                  </div>
                </div>
              </div>

              {/* Даты */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  Сроки
                </h3>
                <div className={styles.formRow}>
                  {/* Дедлайн подачи заявки */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Дедлайн подачи <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      {...register('submission_deadline')}
                      className={styles.input}
                    />
                    {errors.submission_deadline && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.submission_deadline.message}
                      </p>
                    )}
                  </div>

                  {/* Дата аукциона */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Дата аукциона
                    </label>
                    <input
                      type="datetime-local"
                      {...register('auction_date')}
                      className={styles.input}
                    />
                  </div>

                  {/* Дата подведения итогов */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Дата подведения итогов
                    </label>
                    <input
                      type="datetime-local"
                      {...register('results_date')}
                      className={styles.input}
                    />
                  </div>

                  {/* Дата рассмотрения заявок */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Дата рассмотрения заявок
                    </label>
                    <input
                      type="datetime-local"
                      {...register('review_date')}
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>

              {/* Ответственные */}
              <div className={styles.formSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Ответственные
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (responsibleIds.length === 0 || responsibleIds[responsibleIds.length - 1] !== '') {
                        setResponsibleIds([...responsibleIds, '']);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                  >
                    <span>+</span>
                    <span>Добавить ответственного</span>
                  </button>
                </div>
                
                {responsibleIds.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    Нажмите &quot;Добавить ответственного&quot; для назначения сотрудников
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {responsibleIds.map((id, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={id}
                          onChange={(e) => {
                            const newIds = [...responsibleIds];
                            newIds[index] = e.target.value;
                            setResponsibleIds(newIds);
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <option value="">Выберите сотрудника</option>
                          {managers
                            .filter(m => !responsibleIds.includes(m.id) || m.id === id)
                            .map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.full_name}{manager.role ? ` (${manager.role})` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setResponsibleIds(responsibleIds.filter((_, i) => i !== index));
                          }}
                          style={{
                            padding: '0.5rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                            lineHeight: 1,
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Удалить"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Комментарий */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Комментарий
                </label>
                <textarea
                  {...register('comment')}
                  rows={3}
                  className={styles.input}
                  placeholder="Дополнительная информация..."
                />
              </div>

              {/* Footer */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${styles.button} ${styles.cancelButton}`}
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${styles.button} ${styles.submitButton}`}
                >
                  {isSubmitting 
                    ? (mode === 'edit' ? 'Сохранение...' : 'Создание...') 
                    : (mode === 'edit' ? '✓ Сохранить' : '✓ Создать тендер')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}


