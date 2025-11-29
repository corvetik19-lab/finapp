'use client';

import { useState } from 'react';
import styles from './SuperadminModals.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  confirmVariant = 'primary',
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const result = await onConfirm();
    
    if (!result.success) {
      setError(result.error || 'Ошибка');
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal + ' ' + styles.small} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}
          <p className={styles.confirmMessage}>{message}</p>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button
            type="button"
            className={confirmVariant === 'danger' ? styles.dangerBtn : styles.submitBtn}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Выполнение...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
