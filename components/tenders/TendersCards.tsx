'use client';

import { useState } from 'react';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import { formatCurrency, daysUntilDeadline } from '@/lib/tenders/types';
import { TenderViewModal } from './TenderViewModal';
import styles from './TendersCards.module.css';

interface TendersCardsProps {
  tenders: Tender[];
  stages: TenderStage[];
  types?: TenderType[];
  onDelete?: (id: string) => void;
}

export function TendersCards({ tenders, stages, types = [], onDelete }: TendersCardsProps) {
  const [viewTenderId, setViewTenderId] = useState<string | null>(null);

  const getStageName = (tender: Tender) => {
    // Сначала пробуем получить из вложенного объекта
    if (tender.stage && typeof tender.stage === 'object' && 'name' in tender.stage) {
      return tender.stage.name;
    }
    // Fallback на поиск по stage_id
    const stage = stages.find(s => s.id === tender.stage_id);
    return stage?.name || '-';
  };

  const getTypeName = (tender: Tender) => {
    // Сначала пробуем получить из вложенного объекта
    if (tender.type && typeof tender.type === 'object' && 'name' in tender.type) {
      return tender.type.name;
    }
    // Fallback на поиск по type_id
    if (!tender.type_id) return '-';
    const type = types.find(t => t.id === tender.type_id);
    return type?.name || '-';
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getStatusLabel = (status: Tender['status']) => {
    const labels = {
      active: 'Активный',
      won: 'Выигран',
      lost: 'Проигран',
      archived: 'Архив',
    };
    return labels[status];
  };

  if (tenders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <h3>Нет тендеров</h3>
        <p>Добавьте первый тендер для начала работы</p>
      </div>
    );
  }

  return (
    <div className={styles.cardsGrid}>
      {tenders.map((tender) => {
        const daysLeft = tender.submission_deadline 
          ? daysUntilDeadline(tender.submission_deadline)
          : null;
        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
        const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

        return (
          <div key={tender.id} className={`${styles.card} ${tender.status === 'won' ? styles.cardWon : ''}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardNumber}>№ {tender.purchase_number || 'Без номера'}</div>
              <div className={styles.cardStatus}>
                <span className={`${styles.statusBadge} ${styles[`status${tender.status}`]}`}>
                  {getStatusLabel(tender.status)}
                </span>
              </div>
            </div>

            <div className={styles.cardLink} onClick={() => setViewTenderId(tender.id)} style={{ cursor: 'pointer' }}>
              <h3 className={styles.cardTitle}>{tender.subject}</h3>
            </div>

            <div className={styles.cardCustomer}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{tender.customer}</span>
            </div>

            <div className={styles.cardInfo}>
              <div className={styles.cardInfoItem}>
                <span className={styles.cardInfoLabel}>НМЦК:</span>
                <span className={styles.cardInfoValue}>{formatCurrency(tender.nmck / 100)}</span>
              </div>
              <div className={styles.cardInfoItem}>
                <span className={styles.cardInfoLabel}>Тип закупки:</span>
                <span className={styles.cardInfoValue}>{getTypeName(tender)}</span>
              </div>
              <div className={styles.cardInfoItem}>
                <span className={styles.cardInfoLabel}>Этап:</span>
                <span className={styles.cardInfoValue}>{getStageName(tender)}</span>
              </div>
            </div>

            {tender.submission_deadline && (
              <div className={styles.cardDeadline}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Дедлайн: {formatDate(tender.submission_deadline)}</span>
                {daysLeft !== null && daysLeft >= 0 && (
                  <span className={`${styles.daysLeft} ${isUrgent ? styles.urgent : isWarning ? styles.warning : ''}`}>
                    {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                  </span>
                )}
              </div>
            )}

            <div className={styles.cardActions}>
              <button
                onClick={() => setViewTenderId(tender.id)}
                className={styles.cardActionButton}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Просмотр
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(tender.id)}
                  className={styles.cardActionButtonDanger}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Удалить
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Модалка просмотра тендера */}
      {viewTenderId && (
        <TenderViewModal
          tenderId={viewTenderId}
          onClose={() => setViewTenderId(null)}
        />
      )}
    </div>
  );
}
