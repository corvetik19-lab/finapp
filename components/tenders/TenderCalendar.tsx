'use client';

import { useState } from 'react';
import type { Tender } from '@/lib/tenders/types';
import styles from './TenderCalendar.module.css';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'submission' | 'results' | 'deadline' | 'task';
  tender?: Tender;
  title: string;
  description?: string;
}

interface TenderCalendarProps {
  tenders: Tender[];
  onDateClick?: (date: Date, events: CalendarEvent[]) => void;
}

export function TenderCalendar({ tenders, onDateClick }: TenderCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Получаем события из тендеров
  const getEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    tenders.forEach(tender => {
      // Дата подачи
      if (tender.submission_deadline) {
        events.push({
          id: `submission-${tender.id}`,
          date: new Date(tender.submission_deadline),
          type: 'submission',
          tender,
          title: `Подача: ${tender.customer}`,
          description: tender.subject
        });
      }
      
      // Дата результатов
      if (tender.results_date) {
        events.push({
          id: `results-${tender.id}`,
          date: new Date(tender.results_date),
          type: 'results',
          tender,
          title: `Итоги: ${tender.customer}`,
          description: tender.subject
        });
      }
    });
    
    return events;
  };

  const events = getEvents();

  // Получаем события для конкретной даты
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Генерируем календарную сетку
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Добавляем пустые ячейки для дней предыдущего месяца
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }
    
    // Добавляем дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
    const dayEvents = getEventsForDate(date);
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date, dayEvents);
    }
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission':
        return '#667eea';
      case 'results':
        return '#f59e0b';
      case 'deadline':
        return '#ef4444';
      case 'task':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  return (
    <div className={styles.calendar}>
      {/* Шапка календаря */}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button onClick={handleNextMonth} className={styles.navButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
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
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className={styles.emptyDay} />;
          }

          const dayEvents = getEventsForDate(date);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={date.toISOString()}
              className={`${styles.calendarDay} ${isToday(date) ? styles.today : ''} ${isSelected(date) ? styles.selected : ''} ${hasEvents ? styles.hasEvents : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className={styles.dayNumber}>{date.getDate()}</div>
              {hasEvents && (
                <div className={styles.eventsContainer}>
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={styles.eventDot}
                      style={{ backgroundColor: getEventTypeColor(event.type) }}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className={styles.moreEvents}>
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
