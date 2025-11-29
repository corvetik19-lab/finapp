'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPayment } from '@/app/(protected)/superadmin/actions';
import styles from './SuperadminModals.module.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  suggestedAmount?: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  subscriptionId,
  organizationId,
  organizationName,
  suggestedAmount = 0,
}: PaymentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amountRubles, setAmountRubles] = useState(suggestedAmount > 0 ? (suggestedAmount / 100).toString() : '');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [description, setDescription] = useState('');

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

    const amountKopecks = Math.round(parseFloat(amountRubles) * 100);

    if (isNaN(amountKopecks) || amountKopecks <= 0) {
      setError('Введите корректную сумму');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('subscription_id', subscriptionId);
    formData.append('organization_id', organizationId);
    formData.append('amount', amountKopecks.toString());
    formData.append('payment_method', paymentMethod);
    formData.append('description', description);

    const result = await addPayment(formData);
    
    if (!result.success) {
      setError(result.error || 'Ошибка');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Добавить платёж</h2>
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
              <label>Сумма (₽)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountRubles}
                onChange={e => setAmountRubles(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {suggestedAmount > 0 && (
                <small>
                  Рекомендуемая сумма: {formatMoney(suggestedAmount)}
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setAmountRubles((suggestedAmount / 100).toString())}
                  >
                    Применить
                  </button>
                </small>
              )}
            </div>

            <div className={styles.field}>
              <label>Способ оплаты</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="bank_transfer">Банковский перевод</option>
                <option value="card">Банковская карта</option>
                <option value="cash">Наличные</option>
                <option value="crypto">Криптовалюта</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Комментарий к платежу..."
                rows={2}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Сохранение...' : 'Добавить платёж'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
