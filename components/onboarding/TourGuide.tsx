"use client";

import { useEffect } from 'react';
import { useTour } from '@reactour/tour';

interface TourGuideProps {
  page: 'dashboard' | 'transactions' | 'budgets' | 'reports' | 'ai-chat';
}

/**
 * Интерактивный тур по приложению
 * Использует @reactour/tour для показа подсказок
 */
export default function TourGuide({ page }: TourGuideProps) {
  const { setIsOpen, setSteps, setCurrentStep } = useTour();

  useEffect(() => {
    if (!setSteps || !setIsOpen || !setCurrentStep) return;
    
    const checkAndShowTour = async () => {
      try {
        // Проверяем настройки тура из API
        const response = await fetch('/api/settings/tour');
        if (!response.ok) {
          console.error('Tour settings API error:', response.status, response.statusText);
          return;
        }
        
        const settings = await response.json();
        
        // Если туры отключены глобально - не показываем
        if (!settings.enabled) {
          return;
        }
        
        // Проверяем, прошёл ли пользователь тур для этой страницы
        const completed = settings.completedTours?.[page];
        
        if (!completed) {
          const steps = getStepsForPage(page);
          setSteps(steps);
          setCurrentStep(0);
          
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 1000);
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Failed to load tour settings:', error);
      }
    };
    
    checkAndShowTour();
  }, [page, setIsOpen, setSteps, setCurrentStep]);

  return null;
}

// Получаем шаги для конкретной страницы
function getStepsForPage(page: string) {
  const dashboardSteps = [
    {
      selector: 'body',
      content: (
        <div>
          <h2>👋 Добро пожаловать в FinApp!</h2>
          <p>Давайте познакомимся с основными возможностями приложения.</p>
          <p>Это займёт всего 2 минуты.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="dashboard-summary"]',
      content: (
        <div>
          <h3>💰 Сводка</h3>
          <p>Здесь вы видите общую статистику: доходы, расходы и баланс за текущий месяц.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="dashboard-chart"]',
      content: (
        <div>
          <h3>📊 Графики</h3>
          <p>Визуализация ваших доходов и расходов по дням.</p>
          <p>Помогает увидеть тренды и паттерны в тратах.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="dashboard-categories"]',
      content: (
        <div>
          <h3>📂 Категории</h3>
          <p>Распределение расходов по категориям.</p>
          <p>Быстро видите, куда уходят деньги.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="nav-transactions"]',
      content: (
        <div>
          <h3>📝 Транзакции</h3>
          <p>Здесь вы добавляете доходы и расходы.</p>
          <p>Это основа учёта финансов.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="nav-budgets"]',
      content: (
        <div>
          <h3>💰 Бюджеты</h3>
          <p>Установите лимиты на категории расходов.</p>
          <p>Приложение предупредит, если вы превысите бюджет.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="nav-reports"]',
      content: (
        <div>
          <h3>📈 Отчёты</h3>
          <p>Детальная аналитика и экспорт в PDF/Excel.</p>
          <p>Полезно для анализа финансов за период.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="nav-ai"]',
      content: (
        <div>
          <h3>🤖 AI функции</h3>
          <p>Умные прогнозы, рекомендации и чат с AI.</p>
          <p>AI поможет оптимизировать расходы и планировать бюджет.</p>
        </div>
      ),
    },
    {
      selector: 'body',
      content: (
        <div>
          <h2>🎉 Готово!</h2>
          <p>Теперь вы знаете основы работы с FinApp.</p>
          <p><strong>Следующий шаг:</strong> Добавьте свою первую транзакцию!</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
            💡 Совет: В AI чате можно писать команды вроде &ldquo;Добавь 500р на кофе&rdquo;
          </p>
        </div>
      ),
    },
  ];

  const transactionsSteps = [
    {
      selector: '[data-tour="add-transaction-btn"]',
      content: (
        <div>
          <h3>➕ Добавить транзакцию</h3>
          <p>Нажмите эту кнопку, чтобы создать доход или расход.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="transaction-filters"]',
      content: (
        <div>
          <h3>🔍 Фильтры</h3>
          <p>Ищите транзакции по дате, типу, категории или счёту.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="import-export"]',
      content: (
        <div>
          <h3>📥 Импорт/Экспорт</h3>
          <p>Загружайте транзакции из CSV или экспортируйте для бэкапа.</p>
        </div>
      ),
    },
  ];

  const budgetsSteps = [
    {
      selector: '[data-tour="create-budget-btn"]',
      content: (
        <div>
          <h3>🎯 Создать бюджет</h3>
          <p>Установите лимит расходов на категорию (например, &ldquo;Продукты: 20 000₽/месяц&rdquo;).</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="budget-progress"]',
      content: (
        <div>
          <h3>📊 Прогресс бюджета</h3>
          <p>Видите, сколько осталось до лимита.</p>
          <p>Цвет меняется: 🟢 зелёный → 🟡 жёлтый → 🔴 красный</p>
        </div>
      ),
    },
  ];

  const reportsSteps = [
    {
      selector: '[data-tour="period-selector"]',
      content: (
        <div>
          <h3>📅 Выбор периода</h3>
          <p>Смотрите статистику за любой период: неделя, месяц, год.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="export-buttons"]',
      content: (
        <div>
          <h3>📄 Экспорт отчётов</h3>
          <p>Скачайте красиво оформленные отчёты в PDF или Excel.</p>
          <p>Удобно для финансового планирования.</p>
        </div>
      ),
    },
  ];

  const aiChatSteps = [
    {
      selector: '[data-tour="chat-input"]',
      content: (
        <div>
          <h3>💬 AI Чат</h3>
          <p>Задавайте вопросы о финансах или используйте команды:</p>
          <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <li>&ldquo;Добавь 500р на кофе&rdquo;</li>
            <li>&ldquo;Покажи баланс&rdquo;</li>
            <li>&ldquo;Сколько я трачу на еду?&rdquo;</li>
            <li>&ldquo;Дай советы по накоплениям&rdquo;</li>
          </ul>
        </div>
      ),
    },
    {
      selector: '[data-tour="model-selector"]',
      content: (
        <div>
          <h3>🤖 Выбор AI модели</h3>
          <p>Используйте разные модели: GPT-4, Claude, Gemini.</p>
          <p>Бесплатные модели помечены звёздочкой ⭐</p>
        </div>
      ),
    },
  ];

  return page === 'dashboard' ? dashboardSteps :
    page === 'transactions' ? transactionsSteps :
    page === 'budgets' ? budgetsSteps :
    page === 'reports' ? reportsSteps :
    page === 'ai-chat' ? aiChatSteps :
    [];
}
