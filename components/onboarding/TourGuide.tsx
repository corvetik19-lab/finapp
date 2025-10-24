"use client";

import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';

interface TourGuideProps {
  page: 'dashboard' | 'transactions' | 'budgets' | 'reports' | 'ai-chat';
}

/**
 * Интерактивный тур по приложению
 * Использует react-joyride для показа подсказок
 */
export default function TourGuide({ page }: TourGuideProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState(false);

  // Проверяем, прошёл ли пользователь тур
  useEffect(() => {
    const completed = localStorage.getItem(`tour_${page}_completed`);
    const shouldShow = localStorage.getItem('show_tours') !== 'false';
    
    // Отмечаем что проверили localStorage
    setChecked(true);
    
    if (!completed && shouldShow) {
      // Задержка перед стартом тура
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [page]);

  // Шаги тура для дашборда
  const dashboardSteps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2>👋 Добро пожаловать в FinApp!</h2>
          <p>Давайте познакомимся с основными возможностями приложения.</p>
          <p>Это займёт всего 2 минуты.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-summary"]',
      content: (
        <div>
          <h3>💰 Сводка</h3>
          <p>Здесь вы видите общую статистику: доходы, расходы и баланс за текущий месяц.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-chart"]',
      content: (
        <div>
          <h3>📊 Графики</h3>
          <p>Визуализация ваших доходов и расходов по дням.</p>
          <p>Помогает увидеть тренды и паттерны в тратах.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="dashboard-categories"]',
      content: (
        <div>
          <h3>📂 Категории</h3>
          <p>Распределение расходов по категориям.</p>
          <p>Быстро видите, куда уходят деньги.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '[data-tour="nav-transactions"]',
      content: (
        <div>
          <h3>📝 Транзакции</h3>
          <p>Здесь вы добавляете доходы и расходы.</p>
          <p>Это основа учёта финансов.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-budgets"]',
      content: (
        <div>
          <h3>💰 Бюджеты</h3>
          <p>Установите лимиты на категории расходов.</p>
          <p>Приложение предупредит, если вы превысите бюджет.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-reports"]',
      content: (
        <div>
          <h3>📈 Отчёты</h3>
          <p>Детальная аналитика и экспорт в PDF/Excel.</p>
          <p>Полезно для анализа финансов за период.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-ai"]',
      content: (
        <div>
          <h3>🤖 AI функции</h3>
          <p>Умные прогнозы, рекомендации и чат с AI.</p>
          <p>AI поможет оптимизировать расходы и планировать бюджет.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: 'body',
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
      placement: 'center',
    },
  ];

  // Шаги тура для транзакций
  const transactionsSteps: Step[] = [
    {
      target: '[data-tour="add-transaction-btn"]',
      content: (
        <div>
          <h3>➕ Добавить транзакцию</h3>
          <p>Нажмите эту кнопку, чтобы создать доход или расход.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="transaction-filters"]',
      content: (
        <div>
          <h3>🔍 Фильтры</h3>
          <p>Ищите транзакции по дате, типу, категории или счёту.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="import-export"]',
      content: (
        <div>
          <h3>📥 Импорт/Экспорт</h3>
          <p>Загружайте транзакции из CSV или экспортируйте для бэкапа.</p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  // Шаги тура для бюджетов
  const budgetsSteps: Step[] = [
    {
      target: '[data-tour="create-budget-btn"]',
      content: (
        <div>
          <h3>🎯 Создать бюджет</h3>
          <p>Установите лимит расходов на категорию (например, &ldquo;Продукты: 20 000₽/месяц&rdquo;).</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="budget-progress"]',
      content: (
        <div>
          <h3>📊 Прогресс бюджета</h3>
          <p>Видите, сколько осталось до лимита.</p>
          <p>Цвет меняется: 🟢 зелёный → 🟡 жёлтый → 🔴 красный</p>
        </div>
      ),
      placement: 'top',
    },
  ];

  // Шаги тура для отчётов
  const reportsSteps: Step[] = [
    {
      target: '[data-tour="period-selector"]',
      content: (
        <div>
          <h3>📅 Выбор периода</h3>
          <p>Смотрите статистику за любой период: неделя, месяц, год.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="export-buttons"]',
      content: (
        <div>
          <h3>📄 Экспорт отчётов</h3>
          <p>Скачайте красиво оформленные отчёты в PDF или Excel.</p>
          <p>Удобно для финансового планирования.</p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  // Шаги тура для AI чата
  const aiChatSteps: Step[] = [
    {
      target: '[data-tour="chat-input"]',
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
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="model-selector"]',
      content: (
        <div>
          <h3>🤖 Выбор AI модели</h3>
          <p>Используйте разные модели: GPT-4, Claude, Gemini.</p>
          <p>Бесплатные модели помечены звёздочкой ⭐</p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  // Выбираем шаги в зависимости от страницы
  const steps = 
    page === 'dashboard' ? dashboardSteps :
    page === 'transactions' ? transactionsSteps :
    page === 'budgets' ? budgetsSteps :
    page === 'reports' ? reportsSteps :
    page === 'ai-chat' ? aiChatSteps :
    [];

  // Обработчик событий тура
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      // Тур завершён или пропущен
      setRun(false);
      localStorage.setItem(`tour_${page}_completed`, 'true');
      
      // Отмечаем прогресс в чек-листе
      updateChecklist('tour_completed');
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
    }
  };

  // Обновление чек-листа
  const updateChecklist = (item: string) => {
    const checklist = JSON.parse(localStorage.getItem('onboarding_checklist') || '{}');
    checklist[item] = true;
    localStorage.setItem('onboarding_checklist', JSON.stringify(checklist));
  };

  // Не рендерим пока не проверили localStorage (предотвращает мигание)
  if (!checked || !run || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          textColor: '#333',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#fff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontSize: '15px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
        },
        buttonBack: {
          color: '#666',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#999',
        },
      }}
      locale={{
        back: 'Назад',
        close: 'Закрыть',
        last: 'Завершить',
        next: 'Далее',
        skip: 'Пропустить',
      }}
    />
  );
}
