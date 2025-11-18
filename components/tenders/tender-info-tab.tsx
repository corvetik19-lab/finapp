'use client';

import { useState, useEffect } from 'react';
import type { Tender, TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import { EMPLOYEE_ROLE_LABELS } from '@/lib/employees/types';
import styles from './tender-info-tab.module.css';

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
      // Если тип не выбран, устанавливаем системный и блокируем
      setSelectedTemplateId('system');
      setIsTemplateLockedByType(true);
      return;
    }

    const selectedType = types.find(t => t.id === formData.type_id);
    const zmoTemplate = templates.find(t => t.name === 'ЗМО');

    // Автовыбор шаблона для ЗМО
    if (selectedType?.name === 'ЗМО' && zmoTemplate) {
      setSelectedTemplateId(prev => prev !== zmoTemplate.id ? zmoTemplate.id : prev);
      setIsTemplateLockedByType(true);
    } else {
      // Для остальных типов выбираем системный шаблон и блокируем
      setSelectedTemplateId('system');
      setIsTemplateLockedByType(true);
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
      <div className={styles.container}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Основная информация</h3>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Заказчик</label>
              <div className={styles.value}>{tender.customer || '—'}</div>
            </div>
            <div className={styles.field}>
              <label>№ закупки</label>
              <div className={styles.value}>{tender.purchase_number || '—'}</div>
            </div>
            <div className={styles.field}>
              <label>НМЦК (руб.)</label>
              <div className={styles.value}>{formatCurrency(tender.nmck, tender.currency)}</div>
            </div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label>Предмет закупки</label>
              <div className={styles.value}>{tender.subject || '—'}</div>
            </div>
            {tender.eis_url && (
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <label>Ссылка</label>
                <div className={styles.value}>
                  <a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {tender.eis_url}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Основная информация */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Основная информация</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Номер закупки</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.purchase_number || ''}
                onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.purchase_number || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Название проекта</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.project_name || ''}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.project_name || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Тип закупки</label>
            {isEditing ? (
              <select
                value={formData.type_id || ''}
                onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
              >
                <option value="">Выберите тип</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className={styles.value}>{tender.type?.name || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Способ определения</label>
            {isEditing ? (
              <select
                value={formData.method || ''}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
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
            ) : (
              <div className={styles.value}>{tender.method || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Шаблон этапов</label>
            {isEditing ? (
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                disabled={isTemplateLockedByType}
                title={isTemplateLockedByType ? 'Шаблон выбирается автоматически для данного типа закупки' : ''}
              >
                <option value="system">🔧 Системный шаблон</option>
                {templates
                  .filter(t => t.name === 'ЗМО' && t.is_active)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.icon} {template.name}
                    </option>
                  ))}
              </select>
            ) : (
              <div className={styles.value}>
                {tender.template_id === 'system' || !tender.template_id
                  ? '🔧 Системный шаблон'
                  : (() => {
                      const template = templates.find(t => t.id === tender.template_id);
                      return template ? `${template.icon} ${template.name}` : '🔧 Системный шаблон';
                    })()}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Электронная площадка</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.platform || ''}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.platform || '—'}</div>
            )}
          </div>

          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <label>Предмет закупки</label>
            {isEditing ? (
              <textarea
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                rows={3}
              />
            ) : (
              <div className={styles.value}>{tender.subject || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Заказчик */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Заказчик</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Наименование заказчика</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.customer || ''}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.customer || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Город</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.city || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Финансовая информация */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Финансовая информация</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>НМЦК (₽)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.nmck ? formData.nmck / 100 : ''}
                onChange={(e) => setFormData({ ...formData, nmck: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.nmck / 100)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Обеспечение заявки (₽)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.application_security ? formData.application_security / 100 : ''}
                onChange={(e) =>
                  setFormData({ ...formData, application_security: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })
                }
              />
            ) : (
              <div className={styles.value}>
                {tender.application_security ? formatCurrency(tender.application_security / 100) : '—'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Обеспечение контракта (₽)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.contract_security ? formData.contract_security / 100 : ''}
                onChange={(e) =>
                  setFormData({ ...formData, contract_security: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })
                }
              />
            ) : (
              <div className={styles.value}>
                {tender.contract_security ? formatCurrency(tender.contract_security / 100) : '—'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Сроки */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Сроки</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Дедлайн подачи</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formatDateTime(formData.submission_deadline)}
                onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
              />
            ) : (
              <div className={styles.value}>
                {tender.submission_deadline
                  ? new Date(tender.submission_deadline).toLocaleString('ru-RU')
                  : '—'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Дата аукциона</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formatDateTime(formData.auction_date)}
                onChange={(e) => setFormData({ ...formData, auction_date: e.target.value })}
              />
            ) : (
              <div className={styles.value}>
                {tender.auction_date ? new Date(tender.auction_date).toLocaleString('ru-RU') : '—'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Дата подведения итогов</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formatDateTime(formData.results_date)}
                onChange={(e) => setFormData({ ...formData, results_date: e.target.value })}
              />
            ) : (
              <div className={styles.value}>
                {tender.results_date ? new Date(tender.results_date).toLocaleString('ru-RU') : '—'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Дата рассмотрения заявок</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formatDateTime(formData.review_date)}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
              />
            ) : (
              <div className={styles.value}>
                {tender.review_date ? new Date(tender.review_date).toLocaleString('ru-RU') : '—'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Комментарий */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Комментарий</h3>
        <div className={styles.grid}>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            {isEditing ? (
              <textarea
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация..."
              />
            ) : (
              <div className={styles.value}>{tender.comment || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Ответственные */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Ответственные</h3>
          {isEditing && (
            <button
              type="button"
              className={styles.addResponsibleButton}
              onClick={() => {
                if (responsibleIds.length === 0 || responsibleIds[responsibleIds.length - 1] !== '') {
                  setResponsibleIds([...responsibleIds, '']);
                }
              }}
            >
              <span>+</span>
              <span>Добавить ответственного</span>
            </button>
          )}
        </div>
        
        <div className={styles.field}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {responsibleIds.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  Нажмите &quot;Добавить ответственного&quot; для назначения сотрудников
                </p>
              ) : (
                responsibleIds.map((id, index) => (
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
                      {employees
                        .filter(emp => !responsibleIds.includes(emp.id) || emp.id === id)
                        .map((employee) => {
                          const roleLabel = getRoleLabel(employee.role);
                          return (
                            <option key={employee.id} value={employee.id}>
                              {employee.full_name}{roleLabel ? ` (${roleLabel})` : ''}
                            </option>
                          );
                        })}
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
                ))
              )}
            </div>
          ) : (
            tender.responsible && tender.responsible.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tender.responsible.map((resp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      color: '#4b5563'
                    }}>
                      {resp.employee.full_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                        {resp.employee.full_name}
                      </div>
                      {getRoleLabel(resp.employee.role) && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {getRoleLabel(resp.employee.role)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.value}>Не назначены</div>
            )
          )}
        </div>
      </section>

      {/* Просчёт тендера */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Просчёт тендера</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Процент менеджера (5%)</label>
            <div className={styles.computed}>{formatCurrency(calculateManagerPercent(), tender.currency)}</div>
          </div>

          <div className={styles.field}>
            <label>Процент инвестора (5%)</label>
            <div className={styles.computed}>{formatCurrency(calculateInvestorPercent(), tender.currency)}</div>
          </div>

          <div className={styles.field}>
            <label>Закупка</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.purchase_cost || ''}
                onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.purchase_cost, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Логистика</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.logistics_cost || ''}
                onChange={(e) => setFormData({ ...formData, logistics_cost: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.logistics_cost, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Цена для торгов</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.bid_price || ''}
                onChange={(e) => setFormData({ ...formData, bid_price: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.bid_price, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Прочие затраты</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.other_costs || ''}
                onChange={(e) => setFormData({ ...formData, other_costs: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.other_costs, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Планируемая прибыль</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.planned_profit || ''}
                onChange={(e) => setFormData({ ...formData, planned_profit: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.planned_profit, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Сумма прямых затрат</label>
            <div className={styles.computed}>{formatCurrency(calculateDirectCosts(), tender.currency)}</div>
          </div>
        </div>
      </section>

      {/* Риски */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Риски</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Срок поставки по ТЗ (Дней)</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.delivery_days_tz || ''}
                onChange={(e) => setFormData({ ...formData, delivery_days_tz: parseInt(e.target.value) || null })}
              />
            ) : (
              <div className={styles.value}>{tender.delivery_days_tz || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Факт.сроки поставки (Дней)</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.delivery_days_actual || ''}
                onChange={(e) => setFormData({ ...formData, delivery_days_actual: parseInt(e.target.value) || null })}
              />
            ) : (
              <div className={styles.value}>{tender.delivery_days_actual || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Место поставки</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.delivery_location || ''}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.delivery_location || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Количество мест поставки</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.delivery_locations_count || ''}
                onChange={(e) => setFormData({ ...formData, delivery_locations_count: parseInt(e.target.value) || null })}
              />
            ) : (
              <div className={styles.value}>{tender.delivery_locations_count || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Монтаж</label>
            {isEditing ? (
              <select
                value={formData.installation_required === null ? '' : formData.installation_required ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, installation_required: e.target.value === '' ? null : e.target.value === 'true' })}
              >
                <option value="">Не выбрано</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : (
              <div className={styles.value}>
                {tender.installation_required === null ? '—' : tender.installation_required ? 'Да' : 'Нет'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Разгрузка</label>
            {isEditing ? (
              <select
                value={formData.unloading_required === null ? '' : formData.unloading_required ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, unloading_required: e.target.value === '' ? null : e.target.value === 'true' })}
              >
                <option value="">Не выбрано</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : (
              <div className={styles.value}>
                {tender.unloading_required === null ? '—' : tender.unloading_required ? 'Да' : 'Нет'}
              </div>
            )}
          </div>

          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <label>Штрафы</label>
            {isEditing ? (
              <textarea
                value={formData.penalties || ''}
                onChange={(e) => setFormData({ ...formData, penalties: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.penalties || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Проверка заказчика</label>
            {isEditing ? (
              <textarea
                value={formData.customer_check || ''}
                onChange={(e) => setFormData({ ...formData, customer_check: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.customer_check || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Проверка поставщика</label>
            {isEditing ? (
              <textarea
                value={formData.supplier_check || ''}
                onChange={(e) => setFormData({ ...formData, supplier_check: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.supplier_check || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Обратить внимание */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Обратить внимание</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Гособорон заказ</label>
            {isEditing ? (
              <select
                value={formData.is_defense_order === null ? '' : formData.is_defense_order ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_defense_order: e.target.value === '' ? null : e.target.value === 'true' })}
              >
                <option value="">Не выбрано</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : (
              <div className={styles.value}>
                {tender.is_defense_order === null ? '—' : tender.is_defense_order ? 'Да' : 'Нет'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Нац. режим</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.national_regime || ''}
                onChange={(e) => setFormData({ ...formData, national_regime: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.national_regime || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Условие поставки</label>
            {isEditing ? (
              <select
                value={formData.delivery_condition || ''}
                onChange={(e) => setFormData({ ...formData, delivery_condition: e.target.value })}
              >
                <option value="">Не выбрано</option>
                <option value="Единовременная поставка">Единовременная поставка</option>
                <option value="Поэтапная поставка">Поэтапная поставка</option>
              </select>
            ) : (
              <div className={styles.value}>{tender.delivery_condition || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Длительная гарантия</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.long_warranty || ''}
                onChange={(e) => setFormData({ ...formData, long_warranty: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.long_warranty || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Срок оплаты</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.payment_term || ''}
                onChange={(e) => setFormData({ ...formData, payment_term: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.payment_term || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Срок приемки</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.acceptance_term || ''}
                onChange={(e) => setFormData({ ...formData, acceptance_term: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.acceptance_term || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Срок действия контракта</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.contract_duration || ''}
                onChange={(e) => setFormData({ ...formData, contract_duration: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.contract_duration || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Запросы на разъяснения</label>
            {isEditing ? (
              <textarea
                value={formData.clarification_requests || ''}
                onChange={(e) => setFormData({ ...formData, clarification_requests: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.clarification_requests || '—'}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Другое</label>
            {isEditing ? (
              <textarea
                value={formData.other_notes || ''}
                onChange={(e) => setFormData({ ...formData, other_notes: e.target.value })}
              />
            ) : (
              <div className={styles.value}>{tender.other_notes || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Результат */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Результат</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Цена контракта (руб.)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.contract_price || ''}
                onChange={(e) => setFormData({ ...formData, contract_price: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className={styles.value}>{formatCurrency(tender.contract_price, tender.currency)}</div>
            )}
          </div>

          <div className={styles.field}>
            <label>Прогнозируемая прибыль менеджера</label>
            <div className={styles.computed}>
              {formData.contract_price ? formatCurrency(formData.contract_price * 0.05, tender.currency) : '0'}
            </div>
          </div>

          <div className={styles.field}>
            <label>Юр. лицо</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.legal_entity_id || ''}
                onChange={(e) => setFormData({ ...formData, legal_entity_id: e.target.value })}
                placeholder="ID юридического лица"
              />
            ) : (
              <div className={styles.value}>{tender.legal_entity_id || '—'}</div>
            )}
          </div>
        </div>
      </section>

      {/* Кнопки действий */}
      {!isEditing ? (
        <button className={styles.editButton} onClick={() => setIsEditing(true)}>
          Редактировать
        </button>
      ) : (
        <div className={styles.actions}>
          <button className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : '✓ Сохранить'}
          </button>
          <button className={styles.cancelButton} onClick={handleCancel} disabled={isSaving}>
            ✕ Отмена
          </button>
        </div>
      )}
    </div>
  );
}
