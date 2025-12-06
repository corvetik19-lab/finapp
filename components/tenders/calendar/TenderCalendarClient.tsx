'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CalendarData, CalendarEvent, CalendarEventType } from '@/lib/tenders/calendar-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar, List, LayoutGrid, ExternalLink } from 'lucide-react';

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
  const [filters, setFilters] = useState<CalendarEventType[]>(['submission', 'results', 'contract_start', 'contract_end', 'task']);
  const [showModal, setShowModal] = useState(false);

  void companyId;

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} млн ₽`;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(dateStr));

  const filteredEvents = useMemo(() => data.events.filter(e => filters.includes(e.type)), [data.events, filters]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(event => {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    });
    return map;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => {
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
  }, [currentDate]);

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowModal(true);
  };

  const toggleFilter = (type: CalendarEventType) => {
    setFilters(prev => prev.includes(type) ? prev.filter(f => f !== type) : [...prev, type]);
  };

  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];
  const { stats } = data;
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = filteredEvents.filter(e => e.date >= todayStr).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📅 Календарь тендеров</h1>
          <p className="text-gray-500 mt-1">Все важные даты и события</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['month', 'week', 'agenda'] as ViewMode[]).map(mode => (
            <Button key={mode} variant={viewMode === mode ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode(mode)}>
              {mode === 'month' ? <><LayoutGrid className="h-4 w-4 mr-1" />Месяц</> : mode === 'week' ? <><Calendar className="h-4 w-4 mr-1" />Неделя</> : <><List className="h-4 w-4 mr-1" />Повестка</>}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Статистика</h3><div className="grid grid-cols-2 gap-3">{[{ val: stats.totalEvents, label: 'Всего' }, { val: stats.urgentCount, label: 'Срочных', color: 'text-red-600' }, { val: stats.submissionsCount, label: 'Подач', color: 'text-indigo-600' }, { val: stats.tasksCount, label: 'Задач', color: 'text-blue-600' }].map((s, i) => <div key={i} className="text-center p-2 bg-gray-50 rounded-lg"><div className={`text-xl font-bold ${s.color || ''}`}>{s.val}</div><div className="text-xs text-gray-500">{s.label}</div></div>)}</div></CardContent></Card>

          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🎯 Фильтры</h3><div className="space-y-2">{(Object.keys(EVENT_LABELS) as CalendarEventType[]).filter(t => t !== 'payment').map(type => <label key={type} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={filters.includes(type)} onChange={() => toggleFilter(type)} className="rounded" /><span className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS[type] }} /><span className="text-sm">{EVENT_LABELS[type]}</span></label>)}</div></CardContent></Card>

          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">⏰ Ближайшие события</h3>{upcomingEvents.length > 0 ? <div className="space-y-2">{upcomingEvents.map(event => <div key={event.id} className={`p-2 rounded cursor-pointer hover:bg-gray-50 ${event.isUrgent ? 'bg-red-50' : ''}`} onClick={() => { setSelectedDate(event.date); setShowModal(true); }}><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[event.type] }} /><span className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}{event.time && ` ${event.time}`}</span>{event.daysLeft !== null && event.daysLeft <= 3 && <Badge variant={event.daysLeft === 0 ? 'destructive' : 'secondary'} className="ml-auto text-xs">{event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}</Badge>}</div><div className="text-sm font-medium truncate mt-1">{event.title}</div></div>)}</div> : <div className="text-center py-4 text-gray-500 text-sm">Нет предстоящих событий</div>}</CardContent></Card>
        </div>

        {/* Main Calendar */}
        <div className="lg:col-span-3">
          {viewMode === 'month' && (
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-7 mb-2">{weekDays.map(day => <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="h-24" />;
                  const dateStr = date.toISOString().split('T')[0];
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const hasEvents = dayEvents.length > 0;
                  const hasUrgent = dayEvents.some(e => e.isUrgent);
                  return (
                    <div key={dateStr} onClick={() => handleDateClick(date)} className={`h-24 p-1 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${isToday(date) ? 'bg-blue-50 border-blue-300' : ''} ${hasUrgent ? 'border-red-300 bg-red-50' : ''}`}>
                      <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : ''}`}>{date.getDate()}</div>
                      {hasEvents && <div className="mt-1 space-y-0.5">{dayEvents.slice(0, 2).map(event => <div key={event.id} className="text-xs truncate px-1 py-0.5 rounded" style={{ backgroundColor: `${EVENT_COLORS[event.type]}20`, borderLeft: `2px solid ${EVENT_COLORS[event.type]}` }}>{EVENT_ICONS[event.type]} {event.title.substring(0, 10)}...</div>)}{dayEvents.length > 2 && <div className="text-xs text-gray-500 px-1">+{dayEvents.length - 2} ещё</div>}</div>}
                    </div>
                  );
                })}
              </div>
            </CardContent></Card>
          )}

          {viewMode === 'agenda' && (
            <Card><CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">Повестка дня</h2>
              {upcomingEvents.length > 0 ? <div className="space-y-3">{upcomingEvents.map(event => <div key={event.id} className={`flex gap-4 p-3 rounded-lg border ${event.isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <div className="text-center"><div className="text-2xl font-bold">{new Date(event.date).getDate()}</div><div className="text-xs text-gray-500">{monthNames[new Date(event.date).getMonth()].substring(0, 3)}</div></div>
                <div className="w-1 rounded-full" style={{ backgroundColor: EVENT_COLORS[event.type] }} />
                <div className="flex-1"><div className="flex items-center gap-2 text-sm text-gray-500"><span>{EVENT_ICONS[event.type]}</span><span>{EVENT_LABELS[event.type]}</span>{event.time && <span>• {event.time}</span>}</div><div className="font-medium mt-1">{event.title}</div>{event.description && <div className="text-sm text-gray-500 mt-1">{event.description}</div>}{event.nmck && <div className="text-sm mt-1">НМЦК: <strong>{formatCurrency(event.nmck)}</strong></div>}{event.tenderId && <Link href={`/tenders/${event.tenderId}`} className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Открыть тендер</Link>}</div>
                {event.daysLeft !== null && <Badge variant={event.daysLeft <= 1 ? 'destructive' : 'secondary'}>{event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}</Badge>}
              </div>)}</div> : <div className="text-center py-12 text-gray-500">📭 Нет предстоящих событий</div>}
            </CardContent></Card>
          )}

          {viewMode === 'week' && (
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-semibold">Неделя {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h2>
                <Button variant="ghost" size="icon" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((dayName, idx) => {
                  const d = new Date(currentDate);
                  const dayOfWeek = d.getDay();
                  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  d.setDate(d.getDate() - diff + idx);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  return (
                    <div key={idx} className={`border rounded-lg p-2 min-h-[200px] ${isToday(d) ? 'bg-blue-50 border-blue-300' : ''}`}>
                      <div className="text-center mb-2"><div className="text-xs text-gray-500">{dayName}</div><div className={`text-lg font-semibold ${isToday(d) ? 'text-blue-600' : ''}`}>{d.getDate()}</div></div>
                      <div className="space-y-1">{dayEvents.map(event => <div key={event.id} className="text-xs p-1 rounded cursor-pointer hover:opacity-80" style={{ backgroundColor: `${EVENT_COLORS[event.type]}20`, borderLeft: `2px solid ${EVENT_COLORS[event.type]}` }} onClick={() => { setSelectedDate(dateStr); setShowModal(true); }}>{EVENT_ICONS[event.type]} {event.title.substring(0, 12)}...</div>)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>События дня</DialogTitle>
            {selectedDate && <p className="text-sm text-gray-500">{formatDate(selectedDate)}</p>}
          </DialogHeader>
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-8"><span className="text-4xl">📅</span><h3 className="font-semibold mt-4">Нет событий</h3><p className="text-gray-500 text-sm">На этот день не запланировано никаких событий</p></div>
          ) : (
            <div className="space-y-3">{selectedDateEvents.map(event => (
              <div key={event.id} className={`p-3 rounded-lg border-l-4 ${event.isUrgent ? 'bg-red-50' : 'bg-gray-50'}`} style={{ borderLeftColor: EVENT_COLORS[event.type] }}>
                <div className="flex items-center gap-2 mb-2"><span className="text-xl">{EVENT_ICONS[event.type]}</span><div><div className="text-sm text-gray-500">{EVENT_LABELS[event.type]}</div>{event.time && <div className="text-xs text-gray-400">{event.time}</div>}</div>{event.daysLeft !== null && event.daysLeft <= 3 && <Badge className="ml-auto" variant={event.daysLeft === 0 ? 'destructive' : 'secondary'}>{event.daysLeft === 0 ? 'Сегодня' : `${event.daysLeft} дн.`}</Badge>}</div>
                <h4 className="font-medium">{event.title}</h4>
                {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
                {(event.nmck || event.tenderNumber) && <div className="flex items-center justify-between mt-2 pt-2 border-t text-sm">{event.nmck && <span>НМЦК: <strong>{formatCurrency(event.nmck)}</strong></span>}{event.tenderNumber && <span>№ {event.tenderNumber}</span>}{event.tenderId && <Link href={`/tenders/${event.tenderId}`} className="text-blue-600 hover:underline" onClick={() => setShowModal(false)}>Открыть →</Link>}</div>}
              </div>
            ))}</div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Закрыть</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
