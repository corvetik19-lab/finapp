# Быстрые действия на карточках тендеров

**Дата:** 13.11.2025  
**Статус:** Завершено

## Обзор

Реализовано меню быстрых действий (три точки) на карточках тендеров для мгновенного перемещения на определённые этапы без drag-and-drop.

## Функционал

### Кнопка "⋮" (три точки)

Появляется в правом верхнем углу карточки только на этапах:
- **Анализ и просчёт**
- **Проверка**

### Доступные действия

#### На этапе "Анализ и просчёт"

При клике на ⋮ открывается меню с опцией:
- ✅ **Не участвуем** - мгновенно перемещает тендер на этап "Не участвуем"

#### На этапе "Проверка"

При клике на ⋮ открывается меню с опциями:
- ✅ **Не участвуем** - перемещает на этап "Не участвуем"
- ✅ **Не прошло проверку** - перемещает на этап "Не прошло проверку"
- ✅ **Не подано** - перемещает на этап "Не подано"

## Поведение

### Открытие меню
- Клик по кнопке ⋮ открывает выпадающее меню
- Меню появляется с анимацией slide-in
- Только одно меню может быть открыто одновременно

### Закрытие меню
- Клик вне меню
- Клик на другую кнопку ⋮
- После выбора действия

### Перемещение тендера
- Мгновенное (оптимистичное) обновление UI
- Карточка исчезает из текущей колонки
- Карточка появляется в целевой колонке с анимацией
- Запрос на сервер выполняется в фоне
- При ошибке - автоматический откат

## Визуальный дизайн

### Кнопка ⋮
- Белый фон с лёгкой тенью
- Серая рамка
- Размер: 2rem × 2rem
- Hover: светло-серый фон, увеличенная тень

### Выпадающее меню
- Белый фон
- Закруглённые углы (0.5rem)
- Тень: 0 4px 12px rgba(0, 0, 0, 0.15)
- Минимальная ширина: 180px
- Анимация появления

### Пункты меню
- Padding: 0.75rem 1rem
- Разделитель между пунктами
- Hover: светлый фон + сдвиг текста вправо
- Active: более тёмный фон

## Реализация

### Определение быстрых действий

```typescript
const getQuickActions = (stageName: string): Array<{label: string, targetStageName: string}> => {
  if (stageName === 'Анализ и просчёт') {
    return [{ label: 'Не участвуем', targetStageName: 'Не участвуем' }];
  }
  if (stageName === 'Проверка') {
    return [
      { label: 'Не участвуем', targetStageName: 'Не участвуем' },
      { label: 'Не прошло проверку', targetStageName: 'Не прошло проверку' },
      { label: 'Не подано', targetStageName: 'Не подано' },
    ];
  }
  return [];
};
```

### Обработчик быстрого перемещения

```typescript
const handleQuickMove = async (tender: Tender, targetStageName: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  const targetStage = stages.find(s => s.name === targetStageName);
  if (!targetStage || !onStageChange) return;

  setOpenMenuTenderId(null);
  
  // Оптимистичное обновление UI
  const oldStageId = tender.stage_id;
  const updatedTender = { ...tender, stage_id: targetStage.id };
  const newOptimisticTenders = { ...optimisticTenders };
  
  newOptimisticTenders[oldStageId] = (newOptimisticTenders[oldStageId] || []).filter(
    t => t.id !== tender.id
  );
  newOptimisticTenders[targetStage.id] = [
    ...(newOptimisticTenders[targetStage.id] || []),
    updatedTender
  ];
  
  setOptimisticTenders(newOptimisticTenders);
  setIsUpdating(true);
  
  try {
    await onStageChange(tender.id, targetStage.id);
  } catch {
    setOptimisticTenders(tendersByStage); // Откат при ошибке
  } finally {
    setIsUpdating(false);
  }
};
```

### Рендеринг меню

```tsx
{hasQuickActions && (
  <div className={styles.quickActionsContainer}>
    <button
      onClick={(e) => toggleMenu(tender.id, e)}
      className={styles.quickActionsButton}
      title="Быстрые действия"
    >
      ⋮
    </button>
    {openMenuTenderId === tender.id && (
      <div className={styles.quickActionsMenu}>
        {quickActions.map((action) => (
          <button
            key={action.targetStageName}
            onClick={(e) => handleQuickMove(tender, action.targetStageName, e)}
            className={styles.quickActionItem}
          >
            {action.label}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

## CSS стили

### Контейнер и кнопка

```css
.quickActionsContainer {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.quickActionsButton {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.25rem;
  color: #64748b;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

### Выпадающее меню

```css
.quickActionsMenu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  overflow: hidden;
  animation: menuSlideIn 0.2s ease-out;
  z-index: 100;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Изменённые файлы

1. `components/tenders/tender-kanban.tsx`
   - Функция `getQuickActions` - определение доступных действий
   - Функция `handleQuickMove` - обработчик перемещения
   - Функция `toggleMenu` - управление открытием/закрытием
   - useEffect для закрытия меню при клике вне его
   - Рендеринг кнопки и меню на карточках

2. `components/tenders/tender-kanban.module.css`
   - `.quickActionsContainer` - позиционирование
   - `.quickActionsButton` - стили кнопки
   - `.quickActionsMenu` - стили меню
   - `.quickActionItem` - стили пунктов меню
   - Анимация `menuSlideIn`

3. `docs/TENDER_QUICK_ACTIONS.md`
   - Документация функционала

## Преимущества

✅ **Скорость:**
- Быстрое перемещение без drag-and-drop
- Один клик вместо перетаскивания

✅ **Удобство:**
- Интуитивно понятный интерфейс
- Доступно только там, где нужно

✅ **UX:**
- Плавные анимации
- Оптимистичное обновление
- Автоматический откат при ошибках

✅ **Гибкость:**
- Легко добавить новые действия
- Настраивается под каждый этап
