'use client';

import { useState, useEffect } from 'react';
import styles from './modals.module.css';

interface StageData {
  name: string;
  category: string;
  color: string;
  is_active: boolean;
}

interface StageModalProps {
  stage?: Partial<StageData> & { id?: string };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StageData) => Promise<void>;
}

export function StageModal({ stage, isOpen, onClose, onSave }: StageModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'tender_dept',
    color: '#3b82f6',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name || '',
        category: stage.category || 'tender_dept',
        color: stage.color || '#3b82f6',
        is_active: stage.is_active !== undefined ? stage.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        category: 'tender_dept',
        color: '#3b82f6',
        is_active: true,
      });
    }
    setError('');
  }, [stage, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Название этапа обязательно');
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
            {stage ? 'Редактировать этап' : 'Создать этап'}
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
              Название этапа <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              placeholder="Например: Проверка документов"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Категория</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={styles.select}
            >
              <option value="tender_dept">Предконтрактная работа</option>
              <option value="realization">Реализация</option>
              <option value="archive">Архивные</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Цвет</label>
            <div className={styles.colorPicker}>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className={styles.colorInput}
              />
              <span className={styles.colorValue}>{formData.color}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Этап активен</span>
            </label>
            <p className={styles.hint}>
              Неактивные этапы не отображаются в канбан-доске
            </p>
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
