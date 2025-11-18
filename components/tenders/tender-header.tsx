'use client';

import { Tender } from '@/lib/tenders/types';
import styles from './tender-header.module.css';

interface TenderHeaderProps {
  tender: Tender;
}

export function TenderHeader({ tender }: TenderHeaderProps) {
  const formatCurrency = (amount: number | null, currency: string = 'RUB') => {
    if (amount === null || amount === undefined) return '—';
    const value = amount / 100; // копейки -> рубли
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.header}>
      {/* Компактный заголовок */}
      <div className={styles.compactHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{tender.subject}</h1>
          {tender.stage && (
            <span
              className={styles.stageBadge}
              style={{ backgroundColor: tender.stage.color || '#6b7280' }}
            >
              {tender.stage.name}
            </span>
          )}
        </div>
        
        <div className={styles.subtitle}>
          {tender.type?.name && <span className={styles.typeLabel}>{tender.type.name}</span>}
          {tender.customer}
        </div>
      </div>

      {/* Важная информация - компактно */}
      <div className={styles.keyInfoSimple}>
        <div className={styles.keyInfoSimpleItem}>
          <span className={styles.keyInfoSimpleLabel}>Срок подачи заявок</span>
          <span className={styles.keyInfoSimpleValue}>{formatDate(tender.submission_deadline)}</span>
        </div>

        <div className={styles.keyInfoSimpleItem}>
          <span className={styles.keyInfoSimpleLabel}>НМЦК</span>
          <span className={styles.keyInfoSimpleValue}>{formatCurrency(tender.nmck, tender.currency)}</span>
        </div>

        {tender.bid_price && tender.bid_price > 0 && (
          <div className={styles.keyInfoSimpleItem}>
            <span className={styles.keyInfoSimpleLabel}>Цена для торгов</span>
            <span className={styles.keyInfoSimpleValue}>{formatCurrency(tender.bid_price, tender.currency)}</span>
          </div>
        )}

        <div className={styles.keyInfoSimpleItem}>
          <span className={styles.keyInfoSimpleLabel}>№ ЕИС</span>
          <span className={styles.keyInfoSimpleValue}>
            {tender.eis_url ? (
              <a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className={styles.eisLink}>
                {tender.purchase_number}
              </a>
            ) : (
              tender.purchase_number
            )}
          </span>
        </div>
      </div>

      {/* Информация о победителе (для этапа "Проиграли") */}
      {tender.stage?.name === 'Проиграли' && (tender.winner_inn || tender.winner_name || tender.winner_price) && (
        <div className={styles.winnerInfo}>
          <h3 className={styles.winnerInfoTitle}>Информация о победителе</h3>
          <div className={styles.keyInfoSimple}>
            {tender.winner_inn && (
              <div className={styles.keyInfoSimpleItem}>
                <span className={styles.keyInfoSimpleLabel}>ИНН победителя</span>
                <span className={styles.keyInfoSimpleValue}>{tender.winner_inn}</span>
              </div>
            )}
            {tender.winner_name && (
              <div className={styles.keyInfoSimpleItem}>
                <span className={styles.keyInfoSimpleLabel}>Название победителя</span>
                <span className={styles.keyInfoSimpleValue}>{tender.winner_name}</span>
              </div>
            )}
            {tender.winner_price && (
              <div className={styles.keyInfoSimpleItem}>
                <span className={styles.keyInfoSimpleLabel}>Цена победы</span>
                <span className={styles.keyInfoSimpleValue}>{formatCurrency(tender.winner_price, tender.currency)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Дополнительная информация - компактно */}
      <div className={styles.additionalInfo}>
        {tender.platform && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Площадка:</span>
            <span className={styles.infoValue}>{tender.platform}</span>
          </div>
        )}
        
        {tender.city && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Город:</span>
            <span className={styles.infoValue}>{tender.city}</span>
          </div>
        )}

        {tender.responsible && tender.responsible.length > 0 && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Ответственные:</span>
            <span className={styles.infoValue}>
              {tender.responsible.map(r => r.employee.full_name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
