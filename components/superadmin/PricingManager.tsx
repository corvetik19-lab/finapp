'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { updatePlanPricing } from '@/app/(protected)/superadmin/actions';
import styles from '@/app/(protected)/superadmin/superadmin.module.css';
import modalStyles from './SuperadminModals.module.css';

interface PricingManagerProps {
  plans: SubscriptionPlan[];
}

export function PricingManager({ plans }: PricingManagerProps) {
  const router = useRouter();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Форма редактирования
  const [formData, setFormData] = useState({
    base_price_monthly: '',
    base_price_yearly: '',
    price_per_user_monthly: '',
    price_per_user_yearly: '',
    users_included: '',
    max_users: '',
  });

  const formatMoney = (kopecks: number) => {
    if (kopecks === 0) return 'Бесплатно';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      base_price_monthly: (plan.base_price_monthly / 100).toString(),
      base_price_yearly: (plan.base_price_yearly / 100).toString(),
      price_per_user_monthly: (plan.price_per_user_monthly / 100).toString(),
      price_per_user_yearly: (plan.price_per_user_yearly / 100).toString(),
      users_included: plan.users_included.toString(),
      max_users: plan.max_users?.toString() || '',
    });
    setError(null);
  };

  const closeModal = () => {
    setEditingPlan(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set('plan_id', editingPlan.id);
    fd.set('base_price_monthly', formData.base_price_monthly);
    fd.set('base_price_yearly', formData.base_price_yearly);
    fd.set('price_per_user_monthly', formData.price_per_user_monthly);
    fd.set('price_per_user_yearly', formData.price_per_user_yearly);
    fd.set('users_included', formData.users_included);
    fd.set('max_users', formData.max_users);

    const result = await updatePlanPricing(fd);

    if (result.success) {
      setSuccess(`Цены для "${editingPlan.name}" обновлены`);
      setTimeout(() => setSuccess(null), 3000);
      router.refresh();
      closeModal();
    } else {
      setError(result.error || 'Ошибка сохранения');
    }

    setLoading(false);
  };

  return (
    <>
      {success && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span className="material-icons">check_circle</span>
          {success}
        </div>
      )}

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Цены на тарифы ({plans.length})</h3>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Тариф</th>
              <th>Базовая (месяц)</th>
              <th>Базовая (год)</th>
              <th>За польз. (месяц)</th>
              <th>За польз. (год)</th>
              <th>Включено польз.</th>
              <th>Макс. польз.</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <strong>{plan.name}</strong>
                  {plan.is_default && (
                    <span style={{ 
                      fontSize: '11px', 
                      background: '#dbeafe', 
                      color: '#1e40af',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginLeft: '8px'
                    }}>
                      По умолчанию
                    </span>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: '#667eea' }}>
                  {formatMoney(plan.base_price_monthly)}
                </td>
                <td>{formatMoney(plan.base_price_yearly)}</td>
                <td>{formatMoney(plan.price_per_user_monthly)}</td>
                <td>{formatMoney(plan.price_per_user_yearly)}</td>
                <td>{plan.users_included}</td>
                <td>{plan.max_users || '∞'}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: plan.is_active ? '#dcfce7' : '#fef3c7',
                    color: plan.is_active ? '#166534' : '#92400e'
                  }}>
                    {plan.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td>
                  <button
                    className={`${styles.button} ${styles.primary}`}
                    style={{ padding: '8px 16px' }}
                    onClick={() => openEditModal(plan)}
                  >
                    <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                    Изменить цены
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Информационный блок */}
      <div className={styles.infoCard} style={{ marginTop: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="material-icons" style={{ color: '#667eea' }}>info</span>
          Как работает ценообразование
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <strong style={{ color: '#475569' }}>Базовая стоимость</strong>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Фиксированная цена тарифа без учёта дополнительных пользователей
            </p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Цена за пользователя</strong>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Стоимость каждого пользователя сверх включённого количества
            </p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Включено пользователей</strong>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Количество пользователей, входящих в базовую стоимость
            </p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Формула расчёта</strong>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Итого = База + (Пользователей − Включено) × Цена за польз.
            </p>
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {editingPlan && (
        <div className={modalStyles.overlay} onClick={closeModal}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className={modalStyles.header}>
              <h2>Изменить цены: {editingPlan.name}</h2>
              <button className={modalStyles.closeButton} onClick={closeModal}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={modalStyles.body}>
              {error && (
                <div className={modalStyles.error}>
                  <span className="material-icons">error</span>
                  {error}
                </div>
              )}

              <div className={modalStyles.formSection}>
                <h4>Базовая стоимость тарифа</h4>
                <div className={modalStyles.formRow}>
                  <div className={modalStyles.formGroup}>
                    <label>За месяц (₽)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.base_price_monthly}
                      onChange={(e) => setFormData({ ...formData, base_price_monthly: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className={modalStyles.formGroup}>
                    <label>За год (₽)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.base_price_yearly}
                      onChange={(e) => setFormData({ ...formData, base_price_yearly: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className={modalStyles.formSection}>
                <h4>За дополнительного пользователя</h4>
                <div className={modalStyles.formRow}>
                  <div className={modalStyles.formGroup}>
                    <label>За месяц (₽)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_per_user_monthly}
                      onChange={(e) => setFormData({ ...formData, price_per_user_monthly: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className={modalStyles.formGroup}>
                    <label>За год (₽)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_per_user_yearly}
                      onChange={(e) => setFormData({ ...formData, price_per_user_yearly: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className={modalStyles.formSection}>
                <h4>Лимиты пользователей</h4>
                <div className={modalStyles.formRow}>
                  <div className={modalStyles.formGroup}>
                    <label>Включено в тариф</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.users_included}
                      onChange={(e) => setFormData({ ...formData, users_included: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div className={modalStyles.formGroup}>
                    <label>Максимум (пусто = безлимит)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              {/* Предварительный расчёт */}
              <div style={{ 
                background: '#f8fafc', 
                borderRadius: '12px', 
                padding: '16px',
                marginTop: '8px'
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#475569' }}>
                  Пример расчёта для 10 пользователей
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Месячная оплата:</span>
                    <strong style={{ marginLeft: '8px', color: '#667eea' }}>
                      {formatMoney(
                        (parseFloat(formData.base_price_monthly) || 0) * 100 +
                        Math.max(0, 10 - (parseInt(formData.users_included) || 1)) *
                        (parseFloat(formData.price_per_user_monthly) || 0) * 100
                      )}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Годовая оплата:</span>
                    <strong style={{ marginLeft: '8px', color: '#667eea' }}>
                      {formatMoney(
                        (parseFloat(formData.base_price_yearly) || 0) * 100 +
                        Math.max(0, 10 - (parseInt(formData.users_included) || 1)) *
                        (parseFloat(formData.price_per_user_yearly) || 0) * 100
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={modalStyles.footer}>
              <button
                className={`${modalStyles.button} ${modalStyles.secondary}`}
                onClick={closeModal}
                disabled={loading}
              >
                Отмена
              </button>
              <button
                className={`${modalStyles.button} ${modalStyles.primary}`}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить цены'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
