"use client";

import { useState, useEffect } from 'react';
import styles from './OnboardingChecklist.module.css';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  link?: string;
  completed: boolean;
}

/**
 * Чек-лист "Первые шаги" для новых пользователей
 * Показывается на дашборде пока не выполнены все пункты
 */
export default function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const checkTourSettings = async () => {
      try {
        // Проверяем настройки тура из API
        const response = await fetch('/api/settings/tour');
        if (response.ok) {
          const settings = await response.json();
          
          // Если туры отключены глобально - не показываем чек-лист
          if (!settings.enabled) {
            setIsVisible(false);
            setIsMounted(true);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load tour settings for checklist:', error);
      }
      
      // Если туры включены, проверяем localStorage
      const hidden = localStorage.getItem('onboarding_checklist_hidden') === 'true';
      
      if (!hidden) {
        setIsVisible(true);
      }
      
      setIsMounted(true);
      
      // Загружаем данные
      loadChecklist();
      
      // Проверяем каждые 2 секунды (для обновления прогресса)
      const interval = setInterval(loadChecklist, 2000);
      return () => clearInterval(interval);
    };
    
    checkTourSettings();
  }, []);

  const loadChecklist = async () => {
    try {
      // Проверяем прогресс из localStorage
      const saved = JSON.parse(localStorage.getItem('onboarding_checklist') || '{}');
      const hidden = localStorage.getItem('onboarding_checklist_hidden') === 'true';
      
      if (hidden) {
        setIsVisible(false);
        return;
      }

      // Проверяем реальный прогресс из БД
      const response = await fetch('/api/onboarding/progress');
      if (!response.ok) return;
      
      const progress = await response.json();

      const checklistItems: ChecklistItem[] = [
        {
          id: 'tour_completed',
          title: 'Пройти тур по приложению',
          description: 'Узнайте основные возможности FinApp',
          icon: '🗺️',
          completed: saved.tour_completed || false,
        },
        {
          id: 'account_created',
          title: 'Создать первый счёт',
          description: 'Добавьте карту или наличные',
          icon: '💳',
          link: '/cards',
          completed: progress.accounts > 0,
        },
        {
          id: 'transaction_created',
          title: 'Добавить первую транзакцию',
          description: 'Запишите доход или расход',
          icon: '💸',
          link: '/transactions',
          completed: progress.transactions > 0,
        },
        {
          id: 'category_created',
          title: 'Создать категорию',
          description: 'Настройте категории под себя',
          icon: '📂',
          link: '/budgets',
          completed: progress.categories > 0,
        },
        {
          id: 'budget_created',
          title: 'Установить бюджет',
          description: 'Контролируйте расходы по категориям',
          icon: '🎯',
          link: '/budgets',
          completed: progress.budgets > 0,
        },
        {
          id: 'ai_chat_used',
          title: 'Попробовать AI чат',
          description: 'Задайте вопрос или используйте команду',
          icon: '🤖',
          link: '/ai-chat',
          completed: progress.ai_messages > 0,
        },
      ];

      setItems(checklistItems);

      // Автоматически скрываем чек-лист если всё выполнено
      const allCompleted = checklistItems.every(item => item.completed);
      if (allCompleted && !hidden) {
        setTimeout(() => {
          setIsVisible(false);
          localStorage.setItem('onboarding_checklist_hidden', 'true');
        }, 3000); // Показываем "Поздравляем!" 3 секунды
      }
    } catch (error) {
      console.error('Failed to load checklist:', error);
    }
  };

  const handleItemClick = (item: ChecklistItem) => {
    if (item.link && !item.completed) {
      window.location.href = item.link;
    }
  };

  const handleHide = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_checklist_hidden', 'true');
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;

  // Не показываем компонент пока не проверили localStorage (предотвращает мигание)
  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <div className={`${styles.container} ${isMinimized ? styles.minimized : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>🚀 Первые шаги</h3>
          {!allCompleted && (
            <span className={styles.progress}>
              {completedCount} из {totalCount}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.minimizeBtn}
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Развернуть' : 'Свернуть'}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            className={styles.closeBtn}
            onClick={handleHide}
            title="Скрыть чек-лист"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {allCompleted ? (
            <div className={styles.congratulations}>
              <div className={styles.congratsIcon}>🎉</div>
              <h4>Поздравляем!</h4>
              <p>Вы освоили основы FinApp и готовы управлять своими финансами!</p>
              <button className={styles.congratsBtn} onClick={handleHide}>
                Отлично!
              </button>
            </div>
          ) : (
            <>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className={styles.list}>
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`${styles.item} ${item.completed ? styles.completed : ''} ${item.link ? styles.clickable : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={styles.itemIcon}>
                      {item.completed ? (
                        <span className={styles.checkmark}>✓</span>
                      ) : (
                        <span>{item.icon}</span>
                      )}
                    </div>
                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      <div className={styles.itemDescription}>{item.description}</div>
                    </div>
                    {item.link && !item.completed && (
                      <div className={styles.itemArrow}>→</div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.footer}>
                <p className={styles.footerText}>
                  💡 <strong>Совет:</strong> Используйте AI чат для быстрых команд вроде &ldquo;Добавь 500р на кофе&rdquo;
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
