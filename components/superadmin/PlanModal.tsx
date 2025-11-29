'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/billing';
import { createPlan, updatePlan } from '@/app/(protected)/superadmin/actions';
import styles from './SuperadminModals.module.css';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: SubscriptionPlan | null;
}

// Пока доступен только режим "Тендеры", остальные скрыты
const AVAILABLE_MODES = [
  { key: 'tenders', label: 'Тендеры' },
  // { key: 'finance', label: 'Финансы' },        // Скрыто - в разработке
  // { key: 'investments', label: 'Инвестиции' }, // Скрыто - в разработке
  // { key: 'personal', label: 'Личные финансы' }, // Скрыто - в разработке
];

export function PlanModal({ isOpen, onClose, plan }: PlanModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [basePriceMonthly, setBasePriceMonthly] = useState(plan ? (plan.base_price_monthly / 100).toString() : '');
  const [basePriceYearly, setBasePriceYearly] = useState(plan ? (plan.base_price_yearly / 100).toString() : '');
  const [pricePerUserMonthly, setPricePerUserMonthly] = useState(plan ? (plan.price_per_user_monthly / 100).toString() : '');
  const [pricePerUserYearly, setPricePerUserYearly] = useState(plan ? (plan.price_per_user_yearly / 100).toString() : '');
  const [usersIncluded, setUsersIncluded] = useState(plan?.users_included.toString() || '1');
  const [maxUsers, setMaxUsers] = useState(plan?.max_users?.toString() || '');
  const [allowedModes, setAllowedModes] = useState<string[]>(plan?.allowed_modes || ['tenders']);
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);

  const toggleMode = (mode: string) => {
    if (allowedModes.includes(mode)) {
      setAllowedModes(allowedModes.filter(m => m !== mode));
    } else {
      setAllowedModes([...allowedModes, mode]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Введите название тарифа');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('base_price_monthly', Math.round(parseFloat(basePriceMonthly || '0') * 100).toString());
    formData.append('base_price_yearly', Math.round(parseFloat(basePriceYearly || '0') * 100).toString());
    formData.append('price_per_user_monthly', Math.round(parseFloat(pricePerUserMonthly || '0') * 100).toString());
    formData.append('price_per_user_yearly', Math.round(parseFloat(pricePerUserYearly || '0') * 100).toString());
    formData.append('users_included', usersIncluded || '1');
    formData.append('max_users', maxUsers || '');
    formData.append('allowed_modes', allowedModes.join(','));
    formData.append('is_active', isActive.toString());

    if (plan) {
      formData.append('plan_id', plan.id);
      const result = await updatePlan(formData);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        setLoading(false);
        return;
      }
    } else {
      const result = await createPlan(formData);
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className={styles.header}>
          <h2>{plan ? 'Редактировать тариф' : 'Создать тариф'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label>Название *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Бизнес"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label>Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Краткое описание тарифа..."
                rows={2}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Цена/месяц (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePriceMonthly}
                  onChange={e => setBasePriceMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className={styles.field}>
                <label>Цена/год (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePriceYearly}
                  onChange={e => setBasePriceYearly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>За польз./месяц (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerUserMonthly}
                  onChange={e => setPricePerUserMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className={styles.field}>
                <label>За польз./год (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerUserYearly}
                  onChange={e => setPricePerUserYearly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Включено пользователей</label>
                <input
                  type="number"
                  min="1"
                  value={usersIncluded}
                  onChange={e => setUsersIncluded(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Макс. пользователей</label>
                <input
                  type="number"
                  min="0"
                  value={maxUsers}
                  onChange={e => setMaxUsers(e.target.value)}
                  placeholder="∞ (оставьте пустым)"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Доступные режимы</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {AVAILABLE_MODES.map(mode => (
                  <label
                    key={mode.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: allowedModes.includes(mode.key) ? '#667eea' : '#f1f5f9',
                      color: allowedModes.includes(mode.key) ? 'white' : '#475569',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowedModes.includes(mode.key)}
                      onChange={() => toggleMode(mode.key)}
                      style={{ display: 'none' }}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            {plan && (
              <div className={styles.field}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  Тариф активен
                </label>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Сохранение...' : plan ? 'Сохранить' : 'Создать тариф'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
