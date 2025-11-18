'use client';

import { TenderStageTemplate, TenderStage } from '@/lib/tenders/types';
import styles from '@/app/(protected)/tenders/settings/tender-settings.module.css';

interface StageTemplatesTabProps {
  templates: TenderStageTemplate[];
  stages: TenderStage[];
  onAdd: () => void;
  onEdit: (template: TenderStageTemplate) => void;
  onDelete: (id: string) => void;
}

export function StageTemplatesTab({ templates, stages, onAdd, onEdit, onDelete }: StageTemplatesTabProps) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Шаблоны наборов этапов</h2>
        <button onClick={onAdd} className={styles.primaryButton}>
          ➕ Создать шаблон
        </button>
      </div>

      {templates.length === 0 ? (
        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
              Нет созданных шаблонов
            </p>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>
              Создайте шаблоны этапов (например «ФЗ-44», «ЗМО») для быстрого применения к тендерам
            </p>
            <button onClick={onAdd} className={styles.primaryButton}>
              ➕ Создать первый шаблон
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map((template) => (
            <div key={template.id} className={styles.typeCard}>
              <div className={styles.typeHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{template.icon}</span>
                  <div>
                    <div className={styles.typeName}>{template.name}</div>
                    {template.description && (
                      <div className={styles.typeDescription}>{template.description}</div>
                    )}
                  </div>
                </div>
                <div className={styles.typeActions}>
                  {!template.is_system && (
                    <>
                      <button
                        onClick={() => onEdit(template)}
                        className={styles.iconButton}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(template.id)}
                        className={styles.iconButton}
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {template.is_system && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                      🔒 Системный
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                  ЭТАПЫ В ШАБЛОНЕ ({template.items?.length || 0})
                </div>
                {template.items && template.items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {template.items
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((item, index) => {
                        const stage = stages.find(s => s.id === item.stage_id);
                        if (!stage) return null;
                        
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              background: '#f8fafc',
                              borderRadius: '4px',
                              fontSize: '13px',
                            }}
                          >
                            <span style={{ color: '#94a3b8', minWidth: '20px' }}>
                              {index + 1}.
                            </span>
                            <span style={{ flex: 1 }}>{stage.name}</span>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                backgroundColor: stage.color || '#3b82f6',
                                border: '1px solid #e2e8f0',
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Этапы не выбраны
                  </div>
                )}
              </div>

              <div className={styles.typeFooter}>
                <span className={styles.typeCount}>
                  {template.is_active ? '✓ Активен' : '✗ Неактивен'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
