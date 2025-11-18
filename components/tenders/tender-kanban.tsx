'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Tender, TenderStage, TenderStageTemplate } from '@/lib/tenders/types';
import { formatCurrency, getDeadlineUrgency } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import { LossReasonModal } from './LossReasonModal';
import { TenderCommentsSidebar } from './TenderCommentsSidebar';
import styles from './tender-kanban.module.css';

export interface TenderKanbanProps {
  tendersByStage: Record<string, Tender[]>;
  stages: TenderStage[];
  templates?: TenderStageTemplate[];
  onStageChange?: (tenderId: string, newStageId: string) => void;
  allowBackwardMovement?: boolean;
  archivedStageNames?: string[];
  hideControls?: boolean; // Скрыть переключатели и сворачивание
}

const normalizeStageName = (name?: string | null) => (name || '').trim().toLowerCase();

export function TenderKanban({ tendersByStage, stages, templates = [], onStageChange, allowBackwardMovement = false, hideControls = false }: TenderKanbanProps) {
  const toast = useToast();
  const [draggedTender, setDraggedTender] = useState<Tender | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [optimisticTenders, setOptimisticTenders] = useState<Record<string, Tender[]>>(tendersByStage);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hideEmptyStages, setHideEmptyStages] = useState(false);
  const [openMenuTenderId, setOpenMenuTenderId] = useState<string | null>(null);
  const [isScrollDragging, setIsScrollDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const archivedScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const templateScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0, container: null as HTMLDivElement | null });
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ tender: Tender; targetStageId: string } | null>(null);
  const [commentsSidebarTenderId, setCommentsSidebarTenderId] = useState<string | null>(null);
  const [moveMenuTenderId, setMoveMenuTenderId] = useState<string | null>(null);
  const [allowFreeMovement, setAllowFreeMovement] = useState(false);
  const [showArchivedStages, setShowArchivedStages] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showSystemStages, setShowSystemStages] = useState(true);
  const [showTemplateStages, setShowTemplateStages] = useState(true);
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});

  // Инициализация счетчиков
  useEffect(() => {
    const counts: Record<string, number> = {};
    Object.values(tendersByStage).flat().forEach(t => {
      if (t.comments_count !== undefined) {
        counts[t.id] = t.comments_count;
      }
    });
    setCommentsCounts(prev => ({ ...prev, ...counts }));
  }, [tendersByStage]);

  // Realtime подписка на комментарии
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase.channel('kanban_global_comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tender_comments' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setCommentsCounts(prev => ({
              ...prev,
              [payload.new.tender_id]: (prev[payload.new.tender_id] || 0) + 1
            }));
          } else if (payload.eventType === 'DELETE') {
            setCommentsCounts(prev => ({
              ...prev,
              [payload.old.tender_id]: Math.max(0, (prev[payload.old.tender_id] || 0) - 1)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCommentsUpdate = useCallback(async () => {
    if (!commentsSidebarTenderId) return;
    
    try {
      const response = await fetch(`/api/tenders/${commentsSidebarTenderId}/comments`, { cache: 'no-store' });
      if (response.ok) {
        const { data } = await response.json();
        setCommentsCounts(prev => ({
          ...prev,
          [commentsSidebarTenderId]: (data || []).length
        }));
      }
    } catch (error) {
      console.error('Error updating comments count:', error);
    }
  }, [commentsSidebarTenderId]);

  // Загружаем настройку свободного перемещения
  useEffect(() => {
    const setting = localStorage.getItem('allowFreeMovement');
    setAllowFreeMovement(setting === 'true');
    
    const showArchived = localStorage.getItem('showArchivedStages');
    setShowArchivedStages(showArchived === 'true');
    
    const collapsed = localStorage.getItem('collapsedStageGroups');
    if (collapsed) {
      setCollapsedGroups(new Set(JSON.parse(collapsed)));
    }
    
    const showSystem = localStorage.getItem('showSystemStages');
    if (showSystem !== null) {
      setShowSystemStages(showSystem === 'true');
    }
    
    const showTemplate = localStorage.getItem('showTemplateStages');
    if (showTemplate !== null) {
      setShowTemplateStages(showTemplate === 'true');
    }
  }, []);

  // Функция для переключения сворачивания группы
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      localStorage.setItem('collapsedStageGroups', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handleScrollMove = useCallback((event: MouseEvent) => {
    if (!dragStateRef.current.isDragging || !dragStateRef.current.container) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    dragStateRef.current.container.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.container = null;
    setIsScrollDragging(false);
    document.removeEventListener('mousemove', handleScrollMove);
    document.removeEventListener('mouseup', handleScrollEnd);
  }, [handleScrollMove]);

  const handleScrollDragStart = useCallback((event: React.MouseEvent, container: React.RefObject<HTMLDivElement | null>) => {
    // Не начинаем прокрутку если кликнули на карточку тендера
    const target = event.target as HTMLElement;
    if (target.closest(`.${styles.tenderCard}`)) {
      return;
    }
    
    if (!container.current) return;
    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      scrollLeft: container.current.scrollLeft,
      container: container.current
    };
    setIsScrollDragging(true);
    document.addEventListener('mousemove', handleScrollMove);
    document.addEventListener('mouseup', handleScrollEnd);
  }, [handleScrollMove, handleScrollEnd]);

  // Загружаем состояние сворачивания из localStorage
  useEffect(() => {
    const hideEmpty = localStorage.getItem('hideEmptyStages');
    if (hideEmpty) {
      setHideEmptyStages(hideEmpty === 'true');
    }
  }, []);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [handleScrollEnd, handleScrollMove]);

  // Сохраняем настройку скрытия пустых этапов
  const toggleHideEmptyStages = () => {
    const newValue = !hideEmptyStages;
    setHideEmptyStages(newValue);
    localStorage.setItem('hideEmptyStages', String(newValue));
  };

  // Сохраняем настройку показа архивных этапов
  const toggleShowArchivedStages = () => {
    const newValue = !showArchivedStages;
    setShowArchivedStages(newValue);
    localStorage.setItem('showArchivedStages', String(newValue));
  };

  // Обработка сохранения причины проигрыша
  const handleLossReasonSubmit = async (
    reason: string,
    file: File | null,
    winnerInfo?: {
      winner_inn?: string;
      winner_name?: string;
      winner_price?: number;
    }
  ) => {
    if (!pendingMove || !onStageChange) return;

    try {
      // Перемещаем тендер и сохраняем информацию о победителе
      const oldStageId = pendingMove.tender.stage_id;
      const updatedTender = { ...pendingMove.tender, stage_id: pendingMove.targetStageId };
      const newOptimisticTenders = { ...optimisticTenders };

      newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(
        t => t.id !== pendingMove.tender.id
      );
      newOptimisticTenders[pendingMove.targetStageId] = [
        ...(newOptimisticTenders[pendingMove.targetStageId] || []),
        updatedTender
      ];

      setOptimisticTenders(newOptimisticTenders);
      setIsUpdating(true);

      // Обновляем тендер с информацией о победителе
      const response = await fetch(`/api/tenders/${pendingMove.tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_id: pendingMove.targetStageId,
          ...winnerInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tender');
      }

      // Создаём комментарий с причиной проигрыша
      const commentResponse = await fetch(`/api/tenders/${pendingMove.tender.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Причина проигрыша: ${reason}`,
          comment_type: 'loss_reason',
          stage_id: pendingMove.targetStageId,
          stage_name: 'Проиграли',
        }),
      });

      if (!commentResponse.ok) {
        console.error('Failed to save comment');
      }

      // TODO: Загрузка файла если есть
      if (file) {
        console.log('File upload not implemented yet:', file.name);
      }
      
      toast.show('Причина проигрыша сохранена', { type: 'success' });
    } catch (error) {
      console.error('Error saving loss reason:', error);
      setOptimisticTenders(tendersByStage);
      toast.show('Ошибка при сохранении', { type: 'error' });
      throw error;
    } finally {
      setIsUpdating(false);
      setShowLossReasonModal(false);
      setPendingMove(null);
    }
  };

  const handleLossReasonCancel = () => {
    setShowLossReasonModal(false);
    setPendingMove(null);
  };

  const handleDragStart = (tender: Tender) => {
    setDraggedTender(tender);
  };

  const handleDragEnd = () => {
    setDraggedTender(null);
    setDragOverStage(null);
  };

  // Проверка возможности перемещения на этап
  const canMoveToStage = (fromStageId: string, toStageId: string): boolean => {
    if (fromStageId === toStageId) return false;

    const fromStage = stages.find(s => s.id === fromStageId);
    const toStage = stages.find(s => s.id === toStageId);
    
    if (!fromStage || !toStage) return false;

    // Если включено свободное перемещение - разрешаем любые переходы
    if (allowFreeMovement) {
      return true;
    }

    // Для этапов реализации - разрешаем свободное перемещение между любыми этапами реализации
    if (fromStage.category === 'realization' && toStage.category === 'realization') {
      return true;
    }

    // Проверяем, является ли этап архивным
    const isFromArchived = fromStage.category === 'archive';
    const isToArchived = toStage.category === 'archive';

    // Если перемещение из архивного этапа и включено allowBackwardMovement - разрешаем на любой этап
    if (isFromArchived && allowBackwardMovement) {
      return true;
    }

    // Если перемещение в архивный этап - всегда разрешаем
    if (isToArchived) {
      return true;
    }

    // Для остальных этапов - проверяем только если оба этапа активные (tender_dept)
    if (fromStage.category === 'tender_dept' && toStage.category === 'tender_dept') {
      const fromIndex = fromStage.order_index;
      const toIndex = toStage.order_index;

      // Проверяем направление перемещения
      const isMovingBackward = toIndex < fromIndex;
      
      // Если перемещение назад
      if (isMovingBackward) {
        // Если разрешено перемещение назад - разрешаем на ЛЮБОЙ этап назад
        if (allowBackwardMovement) {
          return true;
        }
        
        // Специальные правила для этапа "Проверка" (только если allowBackwardMovement выключен)
        if (fromStage.name === 'Проверка') {
          const allowedFromCheck = ['Не участвуем', 'Не прошло проверку', 'Не подано', 'Подача'];
          return allowedFromCheck.includes(toStage.name);
        }
        
        // Иначе блокируем
        return false;
      }

      // Перемещение вперёд - можно только на следующий этап
      return toIndex === fromIndex + 1;
    }

    // Если категории разные - запрещаем (кроме уже обработанных случаев выше)
    return false;
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    
    // Проверяем возможность перемещения
    if (draggedTender && canMoveToStage(draggedTender.stage_id, stageId)) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    
    // Проверяем возможность перемещения
    if (draggedTender && !canMoveToStage(draggedTender.stage_id, stageId)) {
      const fromStage = stages.find(s => s.id === draggedTender.stage_id);
      const toStage = stages.find(s => s.id === stageId);
      
      if (fromStage && toStage) {
        const isMovingBackward = toStage.order_index < fromStage.order_index;
        
        if (isMovingBackward && !allowBackwardMovement) {
          toast.show('Перемещение назад запрещено. Включите "Разрешить перемещение назад" в настройках', { type: 'error', duration: 3000 });
        } else {
          toast.show('Нельзя перепрыгивать через этапы. Перемещайте последовательно', { type: 'error', duration: 3000 });
        }
      }
      
      setDraggedTender(null);
      setDragOverStage(null);
      return;
    }
    
    if (draggedTender && draggedTender.stage_id !== stageId && onStageChange) {
      const targetStage = stages.find(s => s.id === stageId);
      
      // Если это этап "Проиграли" - показываем модалку
      if (targetStage && normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
        setPendingMove({ tender: draggedTender, targetStageId: stageId });
        setShowLossReasonModal(true);
        setDraggedTender(null);
        setDragOverStage(null);
        return;
      }
      
      const oldStageId = draggedTender.stage_id;
      
      // Оптимистичное обновление UI
      const updatedTender = { ...draggedTender, stage_id: stageId };
      const newOptimisticTenders = { ...optimisticTenders };
      
      // Удаляем из старой колонки
      newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(
        t => t.id !== draggedTender.id
      );
      
      // Добавляем в новую колонку
      newOptimisticTenders[stageId] = [
        ...(newOptimisticTenders[stageId] || []),
        updatedTender
      ];
      
      setOptimisticTenders(newOptimisticTenders);
      setIsUpdating(true);
      
      // Вызываем обновление на сервере
      try {
        await onStageChange(draggedTender.id, stageId);
      } catch {
        // В случае ошибки возвращаем обратно
        setOptimisticTenders(tendersByStage);
      } finally {
        setIsUpdating(false);
      }
    }
    setDraggedTender(null);
    setDragOverStage(null);
  };

  const getStageStats = (stageId: string) => {
    const tenders = tendersByStage[stageId] || [];
    const count = tenders.length;
    const totalNmck = tenders.reduce((sum, t) => sum + t.nmck, 0);
    return { count, totalNmck };
  };

  const getDeadlineBadgeClass = (deadline: string) => {
    const urgency = getDeadlineUrgency(deadline);
    const classMap = {
      urgent: styles.deadlineUrgent,
      warning: styles.deadlineWarning,
      normal: styles.deadlineNormal,
      passed: styles.deadlinePassed,
    };
    return classMap[urgency];
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      // Можно добавить уведомление об успешном копировании
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Получение быстрых действий для этапа
  const getQuickActions = (stageName: string): Array<{label: string, targetStageName: string}> => {
    if (stageName === 'Анализ и просчёт') {
      return [{ label: 'Не участвуем', targetStageName: 'Не участвуем' }];
    }
    if (stageName === 'Проверка') {
      return [
        { label: 'Не участвуем', targetStageName: 'Не участвуем' },
        { label: 'Не прошло проверку', targetStageName: 'Не прошло проверку' },
        { label: 'Не подано', targetStageName: 'Не подано' },
      ];
    }
    if (stageName === 'Ждём итоги') {
      return [{ label: 'Проиграли', targetStageName: 'Проиграли' }];
    }
    return [];
  };

  // Перемещение на следующий этап
  const handleMoveToNextStage = async (tender: Tender, targetStageId: string) => {
    if (!onStageChange) return;
    
    // Проверяем возможность перемещения
    if (!canMoveToStage(tender.stage_id, targetStageId)) {
      const fromStage = stages.find(s => s.id === tender.stage_id);
      const toStage = stages.find(s => s.id === targetStageId);
      
      if (fromStage && toStage) {
        const isMovingBackward = toStage.order_index < fromStage.order_index;
        
        if (isMovingBackward && !allowBackwardMovement) {
          toast.show('Перемещение назад запрещено. Включите "Разрешить перемещение назад" в настройках', { type: 'error', duration: 3000 });
        } else {
          toast.show('Нельзя перепрыгивать через этапы. Перемещайте последовательно', { type: 'error', duration: 3000 });
        }
      }
      return;
    }
    
    const targetStage = stages.find(s => s.id === targetStageId);
    
    // Если это этап "Проиграли" - показываем модалку
    if (targetStage && normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
      setPendingMove({ tender, targetStageId });
      setShowLossReasonModal(true);
      return;
    }
    
    const oldStageId = tender.stage_id;
    
    // Оптимистичное обновление UI
    const updatedTender = { ...tender, stage_id: targetStageId };
    const newOptimisticTenders = { ...optimisticTenders };
    
    // Удаляем из старой колонки
    newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(
      t => t.id !== tender.id
    );
    
    // Добавляем в новую колонку
    newOptimisticTenders[targetStageId] = [
      ...(newOptimisticTenders[targetStageId] || []),
      updatedTender
    ];
    
    setOptimisticTenders(newOptimisticTenders);
    setIsUpdating(true);
    
    // Вызываем обновление на сервере
    try {
      await onStageChange(tender.id, targetStageId);
      toast.show(`Тендер перемещён на этап "${targetStage?.name}"`, { type: 'success', duration: 2000 });
    } catch {
      // В случае ошибки возвращаем обратно
      setOptimisticTenders(tendersByStage);
      toast.show('Ошибка при перемещении тендера', { type: 'error', duration: 3000 });
    } finally {
      setIsUpdating(false);
    }
  };

  // Быстрое перемещение на этап
  const handleQuickMove = async (tender: Tender, targetStageName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const targetStage = stages.find(s => s.name === targetStageName);
    if (!targetStage || !onStageChange) return;

    setOpenMenuTenderId(null);
    
    // Если это этап "Проиграли" - показываем модалку
    if (normalizeStageName(targetStageName) === normalizeStageName('Проиграли')) {
      setPendingMove({ tender, targetStageId: targetStage.id });
      setShowLossReasonModal(true);
      return;
    }
    
    // Оптимистичное обновление
    const oldStageId = tender.stage_id;
    const updatedTender = { ...tender, stage_id: targetStage.id };
    const newOptimisticTenders = { ...optimisticTenders };
    
    newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(
      t => t.id !== tender.id
    );
    newOptimisticTenders[targetStage.id] = [
      ...(newOptimisticTenders[targetStage.id] || []),
      updatedTender
    ];
    
    setOptimisticTenders(newOptimisticTenders);
    setIsUpdating(true);
    
    try {
      await onStageChange(tender.id, targetStage.id);
    } catch {
      setOptimisticTenders(tendersByStage);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleMenu = (tenderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuTenderId(openMenuTenderId === tenderId ? null : tenderId);
  };

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuTenderId(null);
    if (openMenuTenderId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuTenderId]);

  // Синхронизируем оптимистичное состояние с реальными данными
  useEffect(() => {
    if (!isUpdating) {
      setOptimisticTenders(tendersByStage);
    }
  }, [tendersByStage, isUpdating]);

  // Собираем ID этапов из используемых шаблонов
  const usedTemplateIds = new Set<string>();
  Object.values(optimisticTenders).flat().forEach(tender => {
    if (tender.template_id && tender.template_id !== 'system') {
      usedTemplateIds.add(tender.template_id);
    }
  });

  const templateStageIds = new Set<string>();
  templates.forEach(template => {
    if (usedTemplateIds.has(template.id) && template.items) {
      template.items.forEach(item => {
        templateStageIds.add(item.stage_id);
      });
    }
  });

  let visibleStages = stages;
  
  // Фильтруем скрытые этапы
  visibleStages = visibleStages.filter(stage => !stage.is_hidden);
  
  // Фильтруем архивные этапы если они скрыты
  if (!showArchivedStages) {
    visibleStages = visibleStages.filter(stage => stage.category !== 'archive');
  }
  
  // Показываем системные этапы и этапы из используемых шаблонов
  visibleStages = visibleStages.filter(stage => 
    stage.is_system || templateStageIds.has(stage.id)
  );
  
  // Фильтруем пустые этапы если включено скрытие
  if (hideEmptyStages) {
    visibleStages = visibleStages.filter(stage => (optimisticTenders[stage.id] || []).length > 0);
  }
  
  // Сортируем: системные этапы сверху, потом шаблонные по order_index
  visibleStages = visibleStages.sort((a, b) => {
    // Системные этапы всегда сверху
    if (a.is_system && !b.is_system) return -1;
    if (!a.is_system && b.is_system) return 1;
    // Внутри группы сортируем по order_index
    return (a.order_index || 0) - (b.order_index || 0);
  });

  const getBusinessTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    if (isNaN(end.getTime()) || end <= now) {
      return { days: 0, hours: 0 };
    }

    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };

    const cursor = new Date(now);
    let totalMs = 0;

    while (cursor < end) {
      if (isWeekend(cursor)) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }

      const dayEnd = new Date(cursor);
      dayEnd.setHours(24, 0, 0, 0);
      const intervalEnd = dayEnd < end ? dayEnd : end;
      totalMs += intervalEnd.getTime() - cursor.getTime();
      cursor.setTime(intervalEnd.getTime());
    }

    const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
    return {
      days: Math.floor(totalMinutes / (60 * 24)),
      hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    };
  };

  return (
    <div>
      {/* Панель управления */}
      {!hideControls && (
      <div className={styles.controlPanel}>
        <label className={styles.controlLabel}>
          <input
            type="checkbox"
            checked={hideEmptyStages}
            onChange={toggleHideEmptyStages}
            className={styles.controlCheckbox}
          />
          <span>Скрыть пустые этапы</span>
        </label>
        <label className={styles.controlLabel}>
          <input
            type="checkbox"
            checked={showArchivedStages}
            onChange={toggleShowArchivedStages}
            className={styles.controlCheckbox}
          />
          <span>Показать архивные этапы</span>
        </label>
        <label className={styles.controlLabel}>
          <input
            type="checkbox"
            checked={showSystemStages}
            onChange={(e) => {
              setShowSystemStages(e.target.checked);
              localStorage.setItem('showSystemStages', String(e.target.checked));
            }}
            className={styles.controlCheckbox}
          />
          <span>Показать предконтрактные этапы</span>
        </label>
        <label className={styles.controlLabel}>
          <input
            type="checkbox"
            checked={showTemplateStages}
            onChange={(e) => {
              setShowTemplateStages(e.target.checked);
              localStorage.setItem('showTemplateStages', String(e.target.checked));
            }}
            className={styles.controlCheckbox}
          />
          <span>Показать этапы ЗМО</span>
        </label>
      </div>
      )}

      {/* Разделяем этапы на архивные и активные */}
      {(() => {
        const archivedStages = visibleStages.filter(s => s.category === 'archive');
        const activeStages = visibleStages.filter(s => s.category !== 'archive');

        const renderStages = (stagesToRender: typeof visibleStages, isArchived: boolean, containerRef?: React.RefObject<HTMLDivElement | null>) => {
          // Разделяем этапы на системные и шаблонные (только для неархивных)
          const systemStages = isArchived ? [] : stagesToRender.filter(s => s.is_system && s.category !== 'archive');
          const templateStages = isArchived ? [] : stagesToRender.filter(s => !s.is_system && s.category !== 'archive');

          const renderStageColumn = (stage: typeof stagesToRender[0]) => {
        const isArchivedStage = stage.category === 'archive';
        const stats = getStageStats(stage.id);
        const tenders = optimisticTenders[stage.id] || [];
        const isDragOver = dragOverStage === stage.id;
        
        // Определяем следующий этап
        const nextStage = (() => {
          // Для этапов реализации - просто следующий по order_index (без привязки к шаблонам)
          if (stage.category === 'realization') {
            return stagesToRender
              .filter(s => s.category === 'realization')
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .find(s => (s.order_index || 0) > (stage.order_index || 0));
          }
          
          // Для остальных категорий - учитываем шаблоны
          if (stage.is_system) {
            // Для системных этапов - следующий системный этап
            return visibleStages
              .filter(s => s.is_system && s.category !== 'archive')
              .find(s => (s.order_index || 0) > (stage.order_index || 0));
          } else {
            // Для шаблонных этапов - следующий этап из того же шаблона
            // Получаем все этапы текущего шаблона
            const currentTemplate = templates.find(t => 
              t.items?.some(item => item.stage_id === stage.id)
            );
            
            if (currentTemplate && currentTemplate.items) {
              const templateStageIds = currentTemplate.items
                .sort((a, b) => a.order_index - b.order_index)
                .map(item => item.stage_id);
              
              const currentIndex = templateStageIds.indexOf(stage.id);
              if (currentIndex !== -1 && currentIndex < templateStageIds.length - 1) {
                const nextStageId = templateStageIds[currentIndex + 1];
                return stages.find(s => s.id === nextStageId && s.category !== 'archive');
              }
            }
          }
          return undefined;
        })();

        return (
          <React.Fragment key={stage.id}>
          <div
            className={`${styles.stageColumn} ${isArchivedStage ? styles.stageColumnArchived : ''}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Заголовок колонки */}
            <div
              className={`${styles.stageHeader} ${isScrollDragging ? styles.stageHeaderDragging : ''} ${isArchivedStage ? styles.stageHeaderArchived : ''}`}
              onMouseDown={(e) => containerRef && handleScrollDragStart(e, containerRef)}
            >
              <div className={styles.stageTitle}>
                <div>
                  <h3 className={styles.stageName}>{stage.name}</h3>
                  {!isArchivedStage && (
                    <div className={styles.stageStats}>
                      {formatCurrency(stats.totalNmck)} ({stats.count})
                    </div>
                  )}
                  {isArchivedStage && (
                    <div className={styles.stageStats}>
                      ({stats.count})
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Список тендеров */}
            <div
              className={`${styles.cardsContainer} ${isDragOver ? styles.cardsContainerDragOver : ''}`}
            >
              {tenders.length === 0 ? (
                <div className={styles.emptyState}>
                  Нет тендеров
                </div>
              ) : (
                <div className={styles.cardsList}>
                  {tenders.map((tender) => {
                      const quickActions = getQuickActions(stage.name);
                      const hasQuickActions = quickActions.length > 0;
                      const timeRemaining = getBusinessTimeRemaining(tender.submission_deadline);
                      
                      // Проверяем, нужно ли показывать таймер (только до этапа "Подача" включительно)
                      const normalizedStageName = normalizeStageName(stage.name);
                      const deadlineStages = new Set([
                        'анализ и просчёт',
                        'анализ и просчет',
                        'анализ просчет',
                        'анализ просчёт',
                        'проверка',
                        'не прошло проверку',
                        'не подано',
                        'подача',
                        // Этапы ЗМО
                        'змо: анализ и просчёт',
                        'змо: анализ и просчет',
                        'змо: проверка',
                        'змо: подача',
                        'змо: подан. рассмотрение заявки',
                        'змо: подан рассмотрение заявки',
                      ]);

                      const shouldShowTimer = !isArchivedStage && deadlineStages.has(normalizedStageName);
                      
                      return (
                      <div
                        key={tender.id}
                        draggable
                        onDragStart={() => handleDragStart(tender)}
                        onDragEnd={handleDragEnd}
                        className={`${styles.tenderCard} ${draggedTender?.id === tender.id ? styles.tenderCardDragging : ''}`}
                      >
                        {/* Меню быстрых действий */}
                        {hasQuickActions && (
                          <div className={styles.quickActionsContainer}>
                            <button
                              onClick={(e) => toggleMenu(tender.id, e)}
                              className={styles.quickActionsButton}
                              title="Быстрые действия"
                            >
                              ⋮
                            </button>
                            {openMenuTenderId === tender.id && (
                              <div className={styles.quickActionsMenu}>
                                {quickActions.map((action) => (
                                  <button
                                    key={action.targetStageName}
                                    onClick={(e) => handleQuickMove(tender, action.targetStageName, e)}
                                    className={styles.quickActionItem}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <Link
                          href={`/tenders/${tender.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isArchivedStage ? (
                            // Минимальная информация для архивных этапов
                            <>
                              <div className={styles.customer}>
                                {tender.customer}
                              </div>
                              <div className={styles.subject}>
                                {tender.subject}
                              </div>
                              <div className={styles.financeRow}>
                                <span className={styles.financeLabel}>НМЦК:</span>
                                <span className={styles.financeValue}>{formatCurrency(tender.nmck)}</span>
                              </div>
                            </>
                          ) : (
                            // Полная информация для активных этапов
                            <>
                              {/* Дедлайн метка - показываем только до этапа "Подача" включительно */}
                              {shouldShowTimer && (
                                <>
                                  <div className={`${styles.deadlineBadge} ${getDeadlineBadgeClass(tender.submission_deadline)}`}>
                                    {formatDeadline(tender.submission_deadline)}
                                  </div>

                                  {timeRemaining && (
                                    <div className={styles.deadlineTimer}>
                                      Осталось: {timeRemaining.days} д {timeRemaining.hours} ч
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Заказчик */}
                              <div className={styles.customer}>
                                {tender.customer}
                              </div>

                              {/* Тип закупки */}
                              {tender.type?.name && (
                                <div className={styles.procurementType}>
                                  {tender.type.name}
                                </div>
                              )}

                              {/* Предмет */}
                              <div className={styles.subject}>
                                {tender.subject}
                              </div>

                              {/* Финансы */}
                              <div className={styles.finances}>
                                <div className={styles.financeRow}>
                                  <span className={styles.financeLabel}>НМЦК:</span>
                                  <span className={styles.financeValue}>{formatCurrency(tender.nmck)}</span>
                                </div>
                                <div className={styles.financeRow}>
                                  <span className={styles.financeLabel}>Цена для торгов:</span>
                                  <span className={styles.financeValue}>
                                    {tender.our_price ? formatCurrency(tender.our_price) : '0.00 ₽'}
                                  </span>
                                </div>
                                <div className={styles.financeRow}>
                                  <span className={styles.financeLabel}>Затраты:</span>
                                  <span className={styles.financeValue}>
                                    {tender.contract_price ? formatCurrency(tender.contract_price) : '0.00 ₽'}
                                  </span>
                                </div>
                              </div>

                              {/* Ответственные */}
                              {tender.responsible && tender.responsible.length > 0 && (
                                <div className={styles.responsibleSection}>
                                  <div className={styles.responsibleLabel}>Ответственные</div>
                                  <div className={styles.responsibleList}>
                                    {tender.responsible.slice(0, 2).map((resp, idx) => (
                                      <div key={idx} className={styles.responsibleName}>
                                        {resp.employee.full_name}
                                      </div>
                                    ))}
                                    {tender.responsible.length > 2 && (
                                      <div className={styles.responsibleMore}>
                                        +{tender.responsible.length - 2} ещё
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Footer с номером ЕИС и площадкой */}
                              <div className={styles.cardFooter}>
                                <div className={styles.footerRow}>
                                  <div className={styles.footerLabel}>№ ЕИС</div>
                                  <div className={styles.footerValue}>
                                    {tender.purchase_number}
                                    <button
                                      onClick={(e) => copyToClipboard(tender.purchase_number, e)}
                                      className={styles.copyIconButton}
                                      title="Копировать"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                {tender.platform && (
                                  <div className={styles.footerRow}>
                                    <div className={styles.footerLabel}>Площадка:</div>
                                    <div className={`${styles.footerValue} ${styles.footerValueRight}`}>
                                      {tender.platform}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </Link>

                        {/* Кнопки внизу карточки */}
                        <div className={styles.cardActions}>
                          {!isArchivedStage && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCommentsSidebarTenderId(tender.id);
                                }}
                                className={styles.cardCommentsButton}
                                title="Комментарии"
                              >
                                <span className={styles.commentsIcon}>💬</span>
                                <span>Комментарии</span>
                                <span className="comments-badge">{commentsCounts[tender.id] || 0}</span>
                              </button>
                              
                              {/* Кнопка перехода на следующий этап */}
                              {nextStage && onStageChange && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleMoveToNextStage(tender, nextStage.id);
                                  }}
                                  className={styles.cardNextStageButton}
                                  title={`Переместить на этап: ${nextStage.name}`}
                                >
                                  <span className={styles.nextStageIcon}>→</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Кнопка меню перемещения (если включена настройка) */}
                          {allowFreeMovement && onStageChange && (
                            <div className={styles.moveMenuWrapper}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMoveMenuTenderId(moveMenuTenderId === tender.id ? null : tender.id);
                                }}
                                className={styles.cardMoveMenuButton}
                                title="Переместить в другой этап"
                              >
                                <span className={styles.moveMenuIcon}>⋮</span>
                              </button>

                              {/* Выпадающее меню этапов с группировкой */}
                              {moveMenuTenderId === tender.id && (
                                <div className={`${styles.moveMenu} ${isArchivedStage ? styles.moveMenuDown : ''}`}>
                                  {/* Активные этапы */}
                                  {stages.filter(s => s.id !== tender.stage_id && s.category === 'tender_dept').length > 0 && (
                                    <div className={styles.moveMenuGroup}>
                                      <div className={styles.moveMenuGroupTitle}>Активные этапы</div>
                                      {stages
                                        .filter(s => s.id !== tender.stage_id && s.category === 'tender_dept')
                                        .map(targetStage => (
                                          <button
                                            key={targetStage.id}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setMoveMenuTenderId(null);
                                              
                                              // Проверяем этап "Проиграли"
                                              const normalizeStageName = (name: string) => name.trim().toLowerCase();
                                              if (normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
                                                setPendingMove({ tender, targetStageId: targetStage.id });
                                                setShowLossReasonModal(true);
                                              } else {
                                                handleMoveToNextStage(tender, targetStage.id);
                                              }
                                            }}
                                            className={styles.moveMenuItem}
                                          >
                                            {targetStage.name}
                                          </button>
                                        ))}
                                    </div>
                                  )}

                                  {/* Архивные этапы */}
                                  {stages.filter(s => s.id !== tender.stage_id && s.category === 'archive').length > 0 && (
                                    <div className={styles.moveMenuGroup}>
                                      <div className={styles.moveMenuGroupTitle}>Архивные этапы</div>
                                      {stages
                                        .filter(s => s.id !== tender.stage_id && s.category === 'archive')
                                        .map(targetStage => (
                                          <button
                                            key={targetStage.id}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setMoveMenuTenderId(null);
                                              
                                              // Проверяем этап "Проиграли"
                                              const normalizeStageName = (name: string) => name.trim().toLowerCase();
                                              if (normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
                                                setPendingMove({ tender, targetStageId: targetStage.id });
                                                setShowLossReasonModal(true);
                                              } else {
                                                handleMoveToNextStage(tender, targetStage.id);
                                              }
                                            }}
                                            className={styles.moveMenuItem}
                                          >
                                            {targetStage.name}
                                          </button>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </React.Fragment>
        );
      };

          return (
            <div className={`${styles.kanbanContainer} ${isScrollDragging ? styles.kanbanDragging : ''}`}>
              {/* Архивные этапы рендерим напрямую без группировки */}
              {isArchived && stagesToRender.length > 0 && (
                <div
                  ref={containerRef}
                  className={styles.stageGroup}
                  onMouseDown={(e) => containerRef && handleScrollDragStart(e, containerRef)}
                  onMouseMove={(e) => handleScrollMove(e.nativeEvent)}
                  onMouseUp={handleScrollEnd}
                  onMouseLeave={handleScrollEnd}
                >
                  {stagesToRender.map((stage) => renderStageColumn(stage))}
                </div>
              )}
              
              {/* Системные этапы */}
              {!isArchived && showSystemStages && systemStages.length > 0 && (
                <div className={styles.stageGroupWrapper}>
                  {!hideControls && (
                  <div className={styles.stageGroupHeader}>
                    <button
                      onClick={() => toggleGroupCollapse('system')}
                      className={styles.collapseButton}
                      title={collapsedGroups.has('system') ? 'Развернуть' : 'Свернуть'}
                    >
                      <span className={styles.collapseIcon}>
                        {collapsedGroups.has('system') ? '▶' : '▼'}
                      </span>
                      <span className={styles.groupTitle}>Предконтрактные этапы</span>
                      <span className={styles.groupCount}>({systemStages.length})</span>
                    </button>
                  </div>
                  )}
                  {(hideControls || !collapsedGroups.has('system')) && (
                    <div
                      ref={containerRef}
                      className={styles.stageGroup}
                      onMouseDown={(e) => containerRef && handleScrollDragStart(e, containerRef)}
                      onMouseMove={(e) => handleScrollMove(e.nativeEvent)}
                      onMouseUp={handleScrollEnd}
                      onMouseLeave={handleScrollEnd}
                    >
                      {systemStages.map((stage) => renderStageColumn(stage))}
                    </div>
                  )}
                </div>
              )}


              {/* Этапы из шаблонов */}
              {!isArchived && showTemplateStages && templateStages.length > 0 && (() => {
                const usedTemplate = templates.find(t => 
                  usedTemplateIds.has(t.id)
                );
                const templateName = usedTemplate?.name || 'Шаблон';
                const groupKey = `template-${usedTemplate?.id || 'default'}`;
                
                return (
                  <div className={styles.stageGroupWrapper}>
                    {!hideControls && (
                    <div className={styles.stageGroupHeader}>
                      <button
                        onClick={() => toggleGroupCollapse(groupKey)}
                        className={styles.collapseButton}
                        title={collapsedGroups.has(groupKey) ? 'Развернуть' : 'Свернуть'}
                      >
                        <span className={styles.collapseIcon}>
                          {collapsedGroups.has(groupKey) ? '▶' : '▼'}
                        </span>
                        <span className={styles.groupTitle}>{templateName}</span>
                        <span className={styles.groupCount}>({templateStages.length})</span>
                      </button>
                    </div>
                    )}
                    {(hideControls || !collapsedGroups.has(groupKey)) && (
                      <div
                        ref={templateScrollContainerRef}
                        className={styles.stageGroup}
                        onMouseDown={(e) => templateScrollContainerRef && handleScrollDragStart(e, templateScrollContainerRef)}
                        onMouseMove={(e) => handleScrollMove(e.nativeEvent)}
                        onMouseUp={handleScrollEnd}
                        onMouseLeave={handleScrollEnd}
                      >
                        {templateStages.map((stage) => renderStageColumn(stage))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        };

        return (
          <>
            {/* Архивные этапы сверху */}
            {archivedStages.length > 0 && (
              <div className={styles.stageGroupWrapper}>
                {!hideControls && (
                <div className={styles.stageGroupHeader}>
                  <button
                    onClick={() => toggleGroupCollapse('archived')}
                    className={styles.collapseButton}
                    title={collapsedGroups.has('archived') ? 'Развернуть' : 'Свернуть'}
                  >
                    <span className={styles.collapseIcon}>
                      {collapsedGroups.has('archived') ? '▶' : '▼'}
                    </span>
                    <span className={styles.groupTitle}>Архивные этапы</span>
                    <span className={styles.groupCount}>({archivedStages.length})</span>
                  </button>
                </div>
                )}
                {(hideControls || !collapsedGroups.has('archived')) && renderStages(archivedStages, true, archivedScrollContainerRef)}
              </div>
            )}
            
            {/* Активные этапы снизу */}
            {activeStages.length > 0 && renderStages(activeStages, false, scrollContainerRef)}
          </>
        );
      })()}

      {/* Модалка причины проигрыша */}
      {showLossReasonModal && pendingMove && (
        <LossReasonModal
          tenderName={pendingMove.tender.subject}
          onSubmit={handleLossReasonSubmit}
          onCancel={handleLossReasonCancel}
        />
      )}

      {/* Боковая панель комментариев */}
      <TenderCommentsSidebar
        tenderId={commentsSidebarTenderId || ''}
        isOpen={!!commentsSidebarTenderId}
        onClose={() => {
          setCommentsSidebarTenderId(null);
        }}
        onUpdate={handleCommentsUpdate}
      />
    </div>
  );
}
