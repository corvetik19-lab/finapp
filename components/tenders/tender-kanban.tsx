'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Tender, TenderStage, TenderStageTemplate } from '@/lib/tenders/types';
import { formatCurrency, getDeadlineUrgency, daysUntilDeadline } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import { LossReasonModal } from './LossReasonModal';
import { TenderCommentsSidebar } from './TenderCommentsSidebar';
import { Button } from '@/components/ui/button';

export interface TenderKanbanProps {
  tendersByStage: Record<string, Tender[]>;
  stages: TenderStage[];
  templates?: TenderStageTemplate[];
  onStageChange?: (tenderId: string, newStageId: string) => void;
  allowBackwardMovement?: boolean;
  archivedStageNames?: string[];
  hideControls?: boolean;
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
  const dragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0, container: null as HTMLDivElement | null });
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ tender: Tender; targetStageId: string } | null>(null);
  const [commentsSidebarTenderId, setCommentsSidebarTenderId] = useState<string | null>(null);
  const [moveMenuTenderId, setMoveMenuTenderId] = useState<string | null>(null);
  const [allowFreeMovement, setAllowFreeMovement] = useState(false);
  const [showArchivedStages, setShowArchivedStages] = useState(false);
  const [showZmoArchivedStages, setShowZmoArchivedStages] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showSystemStages, setShowSystemStages] = useState(true);
  const [showTemplateStages, setShowTemplateStages] = useState(true);
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const counts: Record<string, number> = {};
    Object.values(tendersByStage).flat().forEach(t => {
      if (t.comments_count !== undefined) counts[t.id] = t.comments_count;
    });
    setCommentsCounts(prev => ({ ...prev, ...counts }));
  }, [tendersByStage]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    // Supabase realtime - обрабатываем изменения комментариев
    const channel = supabase.channel('kanban_global_comments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tender_comments' },
        (payload) => {
          const data = payload as { eventType: string; new: Record<string, string>; old: Record<string, string> };
          if (data.eventType === 'INSERT' && data.new?.tender_id) {
            setCommentsCounts(prev => ({ ...prev, [data.new.tender_id]: (prev[data.new.tender_id] || 0) + 1 }));
          } else if (data.eventType === 'DELETE' && data.old?.tender_id) {
            setCommentsCounts(prev => ({ ...prev, [data.old.tender_id]: Math.max(0, (prev[data.old.tender_id] || 0) - 1) }));
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCommentsUpdate = useCallback(async () => {
    if (!commentsSidebarTenderId) return;
    try {
      const response = await fetch(`/api/tenders/${commentsSidebarTenderId}/comments`, { cache: 'no-store' });
      if (response.ok) {
        const { data } = await response.json();
        setCommentsCounts(prev => ({ ...prev, [commentsSidebarTenderId]: (data || []).length }));
      }
    } catch (error) { console.error('Error updating comments count:', error); }
  }, [commentsSidebarTenderId]);

  useEffect(() => {
    const setting = localStorage.getItem('allowFreeMovement');
    setAllowFreeMovement(setting === 'true');
    const showArchived = localStorage.getItem('showArchivedStages');
    setShowArchivedStages(showArchived === 'true');
    const showZmoArchived = localStorage.getItem('showZmoArchivedStages');
    setShowZmoArchivedStages(showZmoArchived === 'true');
    const collapsed = localStorage.getItem('collapsedStageGroups');
    if (collapsed) setCollapsedGroups(new Set(JSON.parse(collapsed)));
    const showSystem = localStorage.getItem('showSystemStages');
    if (showSystem !== null) setShowSystemStages(showSystem === 'true');
    const showTemplate = localStorage.getItem('showTemplateStages');
    if (showTemplate !== null) setShowTemplateStages(showTemplate === 'true');
  }, []);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) newSet.delete(groupKey);
      else newSet.add(groupKey);
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
    const target = event.target as HTMLElement;
    if (target.closest('.tender-card')) return;
    if (!container.current) return;
    dragStateRef.current = { isDragging: true, startX: event.clientX, scrollLeft: container.current.scrollLeft, container: container.current };
    setIsScrollDragging(true);
    document.addEventListener('mousemove', handleScrollMove);
    document.addEventListener('mouseup', handleScrollEnd);
  }, [handleScrollMove, handleScrollEnd]);

  useEffect(() => {
    const hideEmpty = localStorage.getItem('hideEmptyStages');
    if (hideEmpty) setHideEmptyStages(hideEmpty === 'true');
  }, []);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [handleScrollEnd, handleScrollMove]);

  const toggleHideEmptyStages = () => {
    const newValue = !hideEmptyStages;
    setHideEmptyStages(newValue);
    localStorage.setItem('hideEmptyStages', String(newValue));
  };

  const toggleShowArchivedStages = () => {
    const newValue = !showArchivedStages;
    setShowArchivedStages(newValue);
    localStorage.setItem('showArchivedStages', String(newValue));
  };

  const toggleShowZmoArchivedStages = () => {
    const newValue = !showZmoArchivedStages;
    setShowZmoArchivedStages(newValue);
    localStorage.setItem('showZmoArchivedStages', String(newValue));
  };

  const handleLossReasonSubmit = async (reason: string, file: File | null, winnerInfo?: { winner_inn?: string; winner_name?: string; winner_price?: number; }) => {
    if (!pendingMove || !onStageChange) return;
    try {
      const oldStageId = pendingMove.tender.stage_id;
      const updatedTender = { ...pendingMove.tender, stage_id: pendingMove.targetStageId };
      const newOptimisticTenders = { ...optimisticTenders };
      newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(t => t.id !== pendingMove.tender.id);
      newOptimisticTenders[pendingMove.targetStageId] = [...(newOptimisticTenders[pendingMove.targetStageId] || []), updatedTender];
      setOptimisticTenders(newOptimisticTenders);
      setIsUpdating(true);

      const response = await fetch(`/api/tenders/${pendingMove.tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: pendingMove.targetStageId, ...winnerInfo }),
      });
      if (!response.ok) throw new Error('Failed to update tender');

      const commentResponse = await fetch(`/api/tenders/${pendingMove.tender.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `Причина проигрыша: ${reason}`, comment_type: 'loss_reason', stage_id: pendingMove.targetStageId, stage_name: 'Проиграли' }),
      });

      let commentId: string | null = null;
      if (commentResponse.ok) {
        const responseData = await commentResponse.json();
        commentId = responseData.data?.id;
      }

      if (file && commentId) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const attachmentResponse = await fetch(`/api/tenders/${pendingMove.tender.id}/comments/${commentId}/attachments`, { method: 'POST', body: formData });
          if (!attachmentResponse.ok) toast.show('Комментарий сохранен, но файл не загрузился', { type: 'info' });
        } catch { toast.show('Ошибка при загрузке файла', { type: 'error' }); }
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

  const handleLossReasonCancel = () => { setShowLossReasonModal(false); setPendingMove(null); };
  const handleDragStart = (tender: Tender) => { setDraggedTender(tender); };
  const handleDragEnd = () => { setDraggedTender(null); setDragOverStage(null); };

  const canMoveToStage = (fromStageId: string, toStageId: string): boolean => {
    if (fromStageId === toStageId) return false;
    const fromStage = stages.find(s => s.id === fromStageId);
    const toStage = stages.find(s => s.id === toStageId);
    if (!fromStage || !toStage) return false;
    if (allowFreeMovement) return true;
    if (fromStage.category === 'realization' && toStage.category === 'realization') return true;
    const isFromArchived = fromStage.category === 'archive';
    const isToArchived = toStage.category === 'archive';
    if (isFromArchived && allowBackwardMovement) return true;
    if (isToArchived) return true;
    if (fromStage.category === 'tender_dept' && toStage.category === 'tender_dept') {
      const fromIndex = fromStage.order_index;
      const toIndex = toStage.order_index;
      const isMovingBackward = toIndex < fromIndex;
      if (isMovingBackward) {
        if (allowBackwardMovement) return true;
        if (fromStage.name === 'Проверка') {
          const allowedFromCheck = ['Не участвуем', 'Не прошло проверку', 'Не подано', 'Подача'];
          return allowedFromCheck.includes(toStage.name);
        }
        return false;
      }
      return toIndex === fromIndex + 1;
    }
    return false;
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedTender && canMoveToStage(draggedTender.stage_id, stageId)) setDragOverStage(stageId);
  };

  const handleDragLeave = () => { setDragOverStage(null); };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedTender && !canMoveToStage(draggedTender.stage_id, stageId)) {
      const fromStage = stages.find(s => s.id === draggedTender.stage_id);
      const toStage = stages.find(s => s.id === stageId);
      if (fromStage && toStage) {
        const isMovingBackward = toStage.order_index < fromStage.order_index;
        if (isMovingBackward && !allowBackwardMovement) toast.show('Перемещение назад запрещено. Включите "Разрешить перемещение назад" в настройках', { type: 'error', duration: 3000 });
        else toast.show('Нельзя перепрыгивать через этапы. Перемещайте последовательно', { type: 'error', duration: 3000 });
      }
      setDraggedTender(null); setDragOverStage(null); return;
    }

    if (draggedTender && draggedTender.stage_id !== stageId && onStageChange) {
      const targetStage = stages.find(s => s.id === stageId);
      if (targetStage && normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
        setPendingMove({ tender: draggedTender, targetStageId: stageId });
        setShowLossReasonModal(true);
        setDraggedTender(null); setDragOverStage(null); return;
      }
      const oldStageId = draggedTender.stage_id;
      const updatedTender = { ...draggedTender, stage_id: stageId };
      const newOptimisticTenders = { ...optimisticTenders };
      newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(t => t.id !== draggedTender.id);
      newOptimisticTenders[stageId] = [...(newOptimisticTenders[stageId] || []), updatedTender];
      setOptimisticTenders(newOptimisticTenders);
      setIsUpdating(true);
      try { await onStageChange(draggedTender.id, stageId); }
      catch { setOptimisticTenders(tendersByStage); }
      finally { setIsUpdating(false); }
    }
    setDraggedTender(null); setDragOverStage(null);
  };

  const getStageStats = (stageId: string) => {
    const tenders = tendersByStage[stageId] || [];
    return { count: tenders.length, totalNmck: tenders.reduce((sum, t) => sum + t.nmck, 0) };
  };

  const getDeadlineBadgeClass = (deadline: string) => {
    const urgency = getDeadlineUrgency(deadline);
    const classMap = { urgent: 'bg-red-100 text-red-800 border-red-200', warning: 'bg-amber-100 text-amber-800 border-amber-200', normal: 'bg-green-100 text-green-800 border-green-200', passed: 'bg-gray-100 text-gray-500 border-gray-200' };
    return classMap[urgency];
  };

  const formatDeadline = (deadline: string) => new Date(deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch (err) { console.error('Failed to copy:', err); }
  };

  const getQuickActions = (stageName: string): Array<{ label: string, targetStageName: string }> => {
    if (stageName === 'Анализ и просчёт') return [{ label: 'Не участвуем', targetStageName: 'Не участвуем' }];
    if (stageName === 'Проверка') return [{ label: 'Не участвуем', targetStageName: 'Не участвуем' }, { label: 'Не прошло проверку', targetStageName: 'Не прошло проверку' }, { label: 'Не подано', targetStageName: 'Не подано' }];
    if (stageName === 'Ждём итоги') return [{ label: 'Проиграли', targetStageName: 'Проиграли' }];
    return [];
  };

  const handleMoveToNextStage = async (tender: Tender, targetStageId: string) => {
    if (!onStageChange) return;
    if (!canMoveToStage(tender.stage_id, targetStageId)) {
      const fromStage = stages.find(s => s.id === tender.stage_id);
      const toStage = stages.find(s => s.id === targetStageId);
      if (fromStage && toStage) {
        const isMovingBackward = toStage.order_index < fromStage.order_index;
        if (isMovingBackward && !allowBackwardMovement) toast.show('Перемещение назад запрещено', { type: 'error', duration: 3000 });
        else toast.show('Нельзя перепрыгивать через этапы', { type: 'error', duration: 3000 });
      }
      return;
    }
    const targetStage = stages.find(s => s.id === targetStageId);
    if (targetStage && normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) {
      setPendingMove({ tender, targetStageId }); setShowLossReasonModal(true); return;
    }
    const oldStageId = tender.stage_id;
    const updatedTender = { ...tender, stage_id: targetStageId };
    const newOptimisticTenders = { ...optimisticTenders };
    newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(t => t.id !== tender.id);
    newOptimisticTenders[targetStageId] = [...(newOptimisticTenders[targetStageId] || []), updatedTender];
    setOptimisticTenders(newOptimisticTenders);
    setIsUpdating(true);
    try { await onStageChange(tender.id, targetStageId); toast.show(`Тендер перемещён на этап "${targetStage?.name}"`, { type: 'success', duration: 2000 }); }
    catch { setOptimisticTenders(tendersByStage); toast.show('Ошибка при перемещении тендера', { type: 'error', duration: 3000 }); }
    finally { setIsUpdating(false); }
  };

  const handleQuickMove = async (tender: Tender, targetStageName: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetStage = stages.find(s => s.name === targetStageName);
    if (!targetStage || !onStageChange) return;
    setOpenMenuTenderId(null);
    if (normalizeStageName(targetStageName) === normalizeStageName('Проиграли')) { setPendingMove({ tender, targetStageId: targetStage.id }); setShowLossReasonModal(true); return; }
    const oldStageId = tender.stage_id;
    const updatedTender = { ...tender, stage_id: targetStage.id };
    const newOptimisticTenders = { ...optimisticTenders };
    newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(t => t.id !== tender.id);
    newOptimisticTenders[targetStage.id] = [...(newOptimisticTenders[targetStage.id] || []), updatedTender];
    setOptimisticTenders(newOptimisticTenders);
    setIsUpdating(true);
    try { await onStageChange(tender.id, targetStage.id); } catch { setOptimisticTenders(tendersByStage); } finally { setIsUpdating(false); }
  };

  const toggleMenu = (tenderId: string, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpenMenuTenderId(openMenuTenderId === tenderId ? null : tenderId); };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuTenderId(null);
    if (openMenuTenderId) { document.addEventListener('click', handleClickOutside); return () => document.removeEventListener('click', handleClickOutside); }
  }, [openMenuTenderId]);

  useEffect(() => { if (!isUpdating) setOptimisticTenders(tendersByStage); }, [tendersByStage, isUpdating]);

  const usedTemplateIds = new Set<string>();
  Object.values(optimisticTenders).flat().forEach(tender => { if (tender.template_id && tender.template_id !== 'system') usedTemplateIds.add(tender.template_id); });

  const templateStageIds = new Set<string>();
  templates.forEach(template => { if (usedTemplateIds.has(template.id) && template.items) template.items.forEach(item => { templateStageIds.add(item.stage_id); }); });

  let visibleStages = stages.filter(stage => !stage.is_hidden);
  visibleStages = visibleStages.filter(stage => {
    if (stage.category === 'archive') {
      if (stage.name.startsWith('ЗМО:')) return showZmoArchivedStages;
      return showArchivedStages;
    }
    return true;
  });
  if (hideEmptyStages) visibleStages = visibleStages.filter(stage => (optimisticTenders[stage.id] || []).length > 0);
  visibleStages = visibleStages.sort((a, b) => {
    if (a.is_system && !b.is_system) return -1;
    if (!a.is_system && b.is_system) return 1;
    return (a.order_index || 0) - (b.order_index || 0);
  });

  const renderStageColumn = (stage: TenderStage, containerRef?: React.RefObject<HTMLDivElement | null>) => {
    const isArchivedStage = stage.category === 'archive';
    const stats = getStageStats(stage.id);
    const tenders = optimisticTenders[stage.id] || [];
    const isDragOver = dragOverStage === stage.id;

    const nextStage = (() => {
      if (stage.category === 'realization') {
        return visibleStages.filter(s => s.category === 'realization').sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).find(s => (s.order_index || 0) > (stage.order_index || 0));
      }
      if (stage.is_system) {
        return visibleStages.filter(s => s.is_system && s.category !== 'archive').find(s => (s.order_index || 0) > (stage.order_index || 0));
      } else {
        const currentTemplate = templates.find(t => t.items?.some(item => item.stage_id === stage.id));
        if (currentTemplate && currentTemplate.items) {
          const templateStageIds = currentTemplate.items.sort((a, b) => a.order_index - b.order_index).map(item => item.stage_id);
          const currentIndex = templateStageIds.indexOf(stage.id);
          if (currentIndex !== -1 && currentIndex < templateStageIds.length - 1) {
            const nextStageId = templateStageIds[currentIndex + 1];
            return stages.find(s => s.id === nextStageId && s.category !== 'archive');
          }
        }
        return undefined;
      }
    })();

    return (
      <div key={stage.id} className={`flex-shrink-0 w-64 sm:w-72 bg-gray-50 rounded-lg flex flex-col ${isArchivedStage ? 'opacity-75 !w-56 sm:!w-60' : ''}`}
        onDragOver={(e) => handleDragOver(e, stage.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, stage.id)}>
        <div className={`p-3 border-b bg-white rounded-t-lg ${isScrollDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isArchivedStage ? 'bg-gray-100' : ''}`}
          onMouseDown={(e) => containerRef && handleScrollDragStart(e, containerRef)}>
          <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
          <div className="text-xs text-gray-500 mt-1">{isArchivedStage ? `(${stats.count})` : `${formatCurrency(stats.totalNmck)} (${stats.count})`}</div>
        </div>

        <div className={`flex-1 p-2 overflow-y-auto max-h-[calc(100vh-300px)] ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''}`}>
          {tenders.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Нет тендеров</div>
          ) : (
            <div className="space-y-2">
              {tenders.map((tender) => {
                const quickActions = getQuickActions(stage.name);
                const hasQuickActions = quickActions.length > 0;
                const daysLeft = daysUntilDeadline(tender.submission_deadline);
                const normalizedStageName = normalizeStageName(stage.name);
                const deadlineStages = new Set(['анализ и просчёт', 'анализ и просчет', 'анализ просчет', 'анализ просчёт', 'проверка', 'не прошло проверку', 'не подано', 'подача', 'змо: анализ и просчёт', 'змо: анализ и просчет', 'змо: проверка', 'змо: подача', 'змо: подан. рассмотрение заявки', 'змо: подан рассмотрение заявки']);
                const shouldShowTimer = !isArchivedStage && deadlineStages.has(normalizedStageName) && tender.status !== 'won';
                const isTenderOverdue = daysLeft < 0 && tender.status !== 'won';

                return (
                  <div key={tender.id} draggable onDragStart={() => handleDragStart(tender)} onDragEnd={handleDragEnd}
                    className={`tender-card bg-white rounded-lg border p-3 cursor-grab hover:shadow-md transition-shadow relative ${draggedTender?.id === tender.id ? 'opacity-50' : ''} ${isTenderOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}`}>
                    {hasQuickActions && (
                      <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => toggleMenu(tender.id, e)} title="Быстрые действия">⋮</Button>
                        {openMenuTenderId === tender.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[140px]">
                            {quickActions.map((action) => (
                              <button key={action.targetStageName} onClick={(e) => handleQuickMove(tender, action.targetStageName, e)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{action.label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Link href={`/tenders/${tender.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                      {isArchivedStage ? (
                        <>
                          <div className="font-medium text-sm truncate">{tender.customer}</div>
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">{tender.subject}</div>
                          <div className="flex items-center justify-between mt-2 text-xs"><span className="text-gray-500">НМЦК:</span><span className="font-semibold">{formatCurrency(tender.nmck)}</span></div>
                        </>
                      ) : (
                        <>
                          {shouldShowTimer && (
                            <>
                              <div className={`inline-block px-2 py-0.5 text-xs font-medium rounded border mb-2 ${getDeadlineBadgeClass(tender.submission_deadline)}`}>{formatDeadline(tender.submission_deadline)}</div>
                              <div className={`text-xs mb-2 ${daysLeft <= 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{daysLeft >= 0 ? (daysLeft === 0 ? 'Сегодня' : `Осталось: ${daysLeft} дн.`) : '⚠️ Просрочен'}</div>
                            </>
                          )}
                          {isTenderOverdue && !shouldShowTimer && <div className="text-xs text-red-600 font-medium mb-2">⚠️ Просрочен</div>}
                          <div className="font-medium text-sm truncate">{tender.customer}</div>
                          {tender.type?.name && <div className="text-xs text-blue-600 mt-1">{tender.type.name}</div>}
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">{tender.subject}</div>
                          <div className="mt-3 space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-gray-500">НМЦК:</span><span className="font-semibold">{formatCurrency(tender.nmck)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Цена для торгов:</span><span className="font-semibold">{tender.our_price ? formatCurrency(tender.our_price) : '0.00 ₽'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Затраты:</span><span className="font-semibold">{tender.contract_price ? formatCurrency(tender.contract_price) : '0.00 ₽'}</span></div>
                          </div>
                          {tender.responsible && tender.responsible.length > 0 && (
                            <div className="mt-3 pt-2 border-t">
                              <div className="text-xs text-gray-500 mb-1">Ответственные</div>
                              {tender.responsible.slice(0, 2).map((resp, idx) => <div key={idx} className="text-xs font-medium">{resp.employee.full_name}</div>)}
                              {tender.responsible.length > 2 && <div className="text-xs text-gray-400">+{tender.responsible.length - 2} ещё</div>}
                            </div>
                          )}
                          <div className="mt-3 pt-2 border-t text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">№ ЕИС</span>
                              <span className="font-medium flex items-center gap-1">{tender.purchase_number}<button onClick={(e) => copyToClipboard(tender.purchase_number, e)} className="p-0.5 hover:bg-gray-100 rounded" title="Копировать"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></span>
                            </div>
                            {tender.platform && <div className="flex justify-between mt-1"><span className="text-gray-500">Площадка:</span><span className="text-right truncate max-w-[120px]">{tender.platform}</span></div>}
                          </div>
                          {(tender.last_comment || tender.next_task) && (
                            <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                              {tender.last_comment && <div className="italic text-gray-500 truncate" title={tender.last_comment.content}>&quot;{tender.last_comment.content}&quot;</div>}
                              {tender.next_task && <div className={`flex items-center gap-1 ${new Date(tender.next_task.due_date) < new Date() ? 'text-red-600' : 'text-gray-600'}`}><span>📅</span><span>{tender.next_task.title}</span><span>({new Date(tender.next_task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})</span></div>}
                            </div>
                          )}
                        </>
                      )}
                    </Link>

                    <div className="mt-2 pt-2 border-t flex items-center gap-2">
                      {!isArchivedStage && (
                        <>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCommentsSidebarTenderId(tender.id); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100" title="Комментарии">
                            <span>💬</span><span>Комментарии</span><span className="bg-gray-200 px-1.5 py-0.5 rounded-full text-xs">{commentsCounts[tender.id] || 0}</span>
                          </button>
                          {nextStage && onStageChange && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveToNextStage(tender, nextStage.id); }} className="ml-auto w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600" title={`Переместить на этап: ${nextStage.name}`}>→</button>
                          )}
                        </>
                      )}
                      {allowFreeMovement && onStageChange && (
                        <div className="relative ml-auto">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoveMenuTenderId(moveMenuTenderId === tender.id ? null : tender.id); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Переместить в другой этап">⋮</button>
                          {moveMenuTenderId === tender.id && (
                            <div className={`absolute right-0 ${isArchivedStage ? 'top-full mt-1' : 'bottom-full mb-1'} bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[160px] max-h-64 overflow-y-auto`}>
                              {stages.filter(s => s.id !== tender.stage_id && s.category === 'tender_dept').length > 0 && (
                                <div>
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Активные этапы</div>
                                  {stages.filter(s => s.id !== tender.stage_id && s.category === 'tender_dept').map(targetStage => (
                                    <button key={targetStage.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoveMenuTenderId(null); if (normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) { setPendingMove({ tender, targetStageId: targetStage.id }); setShowLossReasonModal(true); } else handleMoveToNextStage(tender, targetStage.id); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{targetStage.name}</button>
                                  ))}
                                </div>
                              )}
                              {stages.filter(s => s.id !== tender.stage_id && s.category === 'archive').length > 0 && (
                                <div>
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Архивные этапы</div>
                                  {stages.filter(s => s.id !== tender.stage_id && s.category === 'archive').map(targetStage => (
                                    <button key={targetStage.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoveMenuTenderId(null); if (normalizeStageName(targetStage.name) === normalizeStageName('Проиграли')) { setPendingMove({ tender, targetStageId: targetStage.id }); setShowLossReasonModal(true); } else handleMoveToNextStage(tender, targetStage.id); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{targetStage.name}</button>
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
    );
  };

  const archivedStages = visibleStages.filter(s => s.category === 'archive');
  const activeStages = visibleStages.filter(s => s.category !== 'archive');
  const zmoArchivedStages = archivedStages.filter(s => s.name.startsWith('ЗМО:'));
  const generalArchivedStages = archivedStages.filter(s => !s.name.startsWith('ЗМО:'));
  const systemStages = activeStages.filter(s => s.is_system && s.category !== 'archive');
  const templateStages = activeStages.filter(s => !s.is_system && s.category !== 'archive');

  return (
    <div className="h-full overflow-auto px-2 py-1">
      {!hideControls && (
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 p-3 bg-gray-50 rounded-lg text-xs sm:text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={hideEmptyStages} onChange={toggleHideEmptyStages} className="rounded" /><span>Скрыть пустые</span></label>
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={showZmoArchivedStages} onChange={toggleShowZmoArchivedStages} className="rounded" /><span>ЗМО: Архив</span></label>
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={showArchivedStages} onChange={toggleShowArchivedStages} className="rounded" /><span>Архивные</span></label>
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={showSystemStages} onChange={(e) => { setShowSystemStages(e.target.checked); localStorage.setItem('showSystemStages', String(e.target.checked)); }} className="rounded" /><span>Предконтрактные</span></label>
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={showTemplateStages} onChange={(e) => { setShowTemplateStages(e.target.checked); localStorage.setItem('showTemplateStages', String(e.target.checked)); }} className="rounded" /><span>Этапы ЗМО</span></label>
        </div>
      )}

      {/* ZMO Archived */}
      {zmoArchivedStages.length > 0 && (
        <div className="mb-4">
          {!hideControls && (
            <button onClick={() => toggleGroupCollapse('zmo-archived')} className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              <span>{collapsedGroups.has('zmo-archived') ? '▶' : '▼'}</span><span>ЗМО: Архив</span><span className="text-gray-400">({zmoArchivedStages.length})</span>
            </button>
          )}
          {(hideControls || !collapsedGroups.has('zmo-archived')) && (
            <div ref={archivedScrollContainerRef} className={`flex gap-3 overflow-x-auto pb-2 ${isScrollDragging ? 'cursor-grabbing' : ''}`} onMouseDown={(e) => handleScrollDragStart(e, archivedScrollContainerRef)}>
              {zmoArchivedStages.map((stage) => renderStageColumn(stage, archivedScrollContainerRef))}
            </div>
          )}
        </div>
      )}

      {/* General Archived */}
      {generalArchivedStages.length > 0 && (
        <div className="mb-4">
          {!hideControls && (
            <button onClick={() => toggleGroupCollapse('archived')} className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              <span>{collapsedGroups.has('archived') ? '▶' : '▼'}</span><span>Архивные этапы</span><span className="text-gray-400">({generalArchivedStages.length})</span>
            </button>
          )}
          {(hideControls || !collapsedGroups.has('archived')) && (
            <div ref={archivedScrollContainerRef} className={`flex gap-3 overflow-x-auto pb-2 ${isScrollDragging ? 'cursor-grabbing' : ''}`} onMouseDown={(e) => handleScrollDragStart(e, archivedScrollContainerRef)}>
              {generalArchivedStages.map((stage) => renderStageColumn(stage, archivedScrollContainerRef))}
            </div>
          )}
        </div>
      )}

      {/* System Stages */}
      {showSystemStages && systemStages.length > 0 && (
        <div className="mb-4">
          {!hideControls && (
            <button onClick={() => toggleGroupCollapse('system')} className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              <span>{collapsedGroups.has('system') ? '▶' : '▼'}</span><span>Предконтрактные этапы</span><span className="text-gray-400">({systemStages.length})</span>
            </button>
          )}
          {(hideControls || !collapsedGroups.has('system')) && (
            <div ref={scrollContainerRef} className={`flex gap-3 overflow-x-auto pb-2 ${isScrollDragging ? 'cursor-grabbing' : ''}`} onMouseDown={(e) => handleScrollDragStart(e, scrollContainerRef)}>
              {systemStages.map((stage) => renderStageColumn(stage, scrollContainerRef))}
            </div>
          )}
        </div>
      )}

      {/* Template Stages */}
      {showTemplateStages && (() => {
        const processedStageIds = new Set<string>();
        const templateGroups = templates.map(template => {
          const stagesInTemplate = template.items?.sort((a, b) => a.order_index - b.order_index).map(item => {
            const stage = templateStages.find(s => s.id === item.stage_id);
            if (stage) processedStageIds.add(stage.id);
            return stage;
          }).filter((s): s is TenderStage => !!s) || [];
          if (stagesInTemplate.length === 0) return null;
          const groupKey = `template-${template.id}`;
          return (
            <div key={template.id} className="mb-4">
              {!hideControls && (
                <button onClick={() => toggleGroupCollapse(groupKey)} className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                  <span>{collapsedGroups.has(groupKey) ? '▶' : '▼'}</span><span>{template.name}</span><span className="text-gray-400">({stagesInTemplate.length})</span>
                </button>
              )}
              {(hideControls || !collapsedGroups.has(groupKey)) && (
                <div className={`flex gap-3 overflow-x-auto pb-2 ${isScrollDragging ? 'cursor-grabbing' : ''}`}>{stagesInTemplate.map((stage) => renderStageColumn(stage))}</div>
              )}
            </div>
          );
        });
        const orphanStages = templateStages.filter(s => !processedStageIds.has(s.id));
        return (
          <>
            {templateGroups}
            {orphanStages.length > 0 && (
              <div className="mb-4">
                {!hideControls && (
                  <button onClick={() => toggleGroupCollapse('orphan')} className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                    <span>{collapsedGroups.has('orphan') ? '▶' : '▼'}</span><span>Прочие этапы</span><span className="text-gray-400">({orphanStages.length})</span>
                  </button>
                )}
                {(hideControls || !collapsedGroups.has('orphan')) && (
                  <div className={`flex gap-3 overflow-x-auto pb-2 ${isScrollDragging ? 'cursor-grabbing' : ''}`}>{orphanStages.map((stage) => renderStageColumn(stage))}</div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {showLossReasonModal && pendingMove && (
        <LossReasonModal tenderName={pendingMove.tender.subject} onSubmit={handleLossReasonSubmit} onCancel={handleLossReasonCancel} />
      )}

      <TenderCommentsSidebar tenderId={commentsSidebarTenderId || ''} isOpen={!!commentsSidebarTenderId} onClose={() => setCommentsSidebarTenderId(null)} onUpdate={handleCommentsUpdate} />
    </div>
  );
}
