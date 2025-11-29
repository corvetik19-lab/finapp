'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { PlanModal } from './PlanModal';
import { ConfirmModal } from './ConfirmModal';
import { togglePlanActive, updateAllPlansModes } from '@/app/(protected)/superadmin/actions';
import styles from '@/app/(protected)/superadmin/superadmin.module.css';

interface PlansManagerProps {
  plans: SubscriptionPlan[];
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

export function PlansManager({ plans }: PlansManagerProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [togglingPlan, setTogglingPlan] = useState<SubscriptionPlan | null>(null);
  const [updatingModes, setUpdatingModes] = useState(false);

  const handleToggle = async () => {
    if (!togglingPlan) return { success: false, error: 'Нет плана' };
    
    const result = await togglePlanActive(togglingPlan.id, !togglingPlan.is_active);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleSetTendersOnly = async () => {
    setUpdatingModes(true);
    const result = await updateAllPlansModes();
    if (result.success) {
      router.refresh();
    }
    setUpdatingModes(false);
  };

  return (
    <>
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Все тарифы ({plans.length})</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleSetTendersOnly}
              disabled={updatingModes}
              title="Установить только режим Тендеры для всех тарифов"
            >
              <span className="material-icons">gavel</span>
              {updatingModes ? 'Обновление...' : 'Только Тендеры'}
            </button>
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={() => setShowCreateModal(true)}
            >
              <span className="material-icons">add</span>
              Создать тариф
            </button>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
              <th>Цена (месяц)</th>
              <th>Цена (год)</th>
              <th>За пользователя</th>
              <th>Включено польз.</th>
              <th>Макс. польз.</th>
              <th>Режимы</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} style={{ opacity: plan.is_active ? 1 : 0.5 }}>
                <td>
                  <strong>{plan.name}</strong>
                  {plan.is_default && (
                    <span style={{ 
                      display: 'block',
                      fontSize: '10px', 
                      background: '#dbeafe', 
                      color: '#1e40af',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      width: 'fit-content'
                    }}>
                      По умолчанию
                    </span>
                  )}
                </td>
                <td style={{ maxWidth: '200px', fontSize: '13px', color: '#64748b' }}>
                  {plan.description || '—'}
                </td>
                <td>
                  <span className={styles.amount}>
                    {plan.base_price_monthly > 0 ? formatMoney(plan.base_price_monthly) : 'Бесплатно'}
                  </span>
                </td>
                <td>
                  <span className={styles.amount}>
                    {plan.base_price_yearly > 0 ? formatMoney(plan.base_price_yearly) : 'Бесплатно'}
                  </span>
                  {plan.base_price_yearly > 0 && plan.base_price_monthly > 0 && (
                    <div style={{ fontSize: '11px', color: '#10b981' }}>
                      −{Math.round((1 - plan.base_price_yearly / (plan.base_price_monthly * 12)) * 100)}%
                    </div>
                  )}
                </td>
                <td>
                  {plan.price_per_user_monthly > 0 ? (
                    <>
                      <span className={styles.amount}>{formatMoney(plan.price_per_user_monthly)}</span>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>/мес</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{plan.users_included}</td>
                <td>{plan.max_users || '∞'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {plan.allowed_modes.map((mode) => (
                      <span 
                        key={mode}
                        style={{
                          fontSize: '10px',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${plan.is_active ? styles.active : styles.cancelled}`}>
                    {plan.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`${styles.button} ${styles.secondary}`}
                      style={{ padding: '6px 12px' }}
                      title="Редактировать"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button 
                      className={`${styles.button} ${styles.secondary}`}
                      style={{ padding: '6px 12px' }}
                      title={plan.is_active ? 'Деактивировать' : 'Активировать'}
                      onClick={() => setTogglingPlan(plan)}
                    >
                      <span className="material-icons" style={{ fontSize: '16px' }}>
                        {plan.is_active ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модалка создания */}
      <PlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Модалка редактирования */}
      <PlanModal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        plan={editingPlan}
      />

      {/* Подтверждение переключения */}
      <ConfirmModal
        isOpen={!!togglingPlan}
        onClose={() => setTogglingPlan(null)}
        onConfirm={handleToggle}
        title={togglingPlan?.is_active ? 'Деактивировать тариф' : 'Активировать тариф'}
        message={
          togglingPlan?.is_active 
            ? `Вы уверены, что хотите деактивировать тариф "${togglingPlan?.name}"? Новые подписки на этот тариф будут недоступны.`
            : `Вы уверены, что хотите активировать тариф "${togglingPlan?.name}"?`
        }
        confirmText={togglingPlan?.is_active ? 'Деактивировать' : 'Активировать'}
        confirmVariant={togglingPlan?.is_active ? 'danger' : 'primary'}
      />
    </>
  );
}
