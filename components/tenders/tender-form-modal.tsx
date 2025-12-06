'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { createTenderSchema } from '@/lib/tenders/validation';
import type { TenderType, Tender, TenderStageTemplate } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { useToast } from '@/components/toast/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, X, AlertTriangle } from 'lucide-react';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? '✏️ Редактировать тендер' : '➕ Добавить тендер'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {existingTenderWarning && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>{existingTenderWarning}</AlertDescription></Alert>}

          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">📋 Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер закупки <span className="text-red-500">*</span></Label>
                <Input {...register('purchase_number')} placeholder="0123456789012345678" onBlur={(e) => checkTenderNumber(e.target.value)} />
                {errors.purchase_number && <p className="text-sm text-red-500">{errors.purchase_number.message}</p>}
                {checkingNumber && <p className="text-sm text-blue-500">Проверка номера...</p>}
              </div>
            </div>
          </div>

          {/* Детали закупки */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">📝 Детали закупки</h3>
            <div className="space-y-2">
              <Label>Предмет закупки <span className="text-red-500">*</span></Label>
              <Textarea {...register('subject')} rows={3} placeholder="Поставка медицинского оборудования..." />
              {errors.subject && <p className="text-sm text-red-500">{errors.subject.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название проекта</Label>
                <Input {...register('project_name')} placeholder="Проект Альфа" />
              </div>
              <div className="space-y-2">
                <Label>Тип закупки</Label>
                <select {...register('type_id')} onChange={(e) => setValue('type_id', e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Выберите тип</option>
                  {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              {mode === 'create' && templates.length > 0 && (
                <div className="space-y-2">
                  <Label>📚 Шаблон этапов</Label>
                  <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} disabled={isTemplateLockedByType} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50">
                    <option value="system">🔧 Системный шаблон</option>
                    {templates.filter(t => t.is_active).map((template) => <option key={template.id} value={template.id}>{template.icon} {template.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-500">{isTemplateLockedByType ? '🔒 Выбран автоматически' : selectedTemplateId === 'system' ? '✓ Все системные этапы' : '✓ Этапы из шаблона'}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Способ определения</Label>
                <select {...register('method')} disabled={availableMethods.length === 0} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50">
                  <option value="">{availableMethods.length === 0 ? 'Сначала выберите тип' : 'Выберите способ'}</option>
                  {availableMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Электронная площадка</Label>
                {platforms.length > 0 ? (
                  <select {...register('platform_id')} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">Выберите площадку</option>
                    {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <Input {...register('platform')} placeholder="РТС-тендер, ЭТП ГПБ и т.д." />
                )}
              </div>
            </div>
          </div>

          {/* Заказчик */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">🏢 Заказчик</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Наименование заказчика <span className="text-red-500">*</span></Label>
                <Input {...register('customer')} placeholder="ГБУЗ Городская больница №1" />
                {errors.customer && <p className="text-sm text-red-500">{errors.customer.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Город</Label>
                <Input {...register('city')} placeholder="Москва" />
              </div>
            </div>
          </div>

          {/* Финансы */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">💰 Финансовая информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>НМЦК (₽) <span className="text-red-500">*</span></Label>
                <Input type="number" {...register('nmck', { valueAsNumber: true })} placeholder="5645255.27" />
                {errors.nmck && <p className="text-sm text-red-500">{errors.nmck.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Обеспечение заявки (руб.)</Label>
                <Input type="number" {...register('application_security', { setValueAs: (v) => v === '' || v === null || v === undefined ? undefined : Number(v) })} placeholder="500.00" />
              </div>
              <div className="space-y-2">
                <Label>Обеспечение контракта (руб.)</Label>
                <Input type="number" {...register('contract_security', { setValueAs: (v) => v === '' || v === null || v === undefined ? undefined : Number(v) })} placeholder="1000.00" />
              </div>
            </div>
          </div>

          {/* Даты */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">📅 Сроки</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дедлайн подачи <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" {...register('submission_deadline')} />
                {errors.submission_deadline && <p className="text-sm text-red-500">{errors.submission_deadline.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Дата аукциона</Label>
                <Input type="datetime-local" {...register('auction_date')} />
              </div>
              <div className="space-y-2">
                <Label>Дата подведения итогов</Label>
                <Input type="datetime-local" {...register('results_date')} />
              </div>
              <div className="space-y-2">
                <Label>Дата рассмотрения заявок</Label>
                <Input type="datetime-local" {...register('review_date')} />
              </div>
            </div>
          </div>

          {/* Ответственные */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-gray-900">👥 Ответственные</h3>
              <Button type="button" size="sm" onClick={() => { if (responsibleIds.length === 0 || responsibleIds[responsibleIds.length - 1] !== '') setResponsibleIds([...responsibleIds, '']); }}>
                <Plus className="h-4 w-4 mr-1" />Добавить
              </Button>
            </div>
            {responsibleIds.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Нажмите &quot;Добавить&quot; для назначения сотрудников</p>
            ) : (
              <div className="space-y-2">
                {responsibleIds.map((id, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select value={id} onChange={(e) => { const newIds = [...responsibleIds]; newIds[index] = e.target.value; setResponsibleIds(newIds); }} className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Выберите сотрудника</option>
                      {managers.filter(m => !responsibleIds.includes(m.id) || m.id === id).map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name}{manager.role ? ` (${manager.role})` : ''}</option>)}
                    </select>
                    <Button type="button" variant="destructive" size="icon" onClick={() => setResponsibleIds(responsibleIds.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Комментарий */}
          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea {...register('comment')} rows={3} placeholder="Дополнительная информация..." />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{mode === 'edit' ? 'Сохранение...' : 'Создание...'}</> : (mode === 'edit' ? '✓ Сохранить' : '✓ Создать тендер')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


