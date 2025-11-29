'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CalendarData, CalendarEvent, CalendarEventType } from '@/lib/tenders/calendar-service';
import styles from './TenderCalendar.module.css';

interface Props {
  initialData: CalendarData;
  companyId: string;
}

type ViewMode = 'month' | 'week' | 'agenda';

const EVENT_COLORS: Record<CalendarEventType, string> = {
  submission: '#667eea',
  results: '#f59e0b',
  contract_start: '#10b981',
  contract_end: '#8b5cf6',
  task: '#3b82f6',
  payment: '#ec4899',
};

const EVENT_ICONS: Record<CalendarEventType, string> = {
  submission: '📤',
  results: '🏆',
  contract_start: '⚡',
  contract_end: '📋',
  task: '✅',
  payment: '💰',
};

const EVENT_LABELS: Record<CalendarEventType, string> = {
  submission: 'Подача заявки',
  results: 'Итоги торгов',
  contract_start: 'Аукцион',
  contract_end: 'Рассмотрение заявок',
  task: 'Задача',
  payment: 'Оплата',
};

export default function TenderCalendarClient({ initialData, companyId }: Props) {
  const [data] = useState<CalendarData>(initialData);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filters, setFilters] = useState<CalendarEventType[]>([
    'submission', 'results', 'contract_start', 'contract_end', 'task'
  ]);
  const [showModal, setShowModal] = useState(false);

  // Подавляем warning о неиспользуемом companyId
  void companyId;

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} млн ₽`;
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long'
    }).format(date);
  };

  // Фильтрованные события
  const filteredEvents = useMemo(() => {
    return data.events.filter(e => filters.includes(e.type));
  }, [data.events, filters]);

  // Группировка событий по датам
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(event => {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    });
    return map;
  }, [filteredEvents]);

  // Генерация дней месяца
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowModal(true);
  };

  const toggleFilter = (type: CalendarEventType) => {
    setFilters(prev => 
      prev.includes(type) 
        ? prev.filter(f => f !== type)
        : [...prev, type]
    );
  };

  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];
  const { stats } = data;

  // Предстоящие события (следующие 7 дней)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = filteredEvents
    .filter(e => e.date >= todayStr)
    .slice(0, 8);

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📅</span>
            Календарь тендеров
          </h1>
          <p className={styles.subtitle}>Все важные даты и события</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewModeButtons}>
            {(['month', 'week', 'agenda'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`${styles.viewModeBtn} ${viewMode === mode ? styles.viewModeBtnActive : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : 'Повестка'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Боковая панель */}
        <div className={styles.sidebar}>
          {/* Статистика */}
          <div className={styles.statsCard}>
            <h3 className={styles.statsTitle}>📊 Статистика</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.totalEvents}</span>
                <span className={styles.statLabel}>Всего</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#ef4444' }}>{stats.urgentCount}</span>
                <span className={styles.statLabel}>Срочных</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#667eea' }}>{stats.submissionsCount}</span>
                <span className={styles.statLabel}>Подач</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#3b82f6' }}>{stats.tasksCount}</span>
                <span className={styles.statLabel}>Задач</span>
              </div>
            </div>
          </div>

          {/* Фильтры */}
          <div className={styles.filtersCard}>
            <h3 className={styles.filtersTitle}>🎯 Фильтры</h3>
            <div className={styles.filtersList}>
              {(Object.keys(EVENT_LABELS) as CalendarEventType[]).filter(t => t !== 'payment').map(type => (
                <label key={type} className={styles.filterItem}>
                  <input
                    type="checkbox"
                    checked={filters.includes(type)}
                    onChange={() => toggleFilter(type)}
                    className={styles.filterCheckbox}
                  />
                  <span 
                    className={styles.filterDot}
                    style={{ backgroundColor: EVENT_COLORS[type] }}
                  />
                  <span className={styles.filterLabel}>{EVENT_LABELS[type]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Предстоящие события */}
          <div className={styles.upcomingCard}>
            <h3 className={styles.upcomingTitle}>⏰ Ближайшие события</h3>
            {upcomingEvents.length > 0 ? (
              <div className={styles.upcomingList}>
                {upcomingEvents.map(event => (
                  <div 
                    key={event.id} 
                    className={`${styles.upcomingItem} ${event.isUrgent ? styles.upcomingItemUrgent : ''}`}
                    onClick={() => {
                      setSelectedDate(event.date);
                      setShowModal(true);
                    }}
                  >
                    <div 
                      className={styles.upcomingDot}
                      style={{ backgroundColor: EVENT_COLORS[event.type] }}
                    />
                    <div className={styles.upcomingContent}>
                      <div className={styles.upcomingDate}>
                        {new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {event.time && <span> {event.time}</span>}
                      </div>
                      <div className={styles.upcomingName}>{event.title}</div>
                      {event.daysLeft !== null && event.daysLeft <= 3 && (
                        <span className={styles.upcomingBadge}>
                          {event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.upcomingEmpty}>Нет предстоящих событий</div>
            )}
          </div>
        </div>

        {/* Основной контент */}
        <div className={styles.calendarWrapper}>
          {viewMode === 'month' && (
            <div className={styles.calendar}>
              {/* Навигация */}
              <div className={styles.calendarHeader}>
                <div className={styles.calendarTitle}>
                  <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                </div>
                <div className={styles.calendarControls}>
                  <button onClick={handleToday} className={styles.todayButton}>
                    Сегодня
                  </button>
                  <div className={styles.monthControls}>
                    <button onClick={handlePrevMonth} className={styles.navButton}>
                      ←
                    </button>
                    <button onClick={handleNextMonth} className={styles.navButton}>
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Дни недели */}
              <div className={styles.weekDays}>
                {weekDays.map(day => (
                  <div key={day} className={styles.weekDay}>{day}</div>
                ))}
              </div>

              {/* Сетка календаря */}
              <div className={styles.calendarGrid}>
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className={styles.emptyDay} />;
                  }

                  const dateStr = date.toISOString().split('T')[0];
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const hasEvents = dayEvents.length > 0;
                  const hasUrgent = dayEvents.some(e => e.isUrgent);

                  return (
                    <div
                      key={dateStr}
                      className={`${styles.calendarDay} ${isToday(date) ? styles.today : ''} ${hasEvents ? styles.hasEvents : ''} ${hasUrgent ? styles.hasUrgent : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <div className={styles.dayNumber}>{date.getDate()}</div>
                      {hasEvents && (
                        <div className={styles.eventsPreview}>
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={styles.eventPreviewItem}
                              style={{ borderLeftColor: EVENT_COLORS[event.type] }}
                            >
                              <span className={styles.eventPreviewIcon}>{EVENT_ICONS[event.type]}</span>
                              <span className={styles.eventPreviewText}>
                                {event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title}
                              </span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className={styles.moreEvents}>
                              +{dayEvents.length - 3} ещё
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className={styles.agendaView}>
              <div className={styles.agendaHeader}>
                <h2>Повестка дня</h2>
                <p>Все предстоящие события</p>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className={styles.agendaList}>
                  {upcomingEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`${styles.agendaItem} ${event.isUrgent ? styles.agendaItemUrgent : ''}`}
                    >
                      <div className={styles.agendaDate}>
                        <div className={styles.agendaDay}>
                          {new Date(event.date).getDate()}
                        </div>
                        <div className={styles.agendaMonth}>
                          {monthNames[new Date(event.date).getMonth()].substring(0, 3)}
                        </div>
                      </div>
                      <div 
                        className={styles.agendaLine}
                        style={{ backgroundColor: EVENT_COLORS[event.type] }}
                      />
                      <div className={styles.agendaContent}>
                        <div className={styles.agendaType}>
                          <span>{EVENT_ICONS[event.type]}</span>
                          <span>{EVENT_LABELS[event.type]}</span>
                          {event.time && <span className={styles.agendaTime}>{event.time}</span>}
                        </div>
                        <div className={styles.agendaTitle}>{event.title}</div>
                        {event.description && (
                          <div className={styles.agendaDescription}>{event.description}</div>
                        )}
                        {event.nmck && (
                          <div className={styles.agendaMeta}>
                            НМЦК: {formatCurrency(event.nmck)}
                          </div>
                        )}
                        {event.tenderId && (
                          <Link 
                            href={`/tenders/${event.tenderId}`}
                            className={styles.agendaLink}
                          >
                            Открыть тендер →
                          </Link>
                        )}
                      </div>
                      {event.daysLeft !== null && (
                        <div className={`${styles.agendaDaysLeft} ${event.daysLeft <= 1 ? styles.urgent : ''}`}>
                          {event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.agendaEmpty}>
                  <span className={styles.agendaEmptyIcon}>📭</span>
                  <p>Нет предстоящих событий</p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'week' && (
            <div className={styles.weekView}>
              <div className={styles.weekHeader}>
                <button onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }} className={styles.navButton}>←</button>
                <h2>Неделя {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h2>
                <button onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }} className={styles.navButton}>→</button>
              </div>
              <div className={styles.weekGrid}>
                {weekDays.map((dayName, idx) => {
                  const d = new Date(currentDate);
                  const dayOfWeek = d.getDay();
                  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  d.setDate(d.getDate() - diff + idx);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayEvents = eventsByDate.get(dateStr) || [];

                  return (
                    <div 
                      key={idx} 
                      className={`${styles.weekDayColumn} ${isToday(d) ? styles.weekDayToday : ''}`}
                    >
                      <div className={styles.weekDayHeader}>
                        <span className={styles.weekDayName}>{dayName}</span>
                        <span className={styles.weekDayDate}>{d.getDate()}</span>
                      </div>
                      <div className={styles.weekDayEvents}>
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className={styles.weekEvent}
                            style={{ borderLeftColor: EVENT_COLORS[event.type] }}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setShowModal(true);
                            }}
                          >
                            <span>{EVENT_ICONS[event.type]}</span>
                            <span>{event.title.substring(0, 15)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно */}
      {showModal && selectedDate && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>События дня</h2>
                <p className={styles.modalDate}>{formatDate(selectedDate)}</p>
              </div>
              <button onClick={() => setShowModal(false)} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {selectedDateEvents.length === 0 ? (
                <div className={styles.modalEmpty}>
                  <span className={styles.modalEmptyIcon}>📅</span>
                  <h3>Нет событий</h3>
                  <p>На этот день не запланировано никаких событий</p>
                </div>
              ) : (
                <div className={styles.eventsList}>
                  {selectedDateEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`${styles.eventCard} ${event.isUrgent ? styles.eventCardUrgent : ''}`}
                      style={{ borderLeftColor: EVENT_COLORS[event.type] }}
                    >
                      <div className={styles.eventHeader}>
                        <div className={styles.eventIcon}>{EVENT_ICONS[event.type]}</div>
                        <div className={styles.eventMeta}>
                          <div className={styles.eventType}>{EVENT_LABELS[event.type]}</div>
                          {event.time && <div className={styles.eventTime}>{event.time}</div>}
                        </div>
                        {event.daysLeft !== null && event.daysLeft <= 3 && (
                          <span className={`${styles.eventBadge} ${event.daysLeft === 0 ? styles.eventBadgeToday : ''}`}>
                            {event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}
                          </span>
                        )}
                      </div>

                      <div className={styles.eventContent}>
                        <h4 className={styles.eventTitle}>{event.title}</h4>
                        {event.description && (
                          <p className={styles.eventDescription}>{event.description}</p>
                        )}
                      </div>

                      {(event.nmck || event.tenderNumber) && (
                        <div className={styles.eventFooter}>
                          <div className={styles.eventInfo}>
                            {event.nmck && (
                              <div className={styles.eventInfoItem}>
                                <span className={styles.label}>НМЦК:</span>
                                <span className={styles.value}>{formatCurrency(event.nmck)}</span>
                              </div>
                            )}
                            {event.tenderNumber && (
                              <div className={styles.eventInfoItem}>
                                <span className={styles.label}>№:</span>
                                <span className={styles.value}>{event.tenderNumber}</span>
                              </div>
                            )}
                          </div>
                          {event.tenderId && (
                            <Link 
                              href={`/tenders/${event.tenderId}`}
                              className={styles.viewButton}
                              onClick={() => setShowModal(false)}
                            >
                              Открыть →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} className={styles.closeFooterButton}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
