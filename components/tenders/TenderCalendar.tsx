'use client';

import { useState } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const getEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    tenders.forEach(tender => {
      if (tender.submission_deadline) {
        events.push({ id: `submission-${tender.id}`, date: new Date(tender.submission_deadline), type: 'submission', tender, title: `Подача: ${tender.customer}`, description: tender.subject });
      }
      if (tender.results_date) {
        events.push({ id: `results-${tender.id}`, date: new Date(tender.results_date), type: 'results', tender, title: `Итоги: ${tender.customer}`, description: tender.subject });
      }
    });
    return events;
  };

  const events = getEvents();

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() && eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear();
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < adjustedStart; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const days = generateCalendarDays();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateClick) onDateClick(date, getEventsForDate(date));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission': return 'bg-blue-500';
      case 'results': return 'bg-amber-500';
      case 'deadline': return 'bg-red-500';
      case 'task': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
            <div className="flex">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
            const dayEvents = getEventsForDate(date);
            const hasEvents = dayEvents.length > 0;
            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                className={`aspect-square p-1 rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-start
                  ${isToday(date) ? 'bg-blue-100 font-bold' : 'hover:bg-gray-100'}
                  ${isSelected(date) ? 'ring-2 ring-blue-500' : ''}
                  ${hasEvents ? 'bg-gray-50' : ''}`}
              >
                <span className={`text-sm ${isToday(date) ? 'text-blue-600' : ''}`}>{date.getDate()}</span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(event.type)}`} title={event.title} />
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-gray-500">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
