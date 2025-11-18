'use client';

import { useState } from 'react';
import styles from './tender-settings.module.css';

type TabType = 'stages' | 'types' | 'notifications' | 'automation' | 'templates' | 'integrations';

interface Stage {
  id: string;
  name: string;
  category?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
}

interface TenderType {
  id: string;
  name: string;
  description?: string;
}

interface TenderSettingsClientProps {
  stages: Stage[];
  types: TenderType[];
}

export function TenderSettingsClient({ stages, types }: TenderSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stages');

  const tabs = [
    { id: 'stages' as TabType, label: 'Этапы', icon: '📊' },
    { id: 'types' as TabType, label: 'Типы тендеров', icon: '🏷️' },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: '🔔' },
    { id: 'automation' as TabType, label: 'Автоматизация', icon: '⚡' },
    { id: 'templates' as TabType, label: 'Шаблоны', icon: '📄' },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: '🔗' },
  ];

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
        {activeTab === 'stages' && <StagesTab stages={stages} />}
        {activeTab === 'types' && <TypesTab types={types} />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'automation' && <AutomationTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}

// Вкладка "Этапы"
function StagesTab({ stages }: { stages: Stage[] }) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Управление этапами</h2>
        <button className={styles.primaryButton}>
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
            {stages.map((stage) => (
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
                  <div className={styles.colorPreview} style={{ backgroundColor: stage.color || '#3b82f6' }} />
                </td>
                <td>
                  <span className={stage.is_active ? styles.statusActive : styles.statusInactive}>
                    {stage.is_active ? '✓ Активен' : '✗ Неактивен'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.iconButton} title="Редактировать">
                      ✏️
                    </button>
                    <button className={styles.iconButton} title="Переместить вверх">
                      ⬆️
                    </button>
                    <button className={styles.iconButton} title="Переместить вниз">
                      ⬇️
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

// Вкладка "Типы тендеров"
function TypesTab({ types }: { types: TenderType[] }) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Типы тендеров</h2>
        <button className={styles.primaryButton}>
          ➕ Добавить тип
        </button>
      </div>

      <div className={styles.grid}>
        {types.map((type) => (
          <div key={type.id} className={styles.typeCard}>
            <div className={styles.typeHeader}>
              <h3 className={styles.typeName}>{type.name}</h3>
              <button className={styles.iconButton}>⋮</button>
            </div>
            {type.description && (
              <p className={styles.typeDescription}>{type.description}</p>
            )}
            <div className={styles.typeFooter}>
              <span className={styles.typeCount}>
                📊 Используется в тендерах
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Вкладка "Уведомления"
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
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Настройки уведомлений</h2>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>События для уведомлений</h3>
        
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>⏰</span>
                Напоминания о дедлайнах
              </div>
              <p className={styles.settingDescription}>
                Уведомления за 24 часа до истечения срока подачи
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.deadlineReminder}
                onChange={() => toggleSetting('deadlineReminder')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🔄</span>
                Изменение этапа
              </div>
              <p className={styles.settingDescription}>
                Уведомления при перемещении тендера на новый этап
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.stageChange}
                onChange={() => toggleSetting('stageChange')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>➕</span>
                Новый тендер
              </div>
              <p className={styles.settingDescription}>
                Уведомления о добавлении нового тендера
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.newTender}
                onChange={() => toggleSetting('newTender')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>📄</span>
                Истечение документов
              </div>
              <p className={styles.settingDescription}>
                Уведомления об истекающих сроках действия документов
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.documentExpiry}
                onChange={() => toggleSetting('documentExpiry')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Каналы уведомлений</h3>
        
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>📧</span>
                Email уведомления
              </div>
              <p className={styles.settingDescription}>
                Отправка уведомлений на электронную почту
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => toggleSetting('emailNotifications')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>💬</span>
                Telegram уведомления
              </div>
              <p className={styles.settingDescription}>
                Отправка уведомлений в Telegram
              </p>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.telegramNotifications}
                onChange={() => toggleSetting('telegramNotifications')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Вкладка "Автоматизация"
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
              <p className={styles.ruleDescription}>
                Если дедлайн истёк → переместить в &ldquo;Не подано&rdquo;
              </p>
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
              <p className={styles.ruleDescription}>
                Если все документы готовы → переместить в &ldquo;Подача&rdquo;
              </p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>

        <button className={styles.secondaryButton}>
          ➕ Добавить правило
        </button>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Автоназначение ответственных</h3>
        <p className={styles.cardDescription}>
          Автоматическое назначение менеджеров и специалистов
        </p>
        
        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>🚧</div>
          <div>
            Функция в разработке. Скоро здесь можно будет настроить правила 
            автоматического назначения ответственных лиц.
          </div>
        </div>
      </div>
    </div>
  );
}

// Вкладка "Шаблоны"
function TemplatesTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Шаблоны документов</h2>
        <button className={styles.primaryButton}>
          ➕ Создать шаблон
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.templateCard}>
          <div className={styles.templateIcon}>📄</div>
          <h3 className={styles.templateTitle}>Заявка на участие</h3>
          <p className={styles.templateDescription}>
            Стандартный шаблон заявки для участия в тендере
          </p>
          <div className={styles.templateActions}>
            <button className={styles.secondaryButton}>Редактировать</button>
            <button className={styles.iconButton}>⋮</button>
          </div>
        </div>

        <div className={styles.templateCard}>
          <div className={styles.templateIcon}>📋</div>
          <h3 className={styles.templateTitle}>Коммерческое предложение</h3>
          <p className={styles.templateDescription}>
            Шаблон для формирования КП
          </p>
          <div className={styles.templateActions}>
            <button className={styles.secondaryButton}>Редактировать</button>
            <button className={styles.iconButton}>⋮</button>
          </div>
        </div>

        <div className={styles.templateCard}>
          <div className={styles.templateIcon}>📊</div>
          <h3 className={styles.templateTitle}>Отчёт по тендеру</h3>
          <p className={styles.templateDescription}>
            Шаблон итогового отчёта
          </p>
          <div className={styles.templateActions}>
            <button className={styles.secondaryButton}>Редактировать</button>
            <button className={styles.iconButton}>⋮</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Вкладка "Интеграции"
function IntegrationsTab() {
  return (
    <div className={styles.tabContent}>
      <h2 className={styles.sectionTitle}>Внешние интеграции</h2>

      <div className={styles.grid}>
        <div className={styles.integrationCard}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationIcon}>🌐</div>
            <h3 className={styles.integrationTitle}>ЕИС (zakupki.gov.ru)</h3>
          </div>
          <p className={styles.integrationDescription}>
            Автоматический импорт тендеров из Единой информационной системы
          </p>
          <div className={styles.integrationStatus}>
            <span className={styles.statusInactive}>Не подключено</span>
          </div>
          <button className={styles.primaryButton}>Настроить</button>
        </div>

        <div className={styles.integrationCard}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationIcon}>📧</div>
            <h3 className={styles.integrationTitle}>Email</h3>
          </div>
          <p className={styles.integrationDescription}>
            Отправка уведомлений и документов по электронной почте
          </p>
          <div className={styles.integrationStatus}>
            <span className={styles.statusActive}>Подключено</span>
          </div>
          <button className={styles.secondaryButton}>Настроить</button>
        </div>

        <div className={styles.integrationCard}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationIcon}>💬</div>
            <h3 className={styles.integrationTitle}>Telegram</h3>
          </div>
          <p className={styles.integrationDescription}>
            Уведомления и управление через Telegram бота
          </p>
          <div className={styles.integrationStatus}>
            <span className={styles.statusInactive}>Не подключено</span>
          </div>
          <button className={styles.primaryButton}>Настроить</button>
        </div>

        <div className={styles.integrationCard}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationIcon}>📊</div>
            <h3 className={styles.integrationTitle}>1С</h3>
          </div>
          <p className={styles.integrationDescription}>
            Синхронизация с 1С: Бухгалтерия и Управление торговлей
          </p>
          <div className={styles.integrationStatus}>
            <span className={styles.statusInactive}>Не подключено</span>
          </div>
          <button className={styles.primaryButton}>Настроить</button>
        </div>
      </div>
    </div>
  );
}
