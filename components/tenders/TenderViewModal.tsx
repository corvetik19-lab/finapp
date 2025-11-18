'use client';

import { useEffect, useState } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import { EMPLOYEE_ROLE_LABELS } from '@/lib/employees/types';
import styles from './TenderViewModal.module.css';

interface TenderViewModalProps {
  tenderId: string;
  onClose: () => void;
}

export function TenderViewModal({ tenderId, onClose }: TenderViewModalProps) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTender = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenders/${tenderId}`);
        if (!response.ok) throw new Error('Ошибка загрузки тендера');
        const data = await response.json();
        setTender(data);
      } catch (error) {
        console.error('Error loading tender:', error);
        alert('Ошибка при загрузке данных тендера');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadTender();
  }, [tenderId, onClose]);

  // Проверка что значение заполнено
  const hasValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };


  const getRoleLabel = (role?: string | null) => {
    if (!role) return null;
    return EMPLOYEE_ROLE_LABELS[role as keyof typeof EMPLOYEE_ROLE_LABELS] || role;
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.loading}>⏳ Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!tender) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{tender.subject || 'Без названия'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Основная информация */}
          {(hasValue(tender.purchase_number) || 
            hasValue(tender.project_name) || 
            hasValue(tender.type_id) || 
            hasValue(tender.method) || 
            hasValue(tender.platform) || 
            hasValue(tender.subject)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📋 Основная информация</h3>
              <div className={styles.fields}>
                {hasValue(tender.purchase_number) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Номер закупки</div>
                    <div className={styles.value}>{tender.purchase_number}</div>
                  </div>
                )}
                {hasValue(tender.project_name) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Название проекта</div>
                    <div className={styles.value}>{tender.project_name}</div>
                  </div>
                )}
                {hasValue(tender.type_id) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Тип закупки</div>
                    <div className={styles.value}>{tender.type?.name || '—'}</div>
                  </div>
                )}
                {hasValue(tender.method) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Способ определения</div>
                    <div className={styles.value}>{tender.method}</div>
                  </div>
                )}
                {hasValue(tender.platform) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Электронная площадка</div>
                    <div className={styles.value}>{tender.platform}</div>
                  </div>
                )}
                {hasValue(tender.subject) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Предмет закупки</div>
                    <div className={styles.value}>{tender.subject}</div>
                  </div>
                )}
                {hasValue(tender.eis_url) && tender.eis_url && (
                  <div className={styles.field}>
                    <div className={styles.label}>Ссылка на ЕИС</div>
                    <div className={styles.value}>
                      <a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        {tender.eis_url}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Заказчик */}
          {(hasValue(tender.customer) || hasValue(tender.city)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🏢 Заказчик</h3>
              <div className={styles.fields}>
                {hasValue(tender.customer) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Наименование заказчика</div>
                    <div className={styles.value}>{tender.customer}</div>
                  </div>
                )}
                {hasValue(tender.city) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Город</div>
                    <div className={styles.value}>{tender.city}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Финансовая информация */}
          {(hasValue(tender.nmck) || 
            (tender.application_security !== null && hasValue(tender.application_security)) || 
            (tender.contract_security !== null && hasValue(tender.contract_security))) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💰 Финансовая информация</h3>
              <div className={styles.fields}>
                {hasValue(tender.nmck) && (
                  <div className={styles.field}>
                    <div className={styles.label}>НМЦК (₽)</div>
                    <div className={styles.value}>{formatCurrency(tender.nmck / 100)}</div>
                  </div>
                )}
                {(tender.application_security !== null && hasValue(tender.application_security)) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Обеспечение заявки (₽)</div>
                    <div className={styles.value}>{formatCurrency(tender.application_security / 100)}</div>
                  </div>
                )}
                {(tender.contract_security !== null && hasValue(tender.contract_security)) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Обеспечение контракта (₽)</div>
                    <div className={styles.value}>{formatCurrency(tender.contract_security / 100)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Сроки */}
          {(hasValue(tender.submission_deadline) || 
            hasValue(tender.auction_date) || 
            hasValue(tender.results_date) || 
            hasValue(tender.review_date)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📅 Сроки</h3>
              <div className={styles.fields}>
                {hasValue(tender.submission_deadline) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Дедлайн подачи</div>
                    <div className={styles.value}>{formatDateTime(tender.submission_deadline)}</div>
                  </div>
                )}
                {hasValue(tender.auction_date) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Дата аукциона</div>
                    <div className={styles.value}>{formatDateTime(tender.auction_date)}</div>
                  </div>
                )}
                {hasValue(tender.results_date) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Дата подведения итогов</div>
                    <div className={styles.value}>{formatDateTime(tender.results_date)}</div>
                  </div>
                )}
                {hasValue(tender.review_date) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Дата рассмотрения заявок</div>
                    <div className={styles.value}>{formatDateTime(tender.review_date)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Комментарий */}
          {hasValue(tender.comment) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💬 Комментарий</h3>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <div className={styles.value}>{tender.comment}</div>
                </div>
              </div>
            </div>
          )}

          {/* Ответственные */}
          {tender.responsible && tender.responsible.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>👥 Ответственные</h3>
              <div className={styles.fields}>
                {tender.responsible.map((resp) => (
                  <div key={resp.employee.id} className={styles.field}>
                    <div className={styles.value}>
                      {resp.employee.full_name}
                      {resp.employee.role && (
                        <span className={styles.role}> — {getRoleLabel(resp.employee.role)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Просчёт тендера */}
          {(hasValue(tender.purchase_cost) || 
            hasValue(tender.logistics_cost) || 
            hasValue(tender.our_price) || 
            hasValue(tender.other_costs) || 
            hasValue(tender.planned_profit)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📊 Просчёт тендера</h3>
              <div className={styles.fields}>
                {hasValue(tender.purchase_cost) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Закупка</div>
                    <div className={styles.value}>{formatCurrency(tender.purchase_cost)}</div>
                  </div>
                )}
                {hasValue(tender.logistics_cost) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Логистика</div>
                    <div className={styles.value}>{formatCurrency(tender.logistics_cost)}</div>
                  </div>
                )}
                {hasValue(tender.our_price) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Цена для торгов</div>
                    <div className={styles.value}>{formatCurrency(tender.our_price)}</div>
                  </div>
                )}
                {hasValue(tender.other_costs) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Прочие затраты</div>
                    <div className={styles.value}>{formatCurrency(tender.other_costs)}</div>
                  </div>
                )}
                {hasValue(tender.planned_profit) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Планируемая прибыль</div>
                    <div className={styles.value}>{formatCurrency(tender.planned_profit)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Риски */}
          {(hasValue(tender.delivery_days_tz) || 
            hasValue(tender.delivery_location) || 
            hasValue(tender.delivery_locations_count) || 
            hasValue(tender.installation_required) || 
            hasValue(tender.unloading_required) || 
            hasValue(tender.penalties) || 
            hasValue(tender.customer_check) || 
            hasValue(tender.supplier_check)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>⚠️ Риски</h3>
              <div className={styles.fields}>
                {hasValue(tender.delivery_days_tz) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Срок поставки по ТЗ (Дней)</div>
                    <div className={styles.value}>{tender.delivery_days_tz}</div>
                  </div>
                )}
                {hasValue(tender.delivery_location) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Место поставки</div>
                    <div className={styles.value}>{tender.delivery_location}</div>
                  </div>
                )}
                {hasValue(tender.delivery_locations_count) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Количество мест поставки</div>
                    <div className={styles.value}>{tender.delivery_locations_count}</div>
                  </div>
                )}
                {hasValue(tender.installation_required) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Монтаж</div>
                    <div className={styles.value}>{tender.installation_required}</div>
                  </div>
                )}
                {hasValue(tender.unloading_required) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Разгрузка</div>
                    <div className={styles.value}>{tender.unloading_required}</div>
                  </div>
                )}
                {hasValue(tender.penalties) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Штрафы</div>
                    <div className={styles.value}>{tender.penalties}</div>
                  </div>
                )}
                {hasValue(tender.customer_check) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Проверка заказчика</div>
                    <div className={styles.value}>{tender.customer_check}</div>
                  </div>
                )}
                {hasValue(tender.supplier_check) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Проверка поставщика</div>
                    <div className={styles.value}>{tender.supplier_check}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Обратить внимание */}
          {(hasValue(tender.is_defense_order) || 
            hasValue(tender.delivery_condition) || 
            hasValue(tender.long_warranty) || 
            hasValue(tender.payment_term) || 
            hasValue(tender.acceptance_term) || 
            hasValue(tender.contract_duration) || 
            hasValue(tender.clarification_requests) || 
            hasValue(tender.other_notes)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>❗ Обратить внимание</h3>
              <div className={styles.fields}>
                {hasValue(tender.is_defense_order) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Гособорон заказ</div>
                    <div className={styles.value}>{tender.is_defense_order ? 'Да' : 'Нет'}</div>
                  </div>
                )}
                {hasValue(tender.delivery_condition) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Условие поставки</div>
                    <div className={styles.value}>{tender.delivery_condition}</div>
                  </div>
                )}
                {hasValue(tender.long_warranty) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Длительная гарантия</div>
                    <div className={styles.value}>{tender.long_warranty}</div>
                  </div>
                )}
                {hasValue(tender.payment_term) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Срок оплаты</div>
                    <div className={styles.value}>{tender.payment_term}</div>
                  </div>
                )}
                {hasValue(tender.acceptance_term) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Срок приемки</div>
                    <div className={styles.value}>{tender.acceptance_term}</div>
                  </div>
                )}
                {hasValue(tender.contract_duration) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Срок действия контракта</div>
                    <div className={styles.value}>{tender.contract_duration}</div>
                  </div>
                )}
                {hasValue(tender.clarification_requests) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Запросы на разъяснения</div>
                    <div className={styles.value}>{tender.clarification_requests}</div>
                  </div>
                )}
                {hasValue(tender.other_notes) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Другое</div>
                    <div className={styles.value}>{tender.other_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Результат */}
          {(hasValue(tender.contract_price) || 
            hasValue(tender.legal_entity_id)) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🏆 Результат</h3>
              <div className={styles.fields}>
                {hasValue(tender.contract_price) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Цена контракта (руб.)</div>
                    <div className={styles.value}>{formatCurrency(tender.contract_price)}</div>
                  </div>
                )}
                {hasValue(tender.legal_entity_id) && (
                  <div className={styles.field}>
                    <div className={styles.label}>Юр. лицо</div>
                    <div className={styles.value}>{tender.legal_entity_id}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
