'use client';

import { useState, useEffect, DragEvent } from 'react';
import { StageModal } from '@/components/tenders/settings/stage-modal';
import { TypeModal } from '@/components/tenders/settings/type-modal';
import { TemplateModal } from '@/components/tenders/settings/template-modal';
import { StageTemplatesTab } from '@/components/tenders/settings/StageTemplatesTab';
import { useToast } from '@/components/toast/ToastContext';
import { TenderStageTemplate } from '@/lib/tenders/types';
import { loadStageTemplates, createStageTemplate, updateStageTemplate, deleteStageTemplate } from '@/lib/tenders/template-service';
import { notifyStagesUpdated } from '@/lib/tenders/events';
import styles from './tender-settings.module.css';

type TabType = 'general' | 'stages' | 'types' | 'stage_templates' | 'notifications' | 'automation' | 'templates' | 'integrations';

interface Stage {
  id: string;
  name: string;
  category?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
  is_final?: boolean;
  is_system?: boolean; // Системный этап (нельзя удалить/редактировать)
  is_hidden?: boolean; // Скрытый этап
}

interface TenderType {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
}

interface TenderSettingsCompleteProps {
  initialStages: Stage[];
  initialTypes: TenderType[];
}

export function TenderSettingsComplete({ initialStages, initialTypes }: TenderSettingsCompleteProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [types, setTypes] = useState<TenderType[]>(initialTypes);
  
  // Модальные окна
  const [stageModal, setStageModal] = useState<{ isOpen: boolean; stage?: Stage }>({ isOpen: false });
  const [typeModal, setTypeModal] = useState<{ isOpen: boolean; type?: TenderType }>({ isOpen: false });
  const [templateModal, setTemplateModal] = useState<{ isOpen: boolean; template?: TenderStageTemplate }>({ isOpen: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string; type?: 'stage' | 'type' | 'template' }>({ isOpen: false });

  // Состояние для шаблонов этапов
  const [stageTemplates, setStageTemplates] = useState<TenderStageTemplate[]>([]);

  // Настройки уведомлений
  const [notificationSettings, setNotificationSettings] = useState({
    deadline_reminder: true,
    stage_change: true,
    new_tender: false,
    document_expiry: true,
    email_notifications: true,
    telegram_notifications: false,
    allow_backward_movement: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  const tabs = [
    { id: 'general' as TabType, label: 'Основные', icon: '⚙️' },
    { id: 'stages' as TabType, label: 'Этапы', icon: '📊' },
    { id: 'types' as TabType, label: 'Типы тендеров', icon: '🏷️' },
    { id: 'stage_templates' as TabType, label: 'Шаблоны этапов', icon: '📚' },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: '🔔' },
    { id: 'automation' as TabType, label: 'Автоматизация', icon: '⚡' },
    { id: 'templates' as TabType, label: 'Шаблоны', icon: '📄' },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: '🔗' },
  ];

  // Загрузка настроек уведомлений
  useEffect(() => {
    if (activeTab === 'notifications' || activeTab === 'general') {
      loadNotificationSettings();
    }
  }, [activeTab]);

  // Загрузка шаблонов этапов
  useEffect(() => {
    if (activeTab === 'stage_templates') {
      loadTemplates();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    const templates = await loadStageTemplates();
    setStageTemplates(templates);
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/tenders/settings/notifications');
      if (response.ok) {
        const result = await response.json();
        setNotificationSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: typeof notificationSettings) => {
    setSavingNotifications(true);
    try {
      const response = await fetch('/api/tenders/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      // Показываем уведомление об успехе
      toast.show('Настройки сохранены', { type: 'success' });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.show('Ошибка при сохранении настроек', { type: 'error' });
    } finally {
      setSavingNotifications(false);
    }
  };

  const toggleNotificationSetting = (key: keyof typeof notificationSettings) => {
    const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  // Обработчики для этапов (из предыдущей версии)
  const handleSaveStage = async (data: Partial<Stage>) => {
    try {
      if (stageModal.stage) {
        console.log('Updating stage:', stageModal.stage.id, 'with data:', data);
        const response = await fetch(`/api/tenders/stages/${stageModal.stage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, errorData);
          throw new Error(errorData.error || 'Ошибка при обновлении этапа');
        }
        
        const result = await response.json();
        setStages(stages.map(s => s.id === stageModal.stage?.id ? result.data : s));
        notifyStagesUpdated(); // Уведомляем об обновлении
      } else {
        console.log('Creating stage with data:', data);
        const response = await fetch('/api/tenders/stages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, errorData);
          throw new Error(errorData.error || 'Ошибка при создании этапа');
        }
        
        const result = await response.json();
        setStages([...stages, result.data]);
        notifyStagesUpdated(); // Уведомляем об обновлении
      }
    } catch (error) {
      console.error('Error saving stage:', error);
      throw error;
    }
  };

  const handleToggleHidden = async (id: string, isHidden: boolean) => {
    try {
      const response = await fetch(`/api/tenders/stages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: isHidden }),
      });
      if (!response.ok) throw new Error('Ошибка при обновлении этапа');
      const result = await response.json();
      setStages(stages.map(s => s.id === id ? result.data : s));
      notifyStagesUpdated(); // Уведомляем об обновлении
      toast.show(isHidden ? 'Этап скрыт' : 'Этап показан', { type: 'success' });
    } catch (error) {
      console.error('Error toggling stage visibility:', error);
      toast.show('Ошибка при обновлении этапа', { type: 'error' });
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      const response = await fetch(`/api/tenders/stages/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка при удалении этапа');
      setStages(stages.filter(s => s.id !== id));
      setDeleteConfirm({ isOpen: false });
      notifyStagesUpdated(); // Уведомляем об обновлении
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.show('Ошибка при удалении этапа', { type: 'error' });
    }
  };

  // Обработчики для типов
  const handleSaveType = async (data: Partial<TenderType>) => {
    try {
      if (typeModal.type) {
        const response = await fetch(`/api/tenders/types/${typeModal.type.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Ошибка при обновлении типа');
        const result = await response.json();
        setTypes(types.map(t => t.id === typeModal.type?.id ? result.data : t));
      } else {
        const response = await fetch('/api/tenders/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(errorData.error || 'Ошибка при создании типа');
        }
        const result = await response.json();
        setTypes([...types, result.data]);
      }
    } catch (error) {
      console.error('Error saving type:', error);
      throw error;
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      const response = await fetch(`/api/tenders/types/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка при удалении типа');
      setTypes(types.filter(t => t.id !== id));
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Error deleting type:', error);
      toast.show('Ошибка при удалении типа', { type: 'error' });
    }
  };

  // Обработчики для шаблонов этапов
  const handleSaveTemplate = async (data: { name: string; description: string; icon: string; is_active: boolean; stage_ids: string[] }) => {
    try {
      if (templateModal.template) {
        const updated = await updateStageTemplate(templateModal.template.id, data);
        setStageTemplates(stageTemplates.map(t => t.id === templateModal.template?.id ? updated : t));
      } else {
        const created = await createStageTemplate(data);
        setStageTemplates([...stageTemplates, created]);
      }
      setTemplateModal({ isOpen: false });
      toast.show('Шаблон сохранён', { type: 'success' });
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteStageTemplate(id);
      setStageTemplates(stageTemplates.filter(t => t.id !== id));
      setDeleteConfirm({ isOpen: false });
      toast.show('Шаблон удалён', { type: 'success' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.show('Ошибка при удалении шаблона', { type: 'error' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>⚙️ Настройки тендеров</h1>
          <p className={styles.subtitle}>
            Управление этапами, типами, уведомлениями и автоматизацией
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'general' && (
          <GeneralTab
            settings={notificationSettings}
            onToggle={toggleNotificationSetting}
            saving={savingNotifications}
          />
        )}
        {activeTab === 'stages' && (
          <StagesTab
            stages={stages}
            onAdd={() => setStageModal({ isOpen: true })}
            onEdit={(stage: Stage) => setStageModal({ isOpen: true, stage })}
            onDelete={(id: string) => setDeleteConfirm({ isOpen: true, id, type: 'stage' })}
            onToggleHidden={handleToggleHidden}
            onReorder={setStages}
            onReorderSuccess={() => toast.show('Этапы успешно обновлены', { type: 'success' })}
          />
        )}
        {activeTab === 'types' && (
          <TypesTab
            types={types}
            onAdd={() => setTypeModal({ isOpen: true })}
            onEdit={(type: TenderType) => setTypeModal({ isOpen: true, type })}
            onDelete={(id: string) => setDeleteConfirm({ isOpen: true, id, type: 'type' })}
          />
        )}
        {activeTab === 'stage_templates' && (
          <StageTemplatesTab
            templates={stageTemplates}
            stages={stages as unknown as import('@/lib/tenders/types').TenderStage[]}
            onAdd={() => setTemplateModal({ isOpen: true })}
            onEdit={(template: TenderStageTemplate) => setTemplateModal({ isOpen: true, template })}
            onDelete={(id: string) => setDeleteConfirm({ isOpen: true, id, type: 'template' })}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab
            settings={notificationSettings}
            onToggle={toggleNotificationSetting}
            saving={savingNotifications}
          />
        )}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>

      <StageModal
        stage={stageModal.stage}
        isOpen={stageModal.isOpen}
        onClose={() => setStageModal({ isOpen: false })}
        onSave={handleSaveStage}
      />

      <TypeModal
        type={typeModal.type}
        isOpen={typeModal.isOpen}
        onClose={() => setTypeModal({ isOpen: false })}
        onSave={handleSaveType}
      />

      <TemplateModal
        template={templateModal.template as unknown as Parameters<typeof TemplateModal>[0]['template']}
        isOpen={templateModal.isOpen}
        onClose={() => setTemplateModal({ isOpen: false })}
        onSave={handleSaveTemplate}
        stages={stages as unknown as import('@/lib/tenders/types').TenderStage[]}
      />

      {deleteConfirm.isOpen && (
        <ConfirmDialog
          title="Подтверждение удаления"
          message={`Вы уверены, что хотите удалить ${
            deleteConfirm.type === 'stage' ? 'этот этап' : 
            deleteConfirm.type === 'type' ? 'этот тип' : 
            'этот шаблон'
          }?`}
          onConfirm={() => {
            if (deleteConfirm.type === 'stage' && deleteConfirm.id) {
              handleDeleteStage(deleteConfirm.id);
            } else if (deleteConfirm.type === 'type' && deleteConfirm.id) {
              handleDeleteType(deleteConfirm.id);
            } else if (deleteConfirm.type === 'template' && deleteConfirm.id) {
              handleDeleteTemplate(deleteConfirm.id);
            }
          }}
          onCancel={() => setDeleteConfirm({ isOpen: false })}
        />
      )}
    </div>
  );
}

// Компоненты вкладок
function StagesTab({ stages, onAdd, onEdit, onDelete, onToggleHidden, onReorder, onReorderSuccess }: {
  stages: Stage[];
  onAdd: () => void;
  onEdit: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string, isHidden: boolean) => void;
  onReorder: (newStages: Stage[]) => void;
  onReorderSuccess: () => void;
}) {
  const toast = useToast();
  const [draggedStage, setDraggedStage] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Группируем этапы по категориям
  const tenderDeptStages = stages.filter(s => s.category === 'tender_dept' && !s.name.startsWith('ЗМО:'));
  const zmoStages = stages.filter(s => s.category === 'tender_dept' && s.name.startsWith('ЗМО:'));
  const realizationStages = stages.filter(s => s.category === 'realization');
  const archiveStages = stages.filter(s => s.category === 'archive');

  const handleDragStart = (e: DragEvent<HTMLTableRowElement>, stageId: string) => {
    setDraggedStage(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLTableRowElement>, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: DragEvent<HTMLTableRowElement>, targetStageId: string, category: string) => {
    e.preventDefault();
    if (!draggedStage || draggedStage === targetStageId) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    // Находим этапы в той же категории
    const categoryStages = stages.filter(s => s.category === category);
    const draggedIndex = categoryStages.findIndex(s => s.id === draggedStage);
    const targetIndex = categoryStages.findIndex(s => s.id === targetStageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    // Создаём новый массив с перемещённым элементом
    const newCategoryStages = [...categoryStages];
    const [movedStage] = newCategoryStages.splice(draggedIndex, 1);
    newCategoryStages.splice(targetIndex, 0, movedStage);

    // Обновляем order_index для всех этапов в категории
    const updatedCategoryStages = newCategoryStages.map((stage, idx) => ({
      ...stage,
      order_index: idx + 1
    }));

    // Обновляем состояние оптимистично
    const otherStages = stages.filter(s => s.category !== category);
    const newStages = [...otherStages, ...updatedCategoryStages].sort((a, b) => {
      if (a.category !== b.category) {
        const order = { tender_dept: 1, realization: 2, archive: 3 };
        return (order[a.category as keyof typeof order] || 0) - (order[b.category as keyof typeof order] || 0);
      }
      return (a.order_index || 0) - (b.order_index || 0);
    });
    onReorder(newStages);

    // Отправляем обновления на сервер
    try {
      console.log('Updating stage order:', updatedCategoryStages.map(s => ({ id: s.id, name: s.name, order_index: s.order_index })));
      
      // ВАЖНО: Из-за UNIQUE constraint на (company_id, category, order_index)
      // нужно сначала установить временные значения, чтобы избежать конфликтов
      
      // Шаг 1: Устанавливаем временные order_index (большие положительные числа)
      console.log('Step 1: Setting temporary order_index values...');
      for (let i = 0; i < updatedCategoryStages.length; i++) {
        const stage = updatedCategoryStages[i];
        const tempOrderIndex = 10000 + i; // 10000, 10001, 10002, ...
        
        const response = await fetch(`/api/tenders/stages/${stage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: tempOrderIndex }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to set temp order for ${stage.name}:`, response.status, errorText);
          throw new Error(`Failed to update stage: ${stage.name}`);
        }
      }

      // Шаг 2: Устанавливаем финальные order_index
      console.log('Step 2: Setting final order_index values...');
      for (const stage of updatedCategoryStages) {
        const response = await fetch(`/api/tenders/stages/${stage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: stage.order_index }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to set final order for ${stage.name}:`, response.status, errorText);
          throw new Error(`Failed to update stage: ${stage.name}`);
        }
      }

      console.log('Stage order updated successfully');
      notifyStagesUpdated(); // Уведомляем об обновлении порядка
      onReorderSuccess();
    } catch (error) {
      console.error('Error updating stage order:', error);
      toast.show('Ошибка при сохранении порядка этапов', { type: 'error' });
      // В случае ошибки можно откатить изменения
      // setStages(stages);
    }

    setDraggedStage(null);
    setDragOverStage(null);
  };

  const renderStageGroup = (groupStages: Stage[], title: string, icon: string, category: string) => {
    if (groupStages.length === 0) return null;
    
    return (
      <div className={styles.stageGroup} key={title}>
        <h3 className={styles.groupTitle}>
          <span>{icon}</span> {title}
        </h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>⋮⋮</th>
              <th>Название</th>
              <th style={{ width: '60px' }}>Цвет</th>
              <th style={{ width: '100px' }}>Активен</th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {groupStages.map((stage: Stage) => {
              const isSystemStage = stage.is_system || stage.name.startsWith('ЗМО:');
              return (
              <tr
                key={stage.id}
                draggable={!isSystemStage}
                onDragStart={(e) => !isSystemStage && handleDragStart(e, stage.id)}
                onDragOver={(e) => !isSystemStage && handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => !isSystemStage && handleDrop(e, stage.id, category)}
                className={`${!isSystemStage ? styles.draggableRow : ''} ${draggedStage === stage.id ? styles.dragging : ''} ${dragOverStage === stage.id ? styles.dragOver : ''}`}
                style={{ cursor: isSystemStage ? 'default' : 'move' }}
              >
                <td>
                  {!isSystemStage && (
                    <span className={styles.dragHandle}>⋮⋮</span>
                  )}
                  {isSystemStage && (
                    <span style={{ 
                      fontSize: '18px',
                      filter: stage.name.startsWith('ЗМО:')
                        ? 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))'
                        : 'drop-shadow(0 2px 4px rgba(245, 87, 108, 0.3))'
                    }}>🔒</span>
                  )}
                </td>
                <td>
                  <div className={styles.stageName}>
                    <span className={styles.stageIcon}>📌</span>
                    {stage.name}
                  </div>
                </td>
                <td>
                  <div
                    className={styles.colorPreview}
                    style={{ backgroundColor: stage.color || '#3b82f6' }}
                  />
                </td>
                <td>
                  <span className={stage.is_active ? styles.statusActive : styles.statusInactive}>
                    {stage.is_active ? '✓' : '✗'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button 
                      onClick={() => onToggleHidden(stage.id, !stage.is_hidden)} 
                      className={styles.iconButton} 
                      title={stage.is_hidden ? "Показать этап" : "Скрыть этап"}
                      style={{ opacity: stage.is_hidden ? 0.5 : 1 }}
                    >
                      {stage.is_hidden ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                    {!stage.is_system && !stage.name.startsWith('ЗМО:') && (
                      <>
                        <button onClick={() => onEdit(stage)} className={styles.iconButton} title="Редактировать">
                          ✏️
                        </button>
                        <button onClick={() => onDelete(stage.id)} className={styles.iconButton} title="Удалить">
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Управление этапами</h2>
        <button onClick={onAdd} className={styles.primaryButton}>
          ➕ Добавить этап
        </button>
      </div>

      {renderStageGroup(tenderDeptStages, 'Предконтрактные этапы (системные)', '📋', 'tender_dept')}
      {zmoStages.length > 0 && renderStageGroup(zmoStages, 'Этапы ЗМО', '🏥', 'tender_dept')}
      {renderStageGroup(realizationStages, 'Этапы реализации', '🚚', 'realization')}
      {renderStageGroup(archiveStages, 'Архивные этапы', '📦', 'archive')}

      {stages.length === 0 && (
        <div className={styles.emptyState}>
          <p>Этапы не созданы</p>
          <p className={styles.emptyHint}>Нажмите &quot;Добавить этап&quot; чтобы создать первый этап</p>
        </div>
      )}

      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>💡</div>
        <div>
          <strong>Совет:</strong> Перетаскивайте этапы мышкой для изменения порядка внутри каждой группы.
        </div>
      </div>
    </div>
  );
}

function TypesTab({ types, onAdd, onEdit, onDelete }: {
  types: TenderType[];
  onAdd: () => void;
  onEdit: (type: TenderType) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Типы тендеров</h2>
        <button onClick={onAdd} className={styles.primaryButton}>
          ➕ Добавить тип
        </button>
      </div>

      <div className={styles.grid}>
        {types.map((type: TenderType) => (
          <div key={type.id} className={styles.typeCard}>
            <div className={styles.typeHeader}>
              <h3 className={styles.typeName}>
                {type.name}
                {type.is_system && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                    системный
                  </span>
                )}
              </h3>
              <div className={styles.typeActions}>
                <button onClick={() => onEdit(type)} className={styles.iconButton} title="Редактировать">
                  ✏️
                </button>
                {!type.is_system && (
                  <button onClick={() => onDelete(type.id)} className={styles.iconButton} title="Удалить">
                    🗑️
                  </button>
                )}
              </div>
            </div>
            {type.description && <p className={styles.typeDescription}>{type.description}</p>}
            <div className={styles.typeFooter}>
              <span className={styles.typeCount}>📊 Используется в тендерах</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneralTab<T extends Record<string, boolean>>({ settings, onToggle, saving }: {
  settings: T;
  onToggle: (key: keyof T) => void;
  saving: boolean;
}) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Основные настройки</h2>
        {saving && <span className={styles.savingIndicator}>💾 Сохранение...</span>}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Управление перемещением тендеров</h3>

        <div className={styles.settingsList}>
          <SettingItem
            icon="⬅️"
            label="Разрешить перемещение назад"
            description="Разрешить перемещать тендеры на предыдущие этапы (по умолчанию только вперёд)"
            checked={settings.allow_backward_movement}
            onChange={() => onToggle('allow_backward_movement')}
          />
        </div>
      </div>
    </div>
  );
}

function NotificationsTab<T extends Record<string, boolean>>({ settings, onToggle, saving }: {
  settings: T;
  onToggle: (key: keyof T) => void;
  saving: boolean;
}) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Настройки уведомлений</h2>
        {saving && <span className={styles.savingIndicator}>💾 Сохранение...</span>}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>События для уведомлений</h3>

        <div className={styles.settingsList}>
          <SettingItem
            icon="⏰"
            label="Напоминания о дедлайнах"
            description="Уведомления за 24 часа до истечения срока подачи"
            checked={settings.deadline_reminder}
            onChange={() => onToggle('deadline_reminder')}
          />
          <SettingItem
            icon="🔄"
            label="Изменение этапа"
            description="Уведомления при перемещении тендера на новый этап"
            checked={settings.stage_change}
            onChange={() => onToggle('stage_change')}
          />
          <SettingItem
            icon="➕"
            label="Новый тендер"
            description="Уведомления о добавлении нового тендера"
            checked={settings.new_tender}
            onChange={() => onToggle('new_tender')}
          />
          <SettingItem
            icon="📄"
            label="Истечение документов"
            description="Уведомления об истекающих сроках действия документов"
            checked={settings.document_expiry}
            onChange={() => onToggle('document_expiry')}
          />
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Каналы уведомлений</h3>

        <div className={styles.settingsList}>
          <SettingItem
            icon="📧"
            label="Email уведомления"
            description="Отправка уведомлений на электронную почту"
            checked={settings.email_notifications}
            onChange={() => onToggle('email_notifications')}
          />
          <SettingItem
            icon="💬"
            label="Telegram уведомления"
            description="Отправка уведомлений в Telegram"
            checked={settings.telegram_notifications}
            onChange={() => onToggle('telegram_notifications')}
          />
        </div>
      </div>
    </div>
  );
}

function SettingItem({ icon, label, description, checked, onChange }: {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingInfo}>
        <div className={styles.settingLabel}>
          <span className={styles.settingIcon}>{icon}</span>
          {label}
        </div>
        <p className={styles.settingDescription}>{description}</p>
      </div>
      <label className={styles.toggle}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={styles.toggleSlider}></span>
      </label>
    </div>
  );
}

function AutomationTab() {
  const [allowFreeMovement, setAllowFreeMovement] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('allowFreeMovement') === 'true';
    }
    return false;
  });

  const handleToggleFreeMovement = (checked: boolean) => {
    setAllowFreeMovement(checked);
    localStorage.setItem('allowFreeMovement', String(checked));
  };

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Правила автоматизации</h2>

      {/* Свободное перемещение тендеров */}
      <div className={styles.card}>
        <div className={styles.settingRow}>
          <div className={styles.settingContent}>
            <h3 className={styles.cardTitle}>🔓 Свободное перемещение тендеров</h3>
            <p className={styles.cardDescription}>
              Разрешить перемещение тендеров в любой этап через меню действий (три точки) на карточках
            </p>
          </div>
          <label className={styles.toggle}>
            <input 
              type="checkbox" 
              checked={allowFreeMovement}
              onChange={(e) => handleToggleFreeMovement(e.target.checked)}
            />
            <span className={styles.toggleSlider}></span>
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Автоматическое перемещение</h3>
        <p className={styles.cardDescription}>
          Настройте правила для автоматического перемещения тендеров между этапами
        </p>

        <div className={styles.rulesList}>
          <div className={styles.ruleItem}>
            <div className={styles.ruleIcon}>⏰</div>
            <div className={styles.ruleContent}>
              <h4 className={styles.ruleTitle}>Истёк срок подачи</h4>
              <p className={styles.ruleDescription}>Если дедлайн истёк → переместить в &quot;Не подано&quot;</p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.ruleItem}>
            <div className={styles.ruleIcon}>📄</div>
            <div className={styles.ruleContent}>
              <h4 className={styles.ruleTitle}>Все документы загружены</h4>
              <p className={styles.ruleDescription}>Если все документы готовы → переместить в &quot;Подача&quot;</p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>

        <button className={styles.secondaryButton}>➕ Добавить правило</button>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Автоназначение ответственных</h3>
        <p className={styles.cardDescription}>Автоматическое назначение менеджеров и специалистов</p>

        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>🚧</div>
          <div>
            Функция в разработке. Скоро здесь можно будет настроить правила автоматического назначения
            ответственных лиц.
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Шаблоны документов</h2>
        <button className={styles.primaryButton}>➕ Создать шаблон</button>
      </div>

      <div className={styles.grid}>
        <TemplateCard
          icon="📄"
          title="Заявка на участие"
          description="Стандартный шаблон заявки для участия в тендере"
        />
        <TemplateCard
          icon="📋"
          title="Коммерческое предложение"
          description="Шаблон для формирования КП"
        />
        <TemplateCard icon="📊" title="Отчёт по тендеру" description="Шаблон итогового отчёта" />
      </div>
    </div>
  );
}

function TemplateCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.templateCard}>
      <div className={styles.templateIcon}>{icon}</div>
      <h3 className={styles.templateTitle}>{title}</h3>
      <p className={styles.templateDescription}>{description}</p>
      <div className={styles.templateActions}>
        <button className={styles.secondaryButton}>Редактировать</button>
        <button className={styles.iconButton}>⋮</button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Внешние интеграции</h2>

      <div className={styles.grid}>
        <IntegrationCard
          icon="🌐"
          title="ЕИС (zakupki.gov.ru)"
          description="Автоматический импорт тендеров из Единой информационной системы"
          connected={false}
        />
        <IntegrationCard
          icon="📧"
          title="Email"
          description="Отправка уведомлений и документов по электронной почте"
          connected={true}
        />
        <IntegrationCard
          icon="💬"
          title="Telegram"
          description="Уведомления и управление через Telegram бота"
          connected={false}
        />
        <IntegrationCard
          icon="📊"
          title="1С"
          description="Синхронизация с 1С: Бухгалтерия и Управление торговлей"
          connected={false}
        />
      </div>
    </div>
  );
}

function IntegrationCard({ icon, title, description, connected }: {
  icon: string;
  title: string;
  description: string;
  connected: boolean;
}) {
  return (
    <div className={styles.integrationCard}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationIcon}>{icon}</div>
        <h3 className={styles.integrationTitle}>{title}</h3>
      </div>
      <p className={styles.integrationDescription}>{description}</p>
      <div className={styles.integrationStatus}>
        <span className={connected ? styles.statusActive : styles.statusInactive}>
          {connected ? 'Подключено' : 'Не подключено'}
        </span>
      </div>
      <button className={connected ? styles.secondaryButton : styles.primaryButton}>Настроить</button>
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmHeader}>
          <h3 className={styles.confirmTitle}>⚠️ {title}</h3>
        </div>
        <div className={styles.confirmBody}>{message}</div>
        <div className={styles.confirmFooter}>
          <button onClick={onCancel} className={styles.secondaryButton}>
            Отмена
          </button>
          <button onClick={onConfirm} className={styles.dangerButton}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
