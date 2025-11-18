'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tender } from '@/lib/tenders/types';
import {
  formatCurrency,
  daysUntilDeadline,
  getDeadlineUrgency,
} from '@/lib/tenders/types';

interface TendersTableProps {
  tenders: Tender[];
  onDelete?: (id: string) => void;
}

export function TendersTable({ tenders, onDelete }: TendersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tenders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenders.map((t) => t.id)));
    }
  };

  const getStatusBadge = (status: Tender['status']) => {
    const styles = {
      active: 'bg-blue-100 text-blue-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      active: 'Активный',
      won: 'Выигран',
      lost: 'Проигран',
      archived: 'Архив',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const getDeadlineBadge = (deadline: string) => {
    const urgency = getDeadlineUrgency(deadline);
    const days = daysUntilDeadline(deadline);

    const styles = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-gray-100 text-gray-800 border-gray-200',
      passed: 'bg-gray-100 text-gray-500 border-gray-200',
    };

    const labels = {
      urgent: `⚠️ ${days}д`,
      warning: `⏰ ${days}д`,
      normal: `📅 ${days}д`,
      passed: '✓ Истек',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${styles[urgency]}`}
      >
        {labels[urgency]}
      </span>
    );
  };

  if (tenders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Нет тендеров
        </h3>
        <p className="text-sm text-gray-500">
          Добавьте первый тендер, чтобы начать работу
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-12 px-6 py-3">
              <input
                type="checkbox"
                checked={selectedIds.size === tenders.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Номер закупки
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Предмет
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Заказчик
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              НМЦК
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Дедлайн
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Этап
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Статус
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Ответственные
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tenders.map((tender) => (
            <tr
              key={tender.id}
              className={`hover:bg-gray-50 ${
                selectedIds.has(tender.id) ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedIds.has(tender.id)}
                  onChange={() => toggleSelect(tender.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  href={`/tenders/${tender.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  {tender.purchase_number}
                </Link>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {tender.subject}
                </div>
                {tender.project_name && (
                  <div className="text-xs text-gray-500 truncate">
                    {tender.project_name}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {tender.customer}
                </div>
                {tender.city && (
                  <div className="text-xs text-gray-500">{tender.city}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(tender.nmck)}
                </div>
                {tender.our_price && (
                  <div className="text-xs text-gray-500">
                    Наша: {formatCurrency(tender.our_price)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {new Date(tender.submission_deadline).toLocaleDateString(
                    'ru-RU'
                  )}
                </div>
                {getDeadlineBadge(tender.submission_deadline)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {tender.stage?.name || '—'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(tender.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tender.responsible && tender.responsible.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {tender.responsible.slice(0, 2).map((resp, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6">
                          {resp.employee.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="h-6 w-6 rounded-full"
                              src={resp.employee.avatar_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {resp.employee.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-2">
                          <div className="text-xs font-medium text-gray-900">
                            {resp.employee.full_name}
                          </div>
                        </div>
                      </div>
                    ))}
                    {tender.responsible.length > 2 && (
                      <div className="text-xs text-gray-500 ml-8">
                        +{tender.responsible.length - 2} ещё
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Не назначены</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/tenders/${tender.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Открыть
                  </Link>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(tender.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="text-sm font-medium">
            Выбрано: {selectedIds.size}
          </span>
          <button className="text-sm hover:underline">Изменить этап</button>
          <button className="text-sm hover:underline">Назначить</button>
          <button className="text-sm text-red-400 hover:underline">
            Удалить
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm hover:underline"
          >
            Отменить
          </button>
        </div>
      )}
    </div>
  );
}
