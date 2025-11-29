'use client';

import { useState } from 'react';
import type { Tender, TenderType, TenderStageTemplate, TenderStage } from '@/lib/tenders/types';
import { TenderInfoTab } from './tender-info-tab';
import { TenderTasksTab } from './tender-tasks-tab';
import { TenderFilesTab } from './tender-files-tab';
import { TenderCostsTab } from './tender-costs-tab';
import { TenderContactsTab } from './tender-contacts-tab';
import { TenderCommentsSection } from './TenderCommentsSection';
import { TenderHistory } from './tender-history';
import styles from './tender-detail-tabs.module.css';

interface TenderDetailTabsProps {
  tender: Tender;
  stages: TenderStage[];
  types: TenderType[];
  templates?: TenderStageTemplate[];
  employees?: Array<{ id: string; full_name: string; role?: string }>;
  onUpdate: () => void;
}

type TabType = 'info' | 'tasks' | 'files' | 'costs' | 'contacts' | 'comments' | 'history';

const ARCHIVED_STAGE_NAMES = [
  'Не участвуем',
  'Не прошло проверку',
  'Не подано',
  'Проиграли',
  'Договор не заключен',
];

const normalizeStageName = (name?: string | null) => (name || '').trim().toLowerCase();

export function TenderDetailTabs({ tender, stages, types, templates = [], employees = [], onUpdate }: TenderDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [commentsCount, setCommentsCount] = useState<number>(0);

  const isArchivedStage = ARCHIVED_STAGE_NAMES
    .map(name => normalizeStageName(name))
    .includes(normalizeStageName(tender.stage?.name));

  const tabs = isArchivedStage
    ? [
      { id: 'info' as const, label: 'Основная информация' },
      { id: 'comments' as const, label: `Комментарии${commentsCount > 0 ? ` (${commentsCount})` : ''}` },
      { id: 'history' as const, label: 'История' },
    ]
    : [
      { id: 'info' as const, label: 'Основная информация' },
      { id: 'tasks' as const, label: 'Задачи' },
      { id: 'files' as const, label: 'Файлы' },
      { id: 'costs' as const, label: 'Затраты по контракту' },
      { id: 'contacts' as const, label: 'Контакты контрагентов' },
      { id: 'comments' as const, label: `Комментарии${commentsCount > 0 ? ` (${commentsCount})` : ''}` },
      { id: 'history' as const, label: 'История' },
    ];

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'info' && (
          <TenderInfoTab
            tender={tender}
            types={types}
            templates={templates}
            employees={employees}
            onUpdate={onUpdate}
            isArchived={isArchivedStage}
          />
        )}
        {!isArchivedStage && activeTab === 'tasks' && <TenderTasksTab tender={tender} />}
        {!isArchivedStage && activeTab === 'files' && <TenderFilesTab tender={tender} />}
        {!isArchivedStage && activeTab === 'costs' && <TenderCostsTab tender={tender} onUpdate={onUpdate} />}
        {!isArchivedStage && activeTab === 'contacts' && <TenderContactsTab tender={tender} onUpdate={onUpdate} />}
        {activeTab === 'comments' && (
          <TenderCommentsSection
            tenderId={tender.id}
            onCountChange={setCommentsCount}
          />
        )}
        {activeTab === 'history' && (
          <TenderHistory tenderId={tender.id} stages={stages} />
        )}
      </div>
    </div>
  );
}
