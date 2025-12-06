'use client';

import { useState, useEffect } from 'react';
import type { Tender, TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import { EMPLOYEE_ROLE_LABELS } from '@/lib/employees/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pencil, Save, X, Plus, Trash2, Loader2 } from 'lucide-react';

interface TenderInfoTabProps {
  tender: Tender;
  types: TenderType[];
  templates?: TenderStageTemplate[];
  employees?: Array<{ id: string; full_name: string; role?: string }>;
  onUpdate: () => void;
  isArchived?: boolean;
}

export function TenderInfoTab({ tender, types, templates = [], employees = [], onUpdate, isArchived = false }: TenderInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(tender);
  const [isSaving, setIsSaving] = useState(false);
  const [responsibleIds, setResponsibleIds] = useState<string[]>(
    tender.responsible?.map(r => r.employee.id) || []
  );
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(tender.template_id || 'system');
  const [isTemplateLockedByType, setIsTemplateLockedByType] = useState(false);

  // Обновляем список доступных способов определения при изменении типа
  useEffect(() => {
    if (!formData.type_id) {
      setAvailableMethods([]);
      return;
    }

    const selectedType = types.find(t => t.id === formData.type_id);
    
    let newMethods: string[] = [];
    if (selectedType?.methods && selectedType.methods.length > 0) {
      newMethods = selectedType.methods.map(m => m.name);
    } else if (selectedType?.procurement_methods) {
      newMethods = selectedType.procurement_methods;
    }
    
    setAvailableMethods(newMethods);
  }, [formData.type_id, types]);

    // Автоматический выбор шаблона при изменении типа
    useEffect(() => {
      if (!formData.type_id) {
        // Если тип не выбран, разблокируем выбор
        setIsTemplateLockedByType(false);
        return;
      }
  
      const selectedType = types.find(t => t.id === formData.type_id);
      
      // Автовыбор шаблона для ЗМО
      if (selectedType?.name === 'ЗМО') {
        const zmoTemplate = templates.find(t => t.name === 'ЗМО');
        if (zmoTemplate) {
          setSelectedTemplateId(prev => prev !== zmoTemplate.id ? zmoTemplate.id : prev);
          setIsTemplateLockedByType(true);
        }
      } else if (selectedType?.name === 'ФЗ-44' || selectedType?.name === 'ФЗ-223') {
        // Автовыбор для ФЗ-44/223
        const systemTemplate = templates.find(t => 
          t.name === 'Системный (ФЗ-44/223)' || 
          (t.is_system && t.name.includes('ФЗ-44/223'))
        );
        if (systemTemplate) {
          setSelectedTemplateId(prev => prev !== systemTemplate.id ? systemTemplate.id : prev);
          setIsTemplateLockedByType(true);
        }
      } else {
        // Для остальных типов разрешаем ручной выбор
        setIsTemplateLockedByType(false);
      }
    }, [formData.type_id, types, templates]);

  const getRoleLabel = (role?: string | null) => {
    if (!role) return null;
    return EMPLOYEE_ROLE_LABELS[role as keyof typeof EMPLOYEE_ROLE_LABELS] || role;
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Сначала обновляем основные данные тендера
      const response = await fetch(`/api/tenders/${tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          responsible_ids: responsibleIds.filter(id => id !== ''),
          template_id: selectedTemplateId || undefined,
        }),
      });

      if (!response.ok) throw new Error('Ошибка сохранения');

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving tender:', error);
      alert('Ошибка при сохранении данных');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(tender);
    setResponsibleIds(tender.responsible?.map(r => r.employee.id) || []);
    setIsEditing(false);
  };

  const calculateManagerPercent = () => {
    return formData.our_price ? formData.our_price * 0.05 : 0;
  };

  const calculateInvestorPercent = () => {
    return formData.our_price ? formData.our_price * 0.05 : 0;
  };

  const calculateDirectCosts = () => {
    return (formData.purchase_cost || 0) + (formData.logistics_cost || 0) + (formData.other_costs || 0);
  };

  // Для архивных тендеров показываем только минимум информации
  if (isArchived) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Основная информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Заказчик</Label>
                <div className="font-medium">{tender.customer || '—'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">№ закупки</Label>
                <div className="font-medium">{tender.purchase_number || '—'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">НМЦК (руб.)</Label>
                <div className="font-medium">{formatCurrency(tender.nmck, tender.currency)}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-sm text-gray-500">Предмет закупки</Label>
                <div className="font-medium">{tender.subject || '—'}</div>
              </div>
              {tender.eis_url && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-sm text-gray-500">Ссылка</Label>
                  <a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {tender.eis_url}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Основная информация */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Основная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Номер закупки</Label>
              {isEditing ? (
                <Input
                  value={formData.purchase_number || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
                />
              ) : (
                <div className="font-medium">{tender.purchase_number || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Название проекта</Label>
              {isEditing ? (
                <Input
                  value={formData.project_name || ''}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                />
              ) : (
                <div className="font-medium">{tender.project_name || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Тип закупки</Label>
              {isEditing ? (
                <Select
                  value={formData.type_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, type_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.type?.name || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Способ определения</Label>
              {isEditing ? (
                <Select
                  value={formData.method || ''}
                  onValueChange={(value) => setFormData({ ...formData, method: value })}
                  disabled={availableMethods.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={availableMethods.length === 0 ? 'Сначала выберите тип закупки' : 'Выберите способ'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.method || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Шаблон этапов</Label>
              {isEditing ? (
                <Select
                  value={selectedTemplateId || 'system'}
                  onValueChange={(value) => setSelectedTemplateId(value === 'system' ? null : value)}
                  disabled={isTemplateLockedByType}
                >
                  <SelectTrigger title={isTemplateLockedByType ? 'Шаблон выбирается автоматически для данного типа закупки' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">📋 Системный (ФЗ-44/223)</SelectItem>
                    {templates
                      .filter(t => t.is_active)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.icon} {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">
                  {tender.template_id === 'system' || !tender.template_id
                    ? '📋 Системный (ФЗ-44/223)'
                    : (() => {
                        const template = templates.find(t => t.id === tender.template_id);
                        return template ? `${template.icon} ${template.name}` : '📋 Системный (ФЗ-44/223)';
                      })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Электронная площадка</Label>
              {isEditing ? (
                <Input
                  value={formData.platform || ''}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                />
              ) : (
                <div className="font-medium">{tender.platform || '—'}</div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-sm text-gray-500">Предмет закупки</Label>
              {isEditing ? (
                <Textarea
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  rows={3}
                />
              ) : (
                <div className="font-medium">{tender.subject || '—'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Заказчик */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Заказчик</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Наименование заказчика</Label>
              {isEditing ? (
                <Input
                  value={formData.customer || ''}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                />
              ) : (
                <div className="font-medium">{tender.customer || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Город</Label>
              {isEditing ? (
                <Input
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              ) : (
                <div className="font-medium">{tender.city || '—'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Финансовая информация */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Финансовая информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">НМЦК (₽)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.nmck ? formData.nmck / 100 : ''}
                  onChange={(e) => setFormData({ ...formData, nmck: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                />
              ) : (
                <div className="font-medium">{formatCurrency(tender.nmck / 100)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Обеспечение заявки (₽)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.application_security ? formData.application_security / 100 : ''}
                  onChange={(e) =>
                    setFormData({ ...formData, application_security: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })
                  }
                />
              ) : (
                <div className="font-medium">
                  {tender.application_security ? formatCurrency(tender.application_security / 100) : '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Обеспечение контракта (₽)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.contract_security ? formData.contract_security / 100 : ''}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_security: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })
                  }
                />
              ) : (
                <div className="font-medium">
                  {tender.contract_security ? formatCurrency(tender.contract_security / 100) : '—'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Сроки */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Сроки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Дедлайн подачи</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={formatDateTime(formData.submission_deadline)}
                  onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                />
              ) : (
                <div className="font-medium">
                  {tender.submission_deadline
                    ? new Date(tender.submission_deadline).toLocaleString('ru-RU')
                    : '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Дата аукциона</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={formatDateTime(formData.auction_date)}
                  onChange={(e) => setFormData({ ...formData, auction_date: e.target.value })}
                />
              ) : (
                <div className="font-medium">
                  {tender.auction_date ? new Date(tender.auction_date).toLocaleString('ru-RU') : '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Дата подведения итогов</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={formatDateTime(formData.results_date)}
                  onChange={(e) => setFormData({ ...formData, results_date: e.target.value })}
                />
              ) : (
                <div className="font-medium">
                  {tender.results_date ? new Date(tender.results_date).toLocaleString('ru-RU') : '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Дата рассмотрения заявок</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={formatDateTime(formData.review_date)}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              ) : (
                <div className="font-medium">
                  {tender.review_date ? new Date(tender.review_date).toLocaleString('ru-RU') : '—'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Комментарий */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Комментарий</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              placeholder="Дополнительная информация..."
            />
          ) : (
            <div className="font-medium">{tender.comment || '—'}</div>
          )}
        </CardContent>
      </Card>

      {/* Ответственные */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Ответственные</CardTitle>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (responsibleIds.length === 0 || responsibleIds[responsibleIds.length - 1] !== '') {
                    setResponsibleIds([...responsibleIds, '']);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              {responsibleIds.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Нажмите &quot;Добавить&quot; для назначения сотрудников
                </p>
              ) : (
                responsibleIds.map((id, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={id}
                      onValueChange={(value) => {
                        const newIds = [...responsibleIds];
                        newIds[index] = value;
                        setResponsibleIds(newIds);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите сотрудника" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => !responsibleIds.includes(emp.id) || emp.id === id)
                          .map((employee) => {
                            const roleLabel = getRoleLabel(employee.role);
                            return (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.full_name}{roleLabel ? ` (${roleLabel})` : ''}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setResponsibleIds(responsibleIds.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : (
            tender.responsible && tender.responsible.length > 0 ? (
              <div className="space-y-2">
                {tender.responsible.map((resp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-semibold">
                        {resp.employee.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {resp.employee.full_name}
                      </div>
                      {getRoleLabel(resp.employee.role) && (
                        <div className="text-xs text-gray-500">
                          {getRoleLabel(resp.employee.role)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">Не назначены</div>
            )
          )}
        </CardContent>
      </Card>

      {/* Просчёт тендера */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Просчёт тендера</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Процент менеджера (5%)</Label>
              <div className="font-medium text-blue-600">{formatCurrency(calculateManagerPercent(), tender.currency)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Процент инвестора (5%)</Label>
              <div className="font-medium text-blue-600">{formatCurrency(calculateInvestorPercent(), tender.currency)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Закупка</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.purchase_cost || ''} onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.purchase_cost, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Логистика</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.logistics_cost || ''} onChange={(e) => setFormData({ ...formData, logistics_cost: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.logistics_cost, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Цена для торгов</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.bid_price || ''} onChange={(e) => setFormData({ ...formData, bid_price: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.bid_price, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Прочие затраты</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.other_costs || ''} onChange={(e) => setFormData({ ...formData, other_costs: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.other_costs, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Планируемая прибыль</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.planned_profit || ''} onChange={(e) => setFormData({ ...formData, planned_profit: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.planned_profit, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Сумма прямых затрат</Label>
              <div className="font-medium text-blue-600">{formatCurrency(calculateDirectCosts(), tender.currency)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Риски */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Риски</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Срок поставки по ТЗ (Дней)</Label>
              {isEditing ? (
                <Input type="number" value={formData.delivery_days_tz || ''} onChange={(e) => setFormData({ ...formData, delivery_days_tz: parseInt(e.target.value) || null })} />
              ) : (
                <div className="font-medium">{tender.delivery_days_tz || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Факт.сроки поставки (Дней)</Label>
              {isEditing ? (
                <Input type="number" value={formData.delivery_days_actual || ''} onChange={(e) => setFormData({ ...formData, delivery_days_actual: parseInt(e.target.value) || null })} />
              ) : (
                <div className="font-medium">{tender.delivery_days_actual || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Место поставки</Label>
              {isEditing ? (
                <Input value={formData.delivery_location || ''} onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.delivery_location || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Количество мест поставки</Label>
              {isEditing ? (
                <Input type="number" value={formData.delivery_locations_count || ''} onChange={(e) => setFormData({ ...formData, delivery_locations_count: parseInt(e.target.value) || null })} />
              ) : (
                <div className="font-medium">{tender.delivery_locations_count || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Монтаж</Label>
              {isEditing ? (
                <Select value={formData.installation_required === null ? 'null' : formData.installation_required ? 'true' : 'false'} onValueChange={(v) => setFormData({ ...formData, installation_required: v === 'null' ? null : v === 'true' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Не выбрано</SelectItem>
                    <SelectItem value="true">Да</SelectItem>
                    <SelectItem value="false">Нет</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.installation_required === null ? '—' : tender.installation_required ? 'Да' : 'Нет'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Разгрузка</Label>
              {isEditing ? (
                <Select value={formData.unloading_required === null ? 'null' : formData.unloading_required ? 'true' : 'false'} onValueChange={(v) => setFormData({ ...formData, unloading_required: v === 'null' ? null : v === 'true' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Не выбрано</SelectItem>
                    <SelectItem value="true">Да</SelectItem>
                    <SelectItem value="false">Нет</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.unloading_required === null ? '—' : tender.unloading_required ? 'Да' : 'Нет'}</div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-sm text-gray-500">Штрафы</Label>
              {isEditing ? (
                <Textarea value={formData.penalties || ''} onChange={(e) => setFormData({ ...formData, penalties: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.penalties || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Проверка заказчика</Label>
              {isEditing ? (
                <Textarea value={formData.customer_check || ''} onChange={(e) => setFormData({ ...formData, customer_check: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.customer_check || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Проверка поставщика</Label>
              {isEditing ? (
                <Textarea value={formData.supplier_check || ''} onChange={(e) => setFormData({ ...formData, supplier_check: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.supplier_check || '—'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Обратить внимание */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Обратить внимание</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Гособорон заказ</Label>
              {isEditing ? (
                <Select value={formData.is_defense_order === null ? 'null' : formData.is_defense_order ? 'true' : 'false'} onValueChange={(v) => setFormData({ ...formData, is_defense_order: v === 'null' ? null : v === 'true' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Не выбрано</SelectItem>
                    <SelectItem value="true">Да</SelectItem>
                    <SelectItem value="false">Нет</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.is_defense_order === null ? '—' : tender.is_defense_order ? 'Да' : 'Нет'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Нац. режим</Label>
              {isEditing ? (
                <Input value={formData.national_regime || ''} onChange={(e) => setFormData({ ...formData, national_regime: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.national_regime || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Условие поставки</Label>
              {isEditing ? (
                <Select value={formData.delivery_condition || 'none'} onValueChange={(v) => setFormData({ ...formData, delivery_condition: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    <SelectItem value="Единовременная поставка">Единовременная поставка</SelectItem>
                    <SelectItem value="Поэтапная поставка">Поэтапная поставка</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium">{tender.delivery_condition || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Длительная гарантия</Label>
              {isEditing ? (
                <Input value={formData.long_warranty || ''} onChange={(e) => setFormData({ ...formData, long_warranty: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.long_warranty || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Срок оплаты</Label>
              {isEditing ? (
                <Input value={formData.payment_term || ''} onChange={(e) => setFormData({ ...formData, payment_term: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.payment_term || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Срок приемки</Label>
              {isEditing ? (
                <Input value={formData.acceptance_term || ''} onChange={(e) => setFormData({ ...formData, acceptance_term: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.acceptance_term || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Срок действия контракта</Label>
              {isEditing ? (
                <Input value={formData.contract_duration || ''} onChange={(e) => setFormData({ ...formData, contract_duration: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.contract_duration || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Запросы на разъяснения</Label>
              {isEditing ? (
                <Textarea value={formData.clarification_requests || ''} onChange={(e) => setFormData({ ...formData, clarification_requests: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.clarification_requests || '—'}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Другое</Label>
              {isEditing ? (
                <Textarea value={formData.other_notes || ''} onChange={(e) => setFormData({ ...formData, other_notes: e.target.value })} />
              ) : (
                <div className="font-medium">{tender.other_notes || '—'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Результат */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Результат</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Цена контракта (руб.)</Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={formData.contract_price || ''} onChange={(e) => setFormData({ ...formData, contract_price: parseFloat(e.target.value) || 0 })} />
              ) : (
                <div className="font-medium">{formatCurrency(tender.contract_price, tender.currency)}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Прогнозируемая прибыль менеджера</Label>
              <div className="font-medium text-green-600">
                {formData.contract_price ? formatCurrency(formData.contract_price * 0.05, tender.currency) : '0'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Юр. лицо</Label>
              {isEditing ? (
                <Input value={formData.legal_entity_id || ''} onChange={(e) => setFormData({ ...formData, legal_entity_id: e.target.value })} placeholder="ID юридического лица" />
              ) : (
                <div className="font-medium">{tender.legal_entity_id || '—'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопки действий */}
      {!isEditing ? (
        <Button onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Редактировать
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}
