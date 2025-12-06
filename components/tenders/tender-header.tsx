'use client';

import { Tender } from '@/lib/tenders/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, ExternalLink, MapPin, Building2, Users } from 'lucide-react';

interface TenderHeaderProps {
  tender: Tender;
}

export function TenderHeader({ tender }: TenderHeaderProps) {
  const formatCurrency = (amount: number | null, currency: string = 'RUB') => {
    if (amount === null || amount === undefined) return '—';
    const value = amount / 100;
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
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900 flex-1">{tender.subject}</h1>
          {tender.stage && (
            <Badge style={{ backgroundColor: tender.stage.color || '#6b7280' }} className="text-white">
              {tender.stage.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          {tender.type?.name && <Badge variant="outline">{tender.type.name}</Badge>}
          <span>{tender.customer}</span>
        </div>
      </div>

      {/* Ключевая информация */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                Срок подачи заявок
              </div>
              <div className="font-semibold">{formatDate(tender.submission_deadline)}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <DollarSign className="h-4 w-4" />
                НМЦК
              </div>
              <div className="font-semibold text-blue-600">{formatCurrency(tender.nmck, tender.currency)}</div>
            </div>

            {tender.bid_price && tender.bid_price > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  Цена для торгов
                </div>
                <div className="font-semibold text-green-600">{formatCurrency(tender.bid_price, tender.currency)}</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ExternalLink className="h-4 w-4" />
                № ЕИС
              </div>
              <div className="font-semibold">
                {tender.eis_url ? (
                  <a href={tender.eis_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {tender.purchase_number}
                  </a>
                ) : (
                  tender.purchase_number
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Информация о победителе */}
      {tender.stage?.name === 'Проиграли' && (tender.winner_inn || tender.winner_name || tender.winner_price) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-800 mb-3">Информация о победителе</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {tender.winner_inn && (
                <div className="space-y-1">
                  <div className="text-sm text-red-600">ИНН победителя</div>
                  <div className="font-medium">{tender.winner_inn}</div>
                </div>
              )}
              {tender.winner_name && (
                <div className="space-y-1">
                  <div className="text-sm text-red-600">Название победителя</div>
                  <div className="font-medium">{tender.winner_name}</div>
                </div>
              )}
              {tender.winner_price && (
                <div className="space-y-1">
                  <div className="text-sm text-red-600">Цена победы</div>
                  <div className="font-medium">{formatCurrency(tender.winner_price, tender.currency)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Дополнительная информация */}
      {(tender.platform || tender.city || (tender.responsible && tender.responsible.length > 0)) && (
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
          {tender.platform && (
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{tender.platform}</span>
            </div>
          )}
          {tender.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{tender.city}</span>
            </div>
          )}
          {tender.responsible && tender.responsible.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{tender.responsible.map(r => r.employee.full_name).join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
