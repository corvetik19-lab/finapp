'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OrganizationPriceOverride, SubscriptionPlan } from '@/types/billing';
import { savePriceOverride, deletePriceOverride } from '@/app/(protected)/superadmin/actions';
import styles from './SuperadminModals.module.css';

interface PriceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  currentPlan: SubscriptionPlan | null;
  override: OrganizationPriceOverride | null;
}

export function PriceOverrideModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  currentPlan,
  override,
}: PriceOverrideModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Форма - значения в рублях для удобства ввода
  const [basePriceMonthly, setBasePriceMonthly] = useState('');
  const [basePriceYearly, setBasePriceYearly] = useState('');
  const [pricePerUserMonthly, setPricePerUserMonthly] = useState('');
  const [pricePerUserYearly, setPricePerUserYearly] = useState('');
  const [usersIncluded, setUsersIncluded] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [notes, setNotes] = useState('');

  // Заполняем форму при открытии
  useEffect(() => {
    if (override) {
      setBasePriceMonthly(override.base_price_monthly !== null ? (override.base_price_monthly / 100).toString() : '');
      setBasePriceYearly(override.base_price_yearly !== null ? (override.base_price_yearly / 100).toString() : '');
      setPricePerUserMonthly(override.price_per_user_monthly !== null ? (override.price_per_user_monthly / 100).toString() : '');
      setPricePerUserYearly(override.price_per_user_yearly !== null ? (override.price_per_user_yearly / 100).toString() : '');
      setUsersIncluded(override.users_included !== null ? override.users_included.toString() : '');
      setMaxUsers(override.max_users !== null ? override.max_users.toString() : '');
      setNotes(override.notes || '');
    } else {
      // Очищаем форму
      setBasePriceMonthly('');
      setBasePriceYearly('');
      setPricePerUserMonthly('');
      setPricePerUserYearly('');
      setUsersIncluded('');
      setMaxUsers('');
      setNotes('');
    }
  }, [override, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('organization_id', organizationId);
    formData.set('base_price_monthly', basePriceMonthly);
    formData.set('base_price_yearly', basePriceYearly);
    formData.set('price_per_user_monthly', pricePerUserMonthly);
    formData.set('price_per_user_yearly', pricePerUserYearly);
    formData.set('users_included', usersIncluded);
    formData.set('max_users', maxUsers);
    formData.set('notes', notes);

    const result = await savePriceOverride(formData);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || 'Ошибка сохранения');
    }

    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Вернуться к стандартным ценам тарифа?')) return;
    
    setLoading(true);
    const result = await deletePriceOverride(organizationId);
    
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || 'Ошибка удаления');
    }
    setLoading(false);
  };

  const formatMoney = (kopecks: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Индивидуальные цены</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {error && (
              <div className={styles.error}>
                <span className="material-icons">error</span>
                {error}
              </div>
            )}

            <div className={styles.orgHeader}>
              <span className="material-icons">business</span>
              <span>{organizationName}</span>
            </div>

            {currentPlan && (
              <div className={styles.infoBox}>
                <strong>Текущий тариф: {currentPlan.name}</strong>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Стандартные цены: {formatMoney(currentPlan.base_price_monthly)}/мес, 
                  {formatMoney(currentPlan.price_per_user_monthly)}/польз.
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Оставьте поле пустым чтобы использовать стандартную цену тарифа.
              Заполните только те поля, которые хотите переопределить.
            </p>

            <div className={styles.formSection}>
              <h4>Базовая стоимость</h4>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>За месяц (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePriceMonthly}
                    onChange={(e) => setBasePriceMonthly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.base_price_monthly / 100).toString() : '0'}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>За год (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePriceYearly}
                    onChange={(e) => setBasePriceYearly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.base_price_yearly / 100).toString() : '0'}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4>За дополнительного сотрудника</h4>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>За месяц (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePerUserMonthly}
                    onChange={(e) => setPricePerUserMonthly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.price_per_user_monthly / 100).toString() : '0'}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>За год (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePerUserYearly}
                    onChange={(e) => setPricePerUserYearly(e.target.value)}
                    placeholder={currentPlan ? (currentPlan.price_per_user_yearly / 100).toString() : '0'}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h4>Лимиты пользователей</h4>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Включено в тариф</label>
                  <input
                    type="number"
                    min="1"
                    value={usersIncluded}
                    onChange={(e) => setUsersIncluded(e.target.value)}
                    placeholder={currentPlan ? currentPlan.users_included.toString() : '1'}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Максимум (пусто = ∞)</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    placeholder={currentPlan?.max_users?.toString() || '∞'}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Заметки</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Причина индивидуальных цен..."
                rows={2}
              />
            </div>
          </div>

          <div className={styles.footer}>
            {override && (
              <button
                type="button"
                className={`${styles.button} ${styles.danger}`}
                onClick={handleReset}
                disabled={loading}
              >
                Сбросить к стандартным
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.primary}`}
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
