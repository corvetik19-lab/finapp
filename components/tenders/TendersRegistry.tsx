'use client';

import { useState, useRef } from 'react';
import type { Tender, TenderStage, TenderType } from '@/lib/tenders/types';
import { formatCurrency, daysUntilDeadline } from '@/lib/tenders/types';
import { TenderViewModal } from './TenderViewModal';
import styles from './TendersRegistry.module.css';

interface TendersRegistryProps {
  tenders: Tender[];
  stages: TenderStage[];
  types?: TenderType[];
  onDelete?: (id: string) => void;
}

export function TendersRegistry({ tenders, stages, types = [], onDelete }: TendersRegistryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'nmck' | 'deadline'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewTenderId, setViewTenderId] = useState<string | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging only if clicked on header
    if (!(e.target as HTMLElement).closest('thead')) return;
    
    isDragging.current = true;
    if (tableWrapperRef.current) {
        startX.current = e.pageX - tableWrapperRef.current.offsetLeft;
        scrollLeft.current = tableWrapperRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    if (tableWrapperRef.current) {
        const x = e.pageX - tableWrapperRef.current.offsetLeft;
        const walk = (x - startX.current) * 1; // scroll-fast
        tableWrapperRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

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

  const handleSort = (column: 'date' | 'nmck' | 'deadline') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

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

  // Разделяем тендеры на три группы: просроченные, выигранные и активные
  const overdueTenders: Tender[] = [];
  const wonTenders: Tender[] = [];
  const activeTenders: Tender[] = [];

  tenders.forEach(tender => {
    if (tender.status === 'won') {
      wonTenders.push(tender);
    } else {
      const daysLeft = tender.submission_deadline ? daysUntilDeadline(tender.submission_deadline) : null;
      const isOverdue = daysLeft !== null && daysLeft < 0;
      
      if (isOverdue) {
        overdueTenders.push(tender);
      } else {
        activeTenders.push(tender);
      }
    }
  });

  // Сортируем каждую группу
  const sortTenders = (tendersToSort: Tender[]) => {
    return [...tendersToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'nmck':
          comparison = a.nmck - b.nmck;
          break;
        case 'deadline':
          if (!a.submission_deadline && !b.submission_deadline) return 0;
          if (!a.submission_deadline) return 1;
          if (!b.submission_deadline) return -1;
          comparison = new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedOverdueTenders = sortTenders(overdueTenders);
  const sortedWonTenders = sortTenders(wonTenders);
  const sortedActiveTenders = sortTenders(activeTenders);

  if (tenders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <h3>Нет тендеров</h3>
        <p>Добавьте первый тендер для начала работы</p>
      </div>
    );
  }

  return (
    <div className={styles.registry}>
      {/* Toolbar */}
      {selectedIds.size > 0 && (
        <div className={styles.toolbar}>
          <span className={styles.toolbarText}>
            Выбрано: {selectedIds.size} из {tenders.length}
          </span>
          <button
            className={styles.toolbarButton}
            onClick={() => setSelectedIds(new Set())}
          >
            Отменить выбор
          </button>
        </div>
      )}

      {/* Table */}
      <div 
        className={styles.tableWrapper}
        ref={tableWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.thCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === tenders.length && tenders.length > 0}
                  onChange={toggleSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.th} style={{ width: '40px' }}></th>
              <th className={styles.th}>№</th>
              <th className={styles.th}>Заказчик</th>
              <th className={styles.th}>Предмет</th>
              <th 
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('nmck')}
              >
                <div className={styles.thContent}>
                  НМЦК
                  {sortBy === 'nmck' && (
                    <span className={styles.sortIcon}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('deadline')}
              >
                <div className={styles.thContent}>
                  Дедлайн
                  {sortBy === 'deadline' && (
                    <span className={styles.sortIcon}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className={styles.th}>Тип закупки</th>
              <th className={styles.th}>Этап</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {/* Просроченные тендеры */}
            {sortedOverdueTenders.length > 0 && (
              <>
                <tr className={styles.groupHeader}>
                  <td colSpan={11} className={styles.groupHeaderCell}>
                    <div className={styles.groupHeaderContent}>
                      <span className={styles.groupHeaderIcon}>⚠️</span>
                      <span className={styles.groupHeaderTitle}>Просроченные</span>
                      <span className={styles.groupHeaderCount}>({sortedOverdueTenders.length})</span>
                    </div>
                  </td>
                </tr>
                {sortedOverdueTenders.map((tender, index) => {
              const daysLeft = tender.submission_deadline 
                ? daysUntilDeadline(tender.submission_deadline)
                : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
              const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

              return (
                <tr
                  key={tender.id}
                  className={`${styles.tr} ${selectedIds.has(tender.id) ? styles.trSelected : ''}`}
                >
                  <td className={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tender.id)}
                      onChange={() => toggleSelect(tender.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.td}>
                    <button
                      onClick={() => setViewTenderId(tender.id)}
                      className={styles.actionButton}
                      title="Просмотр"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.index}>{index + 1}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.customer}>{tender.customer}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.subject}>{tender.subject}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.amount}>{formatCurrency(tender.nmck / 100)}</div>
                  </td>
                  <td className={styles.td}>
                    {tender.submission_deadline && tender.status !== 'won' ? (
                      <div className={styles.deadline}>
                        <div className={styles.deadlineDate}>
                          {formatDate(tender.submission_deadline)}
                        </div>
                        {isOverdue ? (
                          <div className={`${styles.deadlineDays} ${styles.overdue}`}>
                            Срок прошел
                          </div>
                        ) : daysLeft !== null && daysLeft >= 0 && (
                          <div className={`${styles.deadlineDays} ${isUrgent ? styles.urgent : isWarning ? styles.warning : ''}`}>
                            {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={styles.empty}>-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.type}>{getTypeName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.stage}>{getStageName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.status}>
                      {isOverdue ? 'Просрочен' : getStatusLabel(tender.status)}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(tender.id)}
                          className={styles.actionButton}
                          title="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
              </>
            )}

            {/* Выигранные тендеры */}
            {sortedWonTenders.length > 0 && (
              <>
                <tr className={styles.groupHeader}>
                  <td colSpan={11} className={styles.groupHeaderCell}>
                    <div className={styles.groupHeaderContent}>
                      <span className={styles.groupHeaderIcon}>🏆</span>
                      <span className={styles.groupHeaderTitle}>Выигранные</span>
                      <span className={styles.groupHeaderCount}>({sortedWonTenders.length})</span>
                    </div>
                  </td>
                </tr>
                {sortedWonTenders.map((tender, index) => {
              const daysLeft = tender.submission_deadline 
                ? daysUntilDeadline(tender.submission_deadline)
                : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
              const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

              return (
                <tr
                  key={tender.id}
                  className={`${styles.tr} ${selectedIds.has(tender.id) ? styles.trSelected : ''}`}
                >
                  <td className={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tender.id)}
                      onChange={() => toggleSelect(tender.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.td}>
                    <button
                      onClick={() => setViewTenderId(tender.id)}
                      className={styles.actionButton}
                      title="Просмотр"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.index}>{index + 1}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.customer}>{tender.customer}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.subject}>{tender.subject}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.amount}>{formatCurrency(tender.nmck / 100)}</div>
                  </td>
                  <td className={styles.td}>
                    {tender.submission_deadline && tender.status !== 'won' ? (
                      <div className={styles.deadline}>
                        <div className={styles.deadlineDate}>
                          {formatDate(tender.submission_deadline)}
                        </div>
                        {isOverdue ? (
                          <div className={`${styles.deadlineDays} ${styles.overdue}`}>
                            Срок прошел
                          </div>
                        ) : daysLeft !== null && daysLeft >= 0 && (
                          <div className={`${styles.deadlineDays} ${isUrgent ? styles.urgent : isWarning ? styles.warning : ''}`}>
                            {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={styles.empty}>-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.type}>{getTypeName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.stage}>{getStageName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.status}>
                      {isOverdue ? 'Просрочен' : getStatusLabel(tender.status)}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(tender.id)}
                          className={styles.actionButton}
                          title="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
              </>
            )}

            {/* Активные тендеры */}
            {sortedActiveTenders.length > 0 && (
              <>
                {(sortedOverdueTenders.length > 0 || sortedWonTenders.length > 0) && (
                  <tr className={styles.groupHeader}>
                    <td colSpan={11} className={styles.groupHeaderCell}>
                      <div className={styles.groupHeaderContent}>
                        <span className={styles.groupHeaderIcon}>📋</span>
                        <span className={styles.groupHeaderTitle}>Активные</span>
                        <span className={styles.groupHeaderCount}>({sortedActiveTenders.length})</span>
                      </div>
                    </td>
                  </tr>
                )}
                {sortedActiveTenders.map((tender, index) => {
              const daysLeft = tender.submission_deadline 
                ? daysUntilDeadline(tender.submission_deadline)
                : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
              const isWarning = daysLeft !== null && daysLeft > 3 && daysLeft <= 7;

              return (
                <tr
                  key={tender.id}
                  className={`${styles.tr} ${selectedIds.has(tender.id) ? styles.trSelected : ''}`}
                >
                  <td className={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tender.id)}
                      onChange={() => toggleSelect(tender.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.td}>
                    <button
                      onClick={() => setViewTenderId(tender.id)}
                      className={styles.actionButton}
                      title="Просмотр"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.index}>{index + 1}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.customer}>{tender.customer}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.subject}>{tender.subject}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.amount}>{formatCurrency(tender.nmck / 100)}</div>
                  </td>
                  <td className={styles.td}>
                    {tender.submission_deadline && tender.status !== 'won' ? (
                      <div className={styles.deadline}>
                        <div className={styles.deadlineDate}>
                          {formatDate(tender.submission_deadline)}
                        </div>
                        {isOverdue ? (
                          <div className={`${styles.deadlineDays} ${styles.overdue}`}>
                            Срок прошел
                          </div>
                        ) : daysLeft !== null && daysLeft >= 0 && (
                          <div className={`${styles.deadlineDays} ${isUrgent ? styles.urgent : isWarning ? styles.warning : ''}`}>
                            {daysLeft === 0 ? 'Сегодня' : `${daysLeft}д`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={styles.empty}>-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.type}>{getTypeName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.stage}>{getStageName(tender)}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.status}>
                      {isOverdue ? 'Просрочен' : getStatusLabel(tender.status)}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(tender.id)}
                          className={styles.actionButton}
                          title="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка просмотра тендера */}
      {viewTenderId && (
        <TenderViewModal
          tenderId={viewTenderId}
          onClose={() => setViewTenderId(null)}
        />
      )}
    </div>
  );
}
