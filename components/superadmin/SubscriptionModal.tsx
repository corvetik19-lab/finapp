'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, OrganizationSubscription, BillingPeriod } from '@/types/billing';
import { createOrganizationSubscription, updateOrganizationSubscription, calculateSubscriptionPrice } from '@/app/(protected)/superadmin/actions';
import styles from './SuperadminModals.module.css';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  organizationId: string;
  organizationName: string;
  subscription?: OrganizationSubscription | null;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  plans,
  organizationId,
  organizationName,
  subscription,
}: SubscriptionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planId, setPlanId] = useState(subscription?.plan_id || plans[0]?.id || '');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(subscription?.billing_period || 'monthly');
  const [usersCount, setUsersCount] = useState(subscription?.users_count || 1);
  const [discountPercent, setDiscountPercent] = useState(subscription?.discount_percent || 0);
  const [trialDays, setTrialDays] = useState(0);
  const [notes, setNotes] = useState(subscription?.notes || '');

  const [calculatedPrice, setCalculatedPrice] = useState<{
    base_amount: number;
    users_amount: number;
    extra_users: number;
    subtotal: number;
    discount_amount: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (planId) {
      calculateSubscriptionPrice(planId, usersCount, billingPeriod, discountPercent)
        .then(result => {
          if (result.success && result.data) {
            setCalculatedPrice(result.data);
          }
        });
    }
  }, [planId, usersCount, billingPeriod, discountPercent]);

  const formatMoney = (kopecks: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('organization_id', organizationId);
    formData.append('plan_id', planId);
    formData.append('billing_period', billingPeriod);
    formData.append('users_count', usersCount.toString());
    formData.append('discount_percent', discountPercent.toString());
    formData.append('notes', notes);

    if (subscription) {
      formData.append('subscription_id', subscription.id);
      const result = await updateOrganizationSubscription(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    } else {
      formData.append('trial_days', trialDays.toString());
      const result = await createOrganizationSubscription(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
    onClose();
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{subscription ? 'Редактировать подписку' : 'Создать подписку'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <div className={styles.orgInfo}>
              <span className="material-icons">business</span>
              <span>{organizationName}</span>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label>Тарифный план</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)}>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {formatMoney(plan.base_price_monthly)}/мес
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Период оплаты</label>
                <select value={billingPeriod} onChange={e => setBillingPeriod(e.target.value as BillingPeriod)}>
                  <option value="monthly">Месячная</option>
                  <option value="yearly">Годовая</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Пользователей</label>
                <input
                  type="number"
                  min="1"
                  max={selectedPlan?.max_users || 1000}
                  value={usersCount}
                  onChange={e => setUsersCount(parseInt(e.target.value) || 1)}
                />
                {selectedPlan && (
                  <small>Включено: {selectedPlan.users_included}, макс: {selectedPlan.max_users || '∞'}</small>
                )}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Скидка (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(parseInt(e.target.value) || 0)}
                />
              </div>

              {!subscription && (
                <div className={styles.field}>
                  <label>Пробный период (дней)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={trialDays}
                    onChange={e => setTrialDays(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label>Заметки</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Комментарий к подписке..."
                rows={2}
              />
            </div>

            {calculatedPrice && (
              <div className={styles.priceBreakdown}>
                <h4>Расчёт стоимости</h4>
                <div className={styles.priceRow}>
                  <span>Базовая стоимость</span>
                  <span>{formatMoney(calculatedPrice.base_amount)}</span>
                </div>
                {calculatedPrice.extra_users > 0 && (
                  <div className={styles.priceRow}>
                    <span>+{calculatedPrice.extra_users} доп. пользователей</span>
                    <span>{formatMoney(calculatedPrice.users_amount)}</span>
                  </div>
                )}
                {calculatedPrice.discount_amount > 0 && (
                  <div className={styles.priceRow + ' ' + styles.discount}>
                    <span>Скидка {discountPercent}%</span>
                    <span>−{formatMoney(calculatedPrice.discount_amount)}</span>
                  </div>
                )}
                <div className={styles.priceRow + ' ' + styles.total}>
                  <span>Итого за {billingPeriod === 'yearly' ? 'год' : 'месяц'}</span>
                  <span>{formatMoney(calculatedPrice.total)}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Сохранение...' : subscription ? 'Сохранить' : 'Создать подписку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
