'use client';

import Link from 'next/link';
import type { Tender } from '@/lib/tenders/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Send, Trophy, Clock, CheckSquare, ChevronRight } from 'lucide-react';

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
  if (!date) return null;

  const formatDate = (d: Date) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(d);
  const formatTime = (d: Date) => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d);

  const getEventIcon = (type: CalendarEvent['type']) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case 'submission': return <Send className={iconClass} />;
      case 'results': return <Trophy className={iconClass} />;
      case 'deadline': return <Clock className={iconClass} />;
      case 'task': return <CheckSquare className={iconClass} />;
      default: return <Calendar className={iconClass} />;
    }
  };

  const getEventTypeName = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission': return 'Подача заявки';
      case 'results': return 'Результаты торгов';
      case 'deadline': return 'Дедлайн';
      case 'task': return 'Задача';
      default: return 'Событие';
    }
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'submission': return 'border-l-blue-500 bg-blue-50';
      case 'results': return 'border-l-green-500 bg-green-50';
      case 'deadline': return 'border-l-red-500 bg-red-50';
      case 'task': return 'border-l-purple-500 bg-purple-50';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>События дня</DialogTitle>
          <p className="text-sm text-gray-500">{formatDate(date)}</p>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">Нет событий</h3>
              <p className="text-sm text-gray-500">На этот день не запланировано никаких событий</p>
            </div>
          ) : (
            events.map(event => (
              <Card key={event.id} className={`border-l-4 ${getEventTypeColor(event.type)}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-gray-600">{getEventIcon(event.type)}</div>
                    <Badge variant="outline">{getEventTypeName(event.type)}</Badge>
                    <span className="text-sm text-gray-500 ml-auto">{formatTime(event.date)}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                  {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                  {event.tender && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm space-x-4">
                        <span><span className="text-gray-500">НМЦК:</span> <span className="font-medium">{(event.tender.nmck / 100).toLocaleString('ru-RU')} ₽</span></span>
                        {event.tender.purchase_number && <span><span className="text-gray-500">№ ЕИС:</span> {event.tender.purchase_number}</span>}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tenders/${event.tender.id}`} onClick={onClose}>Открыть <ChevronRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
