'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenderCalendar } from '@/components/tenders/TenderCalendar';
import { DayEventsModal } from '@/components/tenders/DayEventsModal';
import type { Tender } from '@/lib/tenders/types';
import styles from '../tenders.module.css';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'submission' | 'results' | 'deadline' | 'task';
  tender?: Tender;
  title: string;
  description?: string;
}

export default function TenderCalendarPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  const loadTenders = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `/api/tenders?company_id=${companyId}&limit=1000`
      );
      if (!response.ok) throw new Error('Failed');
      
      const data = await response.json();
      setTenders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const handleDateClick = (date: Date, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className={styles.tendersContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2rem' }}>⏳ Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tendersContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Календарь тендеров</h1>
          <p className={styles.pageDescription}>
            Все важные даты и события по тендерам
          </p>
        </div>
      </div>

      {/* Calendar */}
      <TenderCalendar tenders={tenders} onDateClick={handleDateClick} />

      {/* Day Events Modal */}
      <DayEventsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        date={selectedDate}
        events={selectedEvents}
      />
    </div>
  );
}
