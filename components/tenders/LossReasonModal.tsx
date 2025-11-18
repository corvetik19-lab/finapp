'use client';

import { useState } from 'react';
import styles from './LossReasonModal.module.css';

interface LossReasonModalProps {
  tenderName: string;
  onSubmit: (reason: string, file: File | null, winnerInfo?: {
    winner_inn?: string;
    winner_name?: string;
    winner_price?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export function LossReasonModal({ tenderName, onSubmit, onCancel }: LossReasonModalProps) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winnerInn, setWinnerInn] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerPrice, setWinnerPrice] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Проверка размера файла (макс 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Размер файла не должен превышать 10 МБ');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Укажите причину проигрыша');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Подготавливаем информацию о победителе
      const winnerInfo = {
        winner_inn: winnerInn.trim() || undefined,
        winner_name: winnerName.trim() || undefined,
        winner_price: winnerPrice ? parseFloat(winnerPrice) * 100 : undefined, // рубли -> копейки
      };

      await onSubmit(reason.trim(), file, winnerInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Причина проигрыша</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className={styles.tenderName}>{tenderName}</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="reason" className={styles.label}>
              Причина проигрыша <span className={styles.required}>*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опишите причину проигрыша тендера..."
              rows={5}
              className={styles.textarea}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.winnerSection}>
            <h3 className={styles.sectionTitle}>Информация о победителе</h3>
            
            <div className={styles.field}>
              <label htmlFor="winnerInn" className={styles.label}>
                ИНН победителя
              </label>
              <input
                type="text"
                id="winnerInn"
                value={winnerInn}
                onChange={(e) => setWinnerInn(e.target.value)}
                placeholder="1234567890"
                className={styles.input}
                disabled={isSubmitting}
                maxLength={12}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="winnerName" className={styles.label}>
                Название победителя
              </label>
              <input
                type="text"
                id="winnerName"
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                placeholder="ООО «Название компании»"
                className={styles.input}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="winnerPrice" className={styles.label}>
                Цена победы (руб.)
              </label>
              <input
                type="number"
                id="winnerPrice"
                value={winnerPrice}
                onChange={(e) => setWinnerPrice(e.target.value)}
                placeholder="1000000.00"
                className={styles.input}
                disabled={isSubmitting}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="file" className={styles.label}>
              Прикрепить документ (необязательно)
            </label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              className={styles.fileInput}
              disabled={isSubmitting}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            {file && (
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className={styles.removeFile}
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            )}
            <div className={styles.hint}>
              Поддерживаемые форматы: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (макс. 10 МБ)
            </div>
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
