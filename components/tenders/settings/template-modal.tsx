'use client';

import { useState, useEffect } from 'react';
import styles from './modals.module.css';
import { TenderStage } from '@/lib/tenders/types';

interface TemplateData {
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  stage_ids: string[];
}

interface TemplateModalProps {
  template?: Partial<TemplateData> & { id?: string; items?: { stage_id: string }[]; is_system?: boolean };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TemplateData) => Promise<void>;
  stages: TenderStage[];
}

export function TemplateModal({ template, isOpen, onClose, onSave, stages }: TemplateModalProps) {
  const [formData, setFormData] = useState<TemplateData>({
    name: '',
    description: '',
    icon: '📋',
    is_active: true,
    stage_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Группируем этапы по категориям
  const tenderDeptStages = stages.filter(s => s.category === 'tender_dept');
  const realizationStages = stages.filter(s => s.category === 'realization');
  const archiveStages = stages.filter(s => s.category === 'archive');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        icon: template.icon || '📋',
        is_active: template.is_active !== undefined ? template.is_active : true,
        stage_ids: template.items?.map(item => item.stage_id) || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '📋',
        is_active: true,
        stage_ids: [],
      });
    }
    setError('');
  }, [template, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Название шаблона обязательно');
      return;
    }

    if (formData.stage_ids.length === 0) {
      setError('Выберите хотя бы один этап');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId: string) => {
    setFormData(prev => ({
      ...prev,
      stage_ids: prev.stage_ids.includes(stageId)
        ? prev.stage_ids.filter(id => id !== stageId)
        : [...prev.stage_ids, stageId]
    }));
  };

  const moveStageUp = (index: number) => {
    if (index === 0) return;
    const newIds = [...formData.stage_ids];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setFormData(prev => ({ ...prev, stage_ids: newIds }));
  };

  const moveStageDown = (index: number) => {
    if (index === formData.stage_ids.length - 1) return;
    const newIds = [...formData.stage_ids];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setFormData(prev => ({ ...prev, stage_ids: newIds }));
  };

  const renderStageGroup = (groupStages: TenderStage[], title: string, icon: string) => {
    if (groupStages.length === 0) return null;
    
    return (
      <div key={title} style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>
          {icon} {title}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {groupStages.map(stage => (
            <label
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: formData.stage_ids.includes(stage.id) ? '#eff6ff' : 'transparent',
                border: formData.stage_ids.includes(stage.id) ? '1px solid #3b82f6' : '1px solid #e2e8f0',
              }}
            >
              <input
                type="checkbox"
                checked={formData.stage_ids.includes(stage.id)}
                onChange={() => toggleStage(stage.id)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', flex: 1 }}>{stage.name}</span>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: stage.color || '#3b82f6',
                  border: '1px solid #e2e8f0',
                }}
              />
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const selectedStages = formData.stage_ids
    .map(id => stages.find(s => s.id === id))
    .filter(Boolean) as TenderStage[];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {template ? 'Редактировать шаблон' : 'Создать шаблон этапов'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage}>
              ⚠️ {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Название шаблона <span className={styles.required}>*</span>
              {template?.is_system && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                  (системный шаблон)
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              placeholder="Например: ФЗ-44, ЗМО, Коммерческие"
              required
              readOnly={template?.is_system}
              disabled={template?.is_system}
              style={template?.is_system ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}}
            />
            <p className={styles.hint}>
              {template?.is_system 
                ? 'Название системного шаблона нельзя изменить' 
                : 'Краткое название для быстрого выбора'
              }
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.input}
              placeholder="Например: Этапы для тендеров по ФЗ-44"
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Иконка</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className={styles.input}
              placeholder="📋"
              maxLength={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Доступные этапы <span className={styles.required}>*</span>
              </label>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {renderStageGroup(tenderDeptStages, 'Предконтрактные', '📋')}
                {renderStageGroup(realizationStages, 'Реализация', '🚀')}
                {renderStageGroup(archiveStages, 'Архивные', '📦')}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Выбранные этапы ({selectedStages.length})
              </label>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {selectedStages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px' }}>
                    Выберите этапы слева
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedStages.map((stage, index) => (
                      <div
                        key={stage.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          borderRadius: '4px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#64748b', minWidth: '24px' }}>
                          {index + 1}.
                        </span>
                        <span style={{ fontSize: '14px', flex: 1 }}>{stage.name}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => moveStageUp(index)}
                            disabled={index === 0}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: 'none',
                              background: 'none',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.3 : 1,
                            }}
                          >
                            ⬆️
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStageDown(index)}
                            disabled={index === selectedStages.length - 1}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: 'none',
                              background: 'none',
                              cursor: index === selectedStages.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === selectedStages.length - 1 ? 0.3 : 1,
                            }}
                          >
                            ⬇️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Шаблон активен</span>
            </label>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.secondaryButton}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
