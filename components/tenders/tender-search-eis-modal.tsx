'use client';

import { useState } from 'react';
import styles from './tender-search-eis-modal.module.css';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';

interface TenderSearchEISModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenderFound: (tenderData: EISTenderData) => void;
  onManualAdd: () => void;
  companyId: string;
}

export function TenderSearchEISModal({
  isOpen,
  onClose,
  onTenderFound,
  onManualAdd,
  companyId,
}: TenderSearchEISModalProps) {
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notFoundNumber, setNotFoundNumber] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!purchaseNumber.trim()) {
      setError('Введите номер закупки');
      return;
    }

    setSearching(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      // Сначала проверяем, есть ли уже такой тендер в системе
      const checkResponse = await fetch(
        `/api/tenders?company_id=${companyId}&purchase_number=${encodeURIComponent(purchaseNumber.trim())}`,
        { cache: 'no-store' }
      );

      if (checkResponse.ok) {
        const existingTenders = await checkResponse.json();
        if (existingTenders && existingTenders.length > 0) {
          // Тендер уже существует
          setDuplicateWarning(
            `⚠️ Тендер с номером "${purchaseNumber}" уже загружен в систему!`
          );
          setSearching(false);
          return;
        }
      }

      // Если тендера нет, ищем в ЕИС
      const response = await fetch(
        `/api/tenders/search-eis?purchase_number=${encodeURIComponent(purchaseNumber)}&include_documents=true`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Тендер не найден в ЕИС - показываем модалку подтверждения
          setNotFoundNumber(purchaseNumber.trim());
          setShowConfirmModal(true);
        } else {
          setError('Ошибка при поиске тендера');
        }
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Передаем найденные данные родительскому компоненту
        onTenderFound(result.data);
        // Закрываем модалку поиска
        onClose();
        // Сбрасываем состояние
        setPurchaseNumber('');
        setError(null);
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Error searching tender:', err);
      setError('Ошибка при поиске тендера в ЕИС');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      handleSearch();
    }
  };

  const handleManualAdd = () => {
    setPurchaseNumber('');
    setError(null);
    setDuplicateWarning(null);
    onManualAdd();
  };

  const handleClose = () => {
    setPurchaseNumber('');
    setError(null);
    setDuplicateWarning(null);
    setShowConfirmModal(false);
    setNotFoundNumber('');
    onClose();
  };

  const handleConfirmAdd = () => {
    setShowConfirmModal(false);
    setPurchaseNumber('');
    setNotFoundNumber('');
    onManualAdd();
  };

  const handleCancelAdd = () => {
    setShowConfirmModal(false);
    setNotFoundNumber('');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Добавить закупку</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.searchSection}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите номер тендера для поиска по базе госзакупок"
                className={styles.input}
                disabled={searching}
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !purchaseNumber.trim()}
              className={styles.searchButton}
            >
              {searching ? '🔄 Поиск...' : '🔍 Найти'}
            </button>
          </div>

          {duplicateWarning && (
            <div className={styles.duplicateWarning}>
              <span className={styles.warningIcon}>⚠️</span>
              <div className={styles.warningContent}>
                <p className={styles.warningTitle}>Тендер уже в системе</p>
                <p className={styles.warningText}>{duplicateWarning}</p>
              </div>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div className={styles.hint}>
            <p>💡 Введите номер закупки из ЕИС (например: 32515383401)</p>
            <p>Система автоматически заполнит все поля формы</p>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={handleClose} className={styles.cancelButton}>
            Отмена
          </button>
          <button onClick={handleManualAdd} className={styles.manualButton}>
            ✏️ Добавить вручную
          </button>
        </div>
      </div>

      {/* Модалка подтверждения добавления */}
      {showConfirmModal && (
        <div className={styles.confirmOverlay} onClick={(e) => e.stopPropagation()}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <span className={styles.questionIcon}>❓</span>
            </div>
            <h3 className={styles.confirmTitle}>Закупка не найдена в ЕИС</h3>
            <p className={styles.confirmMessage}>
              Закупка с номером <strong>&ldquo;{notFoundNumber}&rdquo;</strong> отсутствует в системе ЕИС.
            </p>
            <p className={styles.confirmQuestion}>
              Хотите добавить эту закупку вручную?
            </p>
            <div className={styles.confirmActions}>
              <button onClick={handleCancelAdd} className={styles.confirmCancelButton}>
                ✕ Отменить
              </button>
              <button onClick={handleConfirmAdd} className={styles.confirmAddButton}>
                ✓ Добавить закупку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
