'use client';

import { useState } from 'react';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import { formatCurrency, daysUntilDeadline } from '@/lib/tenders/types';
import { TenderViewModal } from './TenderViewModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, User, Clock, FileText } from 'lucide-react';

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

  const getStatusBadgeClass = (status: Tender['status']) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800 border-green-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      case 'archived': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (tenders.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Нет тендеров</h3>
        <p className="text-gray-500">Добавьте первый тендер для начала работы</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenders.map((tender) => {
        const daysLeft = tender.submission_deadline ? daysUntilDeadline(tender.submission_deadline) : null;
        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
        const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

        return (
          <Card key={tender.id} className={`hover:shadow-md transition-shadow ${tender.status === 'won' ? 'border-green-200 bg-green-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">№ {tender.purchase_number || 'Без номера'}</span>
                <Badge variant="outline" className={getStatusBadgeClass(tender.status)}>
                  {getStatusLabel(tender.status)}
                </Badge>
              </div>

              <h3 
                className="font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600"
                onClick={() => setViewTenderId(tender.id)}
              >
                {tender.subject}
              </h3>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <User className="h-4 w-4" />
                <span className="truncate">{tender.customer}</span>
              </div>

              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">НМЦК:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(tender.nmck / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Тип:</span>
                  <span>{getTypeName(tender)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Этап:</span>
                  <span>{getStageName(tender)}</span>
                </div>
              </div>

              {tender.submission_deadline && (
                <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-gray-50 rounded">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Дедлайн: {formatDate(tender.submission_deadline)}</span>
                  {daysLeft !== null && daysLeft >= 0 && (
                    <Badge variant="outline" className={isUrgent ? 'bg-red-100 text-red-800' : isWarning ? 'bg-yellow-100 text-yellow-800' : ''}>
                      {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setViewTenderId(tender.id)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Просмотр
                </Button>
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(tender.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {viewTenderId && (
        <TenderViewModal tenderId={viewTenderId} onClose={() => setViewTenderId(null)} />
      )}
    </div>
  );
}
