'use client';

import { useState, useEffect } from 'react';
import styles from './modals.module.css';

interface TypeData {
  name: string;
  description: string;
}

interface TypeModalProps {
  type?: Partial<TypeData> & { id?: string; is_system?: boolean };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TypeData) => Promise<void>;
}

export function TypeModal({ type, isOpen, onClose, onSave }: TypeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type) {
      setFormData({
        name: type.name || '',
        description: type.description || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
    setError('');
  }, [type, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Название типа обязательно');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {type ? 'Редактировать тип' : 'Создать тип'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage}>
              ⚠️ {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Название типа <span className={styles.required}>*</span>
              {type?.is_system && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                  (системный тип)
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              placeholder="Например: Электронный аукцион"
              required
              readOnly={type?.is_system}
              disabled={type?.is_system}
              style={type?.is_system ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}}
            />
            {type?.is_system && (
              <p className={styles.hint} style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                Название системного типа нельзя изменить
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Краткое описание типа тендера"
              rows={4}
            />
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.secondaryButton}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
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
