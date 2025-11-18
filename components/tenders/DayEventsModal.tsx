'use client';

import Link from 'next/link';
import type { Tender } from '@/lib/tenders/types';
import styles from './DayEventsModal.module.css';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'submission' | 'results' | 'deadline' | 'task';
  tender?: Tender;
  title: string;
  description?: string;
}

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
}

export function DayEventsModal({ isOpen, onClose, date, events }: DayEventsModalProps) {
  if (!isOpen || !date) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission':
        return '📤';
      case 'results':
        return '🏆';
      case 'deadline':
        return '⏰';
      case 'task':
        return '✓';
      default:
        return '📅';
    }
  };

  const getEventTypeName = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission':
        return 'Подача заявки';
      case 'results':
        return 'Результаты торгов';
      case 'deadline':
        return 'Дедлайн';
      case 'task':
        return 'Задача';
      default:
        return 'Событие';
    }
  };

  const getEventTypeClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission':
        return styles.submission;
      case 'results':
        return styles.results;
      case 'deadline':
        return styles.deadline;
      case 'task':
        return styles.task;
      default:
        return '';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>События дня</h2>
            <p className={styles.modalDate}>{formatDate(date)}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton} aria-label="Закрыть">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Events List */}
        <div className={styles.modalBody}>
          {events.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h3>Нет событий</h3>
              <p>На этот день не запланировано никаких событий</p>
            </div>
          ) : (
            <div className={styles.eventsList}>
              {events.map(event => (
                <div key={event.id} className={`${styles.eventCard} ${getEventTypeClass(event.type)}`}>
                  <div className={styles.eventHeader}>
                    <div className={styles.eventIcon}>{getEventIcon(event.type)}</div>
                    <div className={styles.eventMeta}>
                      <div className={styles.eventType}>{getEventTypeName(event.type)}</div>
                      <div className={styles.eventTime}>{formatTime(event.date)}</div>
                    </div>
                  </div>

                  <div className={styles.eventContent}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    {event.description && (
                      <p className={styles.eventDescription}>{event.description}</p>
                    )}
                  </div>

                  {event.tender && (
                    <div className={styles.eventFooter}>
                      <div className={styles.tenderInfo}>
                        <div className={styles.tenderInfoItem}>
                          <span className={styles.label}>НМЦК:</span>
                          <span className={styles.value}>
                            {(event.tender.nmck / 100).toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        {event.tender.purchase_number && (
                          <div className={styles.tenderInfoItem}>
                            <span className={styles.label}>№ ЕИС:</span>
                            <span className={styles.value}>{event.tender.purchase_number}</span>
                          </div>
                        )}
                      </div>
                      <Link 
                        href={`/tenders/${event.tender.id}`}
                        className={styles.viewButton}
                        onClick={onClose}
                      >
                        Открыть
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeFooterButton}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
