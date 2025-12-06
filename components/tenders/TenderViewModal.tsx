'use client';

import { useEffect, useState } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import { EMPLOYEE_ROLE_LABELS } from '@/lib/employees/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Building2, DollarSign, Calendar, MessageSquare, Users, Calculator, AlertTriangle, AlertCircle, Trophy, ExternalLink } from 'lucide-react';

interface TenderViewModalProps { tenderId: string; onClose: () => void; }

export function TenderViewModal({ tenderId, onClose }: TenderViewModalProps) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTender = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenders/${tenderId}`);
        if (!response.ok) throw new Error('Ошибка загрузки тендера');
        setTender(await response.json());
      } catch (error) { console.error('Error loading tender:', error); alert('Ошибка при загрузке данных тендера'); onClose(); }
      finally { setLoading(false); }
    };
    loadTender();
  }, [tenderId, onClose]);

  const hasValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  const formatDateTime = (date: string | null) => date ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '';
  const getRoleLabel = (role?: string | null) => role ? EMPLOYEE_ROLE_LABELS[role as keyof typeof EMPLOYEE_ROLE_LABELS] || role : null;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-2 border-b last:border-0"><div className="text-xs text-gray-500 mb-1">{label}</div><div className="text-sm">{value}</div></div>
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{loading ? 'Загрузка...' : tender?.subject || 'Без названия'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : tender && (
          <div className="space-y-4">
            {(hasValue(tender.purchase_number) || hasValue(tender.project_name) || hasValue(tender.type_id) || hasValue(tender.method) || hasValue(tender.platform) || hasValue(tender.subject)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Основная информация</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.purchase_number) && <Field label="Номер закупки" value={tender.purchase_number} />}
                {hasValue(tender.project_name) && <Field label="Название проекта" value={tender.project_name} />}
                {hasValue(tender.type_id) && <Field label="Тип закупки" value={tender.type?.name || '—'} />}
                {hasValue(tender.method) && <Field label="Способ определения" value={tender.method} />}
                {hasValue(tender.platform) && <Field label="Электронная площадка" value={tender.platform} />}
                {hasValue(tender.subject) && <Field label="Предмет закупки" value={tender.subject} />}
                {hasValue(tender.eis_url) && tender.eis_url && <Field label="Ссылка на ЕИС" value={<a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{tender.eis_url.slice(0,50)}... <ExternalLink className="h-3 w-3" /></a>} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.customer) || hasValue(tender.city)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" />Заказчик</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.customer) && <Field label="Наименование" value={tender.customer} />}
                {hasValue(tender.city) && <Field label="Город" value={tender.city} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.nmck) || hasValue(tender.application_security) || hasValue(tender.contract_security)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4" />Финансовая информация</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.nmck) && <Field label="НМЦК" value={formatCurrency(tender.nmck / 100)} />}
                {hasValue(tender.application_security) && tender.application_security && <Field label="Обеспечение заявки" value={formatCurrency(tender.application_security / 100)} />}
                {hasValue(tender.contract_security) && tender.contract_security && <Field label="Обеспечение контракта" value={formatCurrency(tender.contract_security / 100)} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.submission_deadline) || hasValue(tender.auction_date) || hasValue(tender.results_date) || hasValue(tender.review_date)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" />Сроки</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.submission_deadline) && <Field label="Дедлайн подачи" value={formatDateTime(tender.submission_deadline)} />}
                {hasValue(tender.auction_date) && <Field label="Дата аукциона" value={formatDateTime(tender.auction_date)} />}
                {hasValue(tender.results_date) && <Field label="Подведение итогов" value={formatDateTime(tender.results_date)} />}
                {hasValue(tender.review_date) && <Field label="Рассмотрение заявок" value={formatDateTime(tender.review_date)} />}
              </CardContent></Card>
            )}
            {hasValue(tender.comment) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" />Комментарий</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm">{tender.comment}</p></CardContent></Card>
            )}
            {tender.responsible && tender.responsible.length > 0 && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" />Ответственные</CardTitle></CardHeader><CardContent className="pt-0 space-y-1">
                {tender.responsible.map((resp) => <div key={resp.employee.id} className="text-sm">{resp.employee.full_name}{resp.employee.role && <span className="text-gray-500"> — {getRoleLabel(resp.employee.role)}</span>}</div>)}
              </CardContent></Card>
            )}
            {(hasValue(tender.purchase_cost) || hasValue(tender.logistics_cost) || hasValue(tender.our_price) || hasValue(tender.other_costs) || hasValue(tender.planned_profit)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Calculator className="h-4 w-4" />Просчёт тендера</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.purchase_cost) && <Field label="Закупка" value={formatCurrency(tender.purchase_cost)} />}
                {hasValue(tender.logistics_cost) && <Field label="Логистика" value={formatCurrency(tender.logistics_cost)} />}
                {hasValue(tender.our_price) && <Field label="Цена для торгов" value={formatCurrency(tender.our_price)} />}
                {hasValue(tender.other_costs) && <Field label="Прочие затраты" value={formatCurrency(tender.other_costs)} />}
                {hasValue(tender.planned_profit) && <Field label="Планируемая прибыль" value={formatCurrency(tender.planned_profit)} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.delivery_days_tz) || hasValue(tender.delivery_location) || hasValue(tender.penalties) || hasValue(tender.customer_check)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" />Риски</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.delivery_days_tz) && <Field label="Срок поставки (дней)" value={tender.delivery_days_tz} />}
                {hasValue(tender.delivery_location) && <Field label="Место поставки" value={tender.delivery_location} />}
                {hasValue(tender.delivery_locations_count) && <Field label="Кол-во мест поставки" value={tender.delivery_locations_count} />}
                {hasValue(tender.installation_required) && <Field label="Монтаж" value={tender.installation_required} />}
                {hasValue(tender.penalties) && <Field label="Штрафы" value={tender.penalties} />}
                {hasValue(tender.customer_check) && <Field label="Проверка заказчика" value={tender.customer_check} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.is_defense_order) || hasValue(tender.delivery_condition) || hasValue(tender.long_warranty) || hasValue(tender.payment_term)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />Обратить внимание</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.is_defense_order) && <Field label="Гособорон заказ" value={tender.is_defense_order ? 'Да' : 'Нет'} />}
                {hasValue(tender.delivery_condition) && <Field label="Условие поставки" value={tender.delivery_condition} />}
                {hasValue(tender.long_warranty) && <Field label="Длительная гарантия" value={tender.long_warranty} />}
                {hasValue(tender.payment_term) && <Field label="Срок оплаты" value={tender.payment_term} />}
                {hasValue(tender.contract_duration) && <Field label="Срок контракта" value={tender.contract_duration} />}
              </CardContent></Card>
            )}
            {(hasValue(tender.contract_price) || hasValue(tender.legal_entity_id)) && (
              <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4" />Результат</CardTitle></CardHeader><CardContent className="pt-0 grid grid-cols-2 gap-x-4">
                {hasValue(tender.contract_price) && <Field label="Цена контракта" value={formatCurrency(tender.contract_price)} />}
                {hasValue(tender.legal_entity_id) && <Field label="Юр. лицо" value={tender.legal_entity_id} />}
              </CardContent></Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
