'use client';

import { useState } from 'react';
import { StageModal } from '@/components/tenders/settings/stage-modal';
import { TypeModal } from '@/components/tenders/settings/type-modal';
import styles from './tender-settings.module.css';

type TabType = 'stages' | 'types' | 'notifications' | 'automation' | 'templates' | 'integrations';

interface Stage {
  id: string;
  name: string;
  category?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
  is_final?: boolean;
}

interface TenderType {
  id: string;
  name: string;
  description?: string;
}

interface TenderSettingsFullProps {
  initialStages: Stage[];
  initialTypes: TenderType[];
}

export function TenderSettingsFull({ initialStages, initialTypes }: TenderSettingsFullProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stages');
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [types, setTypes] = useState<TenderType[]>(initialTypes);
  
  // Модальные окна
  const [stageModal, setStageModal] = useState<{ isOpen: boolean; stage?: Stage }>({ isOpen: false });
  const [typeModal, setTypeModal] = useState<{ isOpen: boolean; type?: TenderType }>({ isOpen: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string; type?: 'stage' | 'type' }>({ isOpen: false });

  const tabs = [
    { id: 'stages' as TabType, label: 'Этапы', icon: '📊' },
    { id: 'types' as TabType, label: 'Типы тендеров', icon: '🏷️' },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: '🔔' },
    { id: 'automation' as TabType, label: 'Автоматизация', icon: '⚡' },
    { id: 'templates' as TabType, label: 'Шаблоны', icon: '📄' },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: '🔗' },
  ];

  // Обработчики для этапов
  const handleSaveStage = async (data: Partial<Stage>) => {
    try {
      if (stageModal.stage) {
        // Обновление
        const response = await fetch(`/api/tenders/stages/${stageModal.stage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Ошибка при обновлении этапа');

        const result = await response.json();
        setStages(stages.map(s => s.id === stageModal.stage?.id ? result.data : s));
      } else {
        // Создание
        const response = await fetch('/api/tenders/stages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Ошибка при создании этапа');

        const result = await response.json();
        setStages([...stages, result.data]);
      }
    } catch (error) {
      console.error('Error saving stage:', error);
      throw error;
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      const response = await fetch(`/api/tenders/stages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Ошибка при удалении этапа');

      setStages(stages.filter(s => s.id !== id));
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert('Ошибка при удалении этапа');
    }
  };

  const handleMoveStage = async (id: string, direction: 'up' | 'down') => {
    const index = stages.findIndex(s => s.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStages = [...stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];

    // Обновляем order_index
    const updates = newStages.map((stage, idx) => ({
      id: stage.id,
      order_index: idx + 1,
    }));

    try {
      // Обновляем на сервере
      await Promise.all(
        updates.map(update =>
          fetch(`/api/tenders/stages/${update.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: update.order_index }),
          })
        )
      );

      setStages(newStages.map((stage, idx) => ({ ...stage, order_index: idx + 1 })));
    } catch (error) {
      console.error('Error moving stage:', error);
      alert('Ошибка при перемещении этапа');
    }
  };

  // Обработчики для типов
  const handleSaveType = async (data: Partial<TenderType>) => {
    try {
      if (typeModal.type) {
        // Обновление
        const response = await fetch(`/api/tenders/types/${typeModal.type.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Ошибка при обновлении типа');

        const result = await response.json();
        setTypes(types.map(t => t.id === typeModal.type?.id ? result.data : t));
      } else {
        // Создание
        const response = await fetch('/api/tenders/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Ошибка при создании типа');

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
      const response = await fetch(`/api/tenders/types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Ошибка при удалении типа');

      setTypes(types.filter(t => t.id !== id));
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Ошибка при удалении типа');
    }
  };

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>⚙️ Настройки тендеров</h1>
          <p className={styles.subtitle}>
            Управление этапами, типами, уведомлениями и автоматизацией
          </p>
        </div>
      </div>

      {/* Вкладки */}
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

      {/* Контент вкладок */}
      <div className={styles.content}>
        {activeTab === 'stages' && (
          <StagesTab
            stages={stages}
            onAdd={() => setStageModal({ isOpen: true })}
            onEdit={(stage: Stage) => setStageModal({ isOpen: true, stage })}
            onDelete={(id: string) => setDeleteConfirm({ isOpen: true, id, type: 'stage' })}
            onMove={handleMoveStage}
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
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>

      {/* Модальные окна */}
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

      {/* Подтверждение удаления */}
      {deleteConfirm.isOpen && (
        <ConfirmDialog
          title="Подтверждение удаления"
          message={`Вы уверены, что хотите удалить этот ${deleteConfirm.type === 'stage' ? 'этап' : 'тип'}?`}
          onConfirm={() => {
            if (deleteConfirm.type === 'stage' && deleteConfirm.id) {
              handleDeleteStage(deleteConfirm.id);
            } else if (deleteConfirm.type === 'type' && deleteConfirm.id) {
              handleDeleteType(deleteConfirm.id);
            }
          }}
          onCancel={() => setDeleteConfirm({ isOpen: false })}
        />
      )}
    </div>
  );
}

// Компоненты вкладок
function StagesTab({ stages, onAdd, onEdit, onDelete, onMove }: {
  stages: Stage[];
  onAdd: () => void;
  onEdit: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Управление этапами</h2>
        <button onClick={onAdd} className={styles.primaryButton}>
          ➕ Добавить этап
        </button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Порядок</th>
              <th>Название</th>
              <th>Категория</th>
              <th>Цвет</th>
              <th>Активен</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage: Stage, index: number) => (
              <tr key={stage.id}>
                <td>{stage.order_index}</td>
                <td>
                  <div className={styles.stageName}>
                    <span className={styles.stageIcon}>📌</span>
                    {stage.name}
                  </div>
                </td>
                <td>
                  <span className={styles.badge}>
                    {stage.category === 'tender_dept' ? 'Предконтрактная' : 'Реализация'}
                  </span>
                </td>
                <td>
                  <div
                    className={styles.colorPreview}
                    style={{ backgroundColor: stage.color || '#3b82f6' }}
                  />
                </td>
                <td>
                  <span className={stage.is_active ? styles.statusActive : styles.statusInactive}>
                    {stage.is_active ? '✓ Активен' : '✗ Неактивен'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      onClick={() => onEdit(stage)}
                      className={styles.iconButton}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onMove(stage.id, 'up')}
                      className={styles.iconButton}
                      title="Переместить вверх"
                      disabled={index === 0}
                    >
                      ⬆️
                    </button>
                    <button
                      onClick={() => onMove(stage.id, 'down')}
                      className={styles.iconButton}
                      title="Переместить вниз"
                      disabled={index === stages.length - 1}
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => onDelete(stage.id)}
                      className={styles.iconButton}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>💡</div>
        <div>
          <strong>Совет:</strong> Порядок этапов определяет последовательность перемещения тендеров.
          Используйте стрелки для изменения порядка.
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
              <h3 className={styles.typeName}>{type.name}</h3>
              <div className={styles.typeActions}>
                <button
                  onClick={() => onEdit(type)}
                  className={styles.iconButton}
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(type.id)}
                  className={styles.iconButton}
                  title="Удалить"
                >
                  🗑️
                </button>
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

// Остальные вкладки (упрощенные версии из предыдущего кода)
function NotificationsTab() {
  const [settings, setSettings] = useState({
    deadlineReminder: true,
    stageChange: true,
    newTender: false,
    documentExpiry: true,
    emailNotifications: true,
    telegramNotifications: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Настройки уведомлений</h2>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>События для уведомлений</h3>

        <div className={styles.settingsList}>
          <SettingItem
            icon="⏰"
            label="Напоминания о дедлайнах"
            description="Уведомления за 24 часа до истечения срока подачи"
            checked={settings.deadlineReminder}
            onChange={() => toggleSetting('deadlineReminder')}
          />
          <SettingItem
            icon="🔄"
            label="Изменение этапа"
            description="Уведомления при перемещении тендера на новый этап"
            checked={settings.stageChange}
            onChange={() => toggleSetting('stageChange')}
          />
          <SettingItem
            icon="➕"
            label="Новый тендер"
            description="Уведомления о добавлении нового тендера"
            checked={settings.newTender}
            onChange={() => toggleSetting('newTender')}
          />
          <SettingItem
            icon="📄"
            label="Истечение документов"
            description="Уведомления об истекающих сроках действия документов"
            checked={settings.documentExpiry}
            onChange={() => toggleSetting('documentExpiry')}
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
            checked={settings.emailNotifications}
            onChange={() => toggleSetting('emailNotifications')}
          />
          <SettingItem
            icon="💬"
            label="Telegram уведомления"
            description="Отправка уведомлений в Telegram"
            checked={settings.telegramNotifications}
            onChange={() => toggleSetting('telegramNotifications')}
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
  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Правила автоматизации</h2>

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
          <h3 className={styles.confirmTitle}>
            ⚠️ {title}
          </h3>
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
