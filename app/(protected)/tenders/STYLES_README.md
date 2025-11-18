# 🎨 Руководство по стилям модуля тендеров

## 📋 Обзор

Модуль тендеров использует единую систему стилей через CSS Module (`tenders.module.css`), которая обеспечивает:
- ✨ Современный и профессиональный дизайн
- 🎯 Консистентность интерфейса
- 📱 Адаптивность для всех устройств
- ⚡ Оптимизированную производительность

---

## 🎨 Основные компоненты стилей

### 1. **Контейнеры**

```tsx
// Основной контейнер страницы
<div className={styles.tendersContainer}>
  {/* Содержимое */}
</div>
```

### 2. **Заголовки страниц**

```tsx
<div className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>
    <svg>...</svg>
    Заголовок страницы
  </h1>
  <p className={styles.pageDescription}>
    Описание страницы
  </p>
</div>
```

### 3. **Карточки**

```tsx
// Обычная карточка
<div className={styles.card}>
  <div className={styles.cardHeader}>
    <h3 className={styles.cardTitle}>Заголовок</h3>
  </div>
  <div className={styles.cardBody}>
    {/* Содержимое */}
  </div>
</div>

// Статистическая карточка с градиентом
<div className={`${styles.statCard} ${styles.success}`}>
  <div className={styles.statLabel}>Метка</div>
  <div className={styles.statValue}>123</div>
</div>
```

**Варианты статистических карточек:**
- `${styles.info}` - синий градиент
- `${styles.success}` - зеленый градиент
- `${styles.warning}` - оранжевый градиент
- `${styles.danger}` - красный градиент

### 4. **Сетки карточек**

```tsx
<div className={styles.cardsGrid}>
  <div className={styles.card}>...</div>
  <div className={styles.card}>...</div>
  <div className={styles.card}>...</div>
</div>
```

### 5. **Кнопки**

```tsx
// Основная кнопка
<button className={`${styles.btn} ${styles.btnPrimary}`}>
  <svg>...</svg>
  Текст кнопки
</button>

// Вторичная кнопка
<button className={`${styles.btn} ${styles.btnSecondary}`}>
  Текст
</button>

// Группа кнопок
<div className={styles.btnGroup}>
  <button className={`${styles.btn} ${styles.btnPrimary}`}>Кнопка 1</button>
  <button className={`${styles.btn} ${styles.btnSecondary}`}>Кнопка 2</button>
</div>
```

**Варианты кнопок:**
- `btnPrimary` - основная (синий градиент)
- `btnSecondary` - вторичная (белая с синей рамкой)
- `btnSuccess` - успех (зеленый градиент)
- `btnDanger` - опасность (красный градиент)

### 6. **Таблицы**

```tsx
<table className={styles.table}>
  <thead>
    <tr>
      <th>Колонка 1</th>
      <th>Колонка 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Данные 1</td>
      <td>Данные 2</td>
    </tr>
  </tbody>
</table>
```

### 7. **Бейджи (метки)**

```tsx
<span className={`${styles.badge} ${styles.badgeSuccess}`}>
  Активный
</span>
```

**Варианты бейджей:**
- `badgeSuccess` - зеленый (успех)
- `badgeWarning` - оранжевый (предупреждение)
- `badgeDanger` - красный (ошибка)
- `badgeInfo` - синий (информация)
- `badgeSecondary` - серый (нейтральный)

### 8. **Формы**

```tsx
<div className={styles.formGroup}>
  <label className={styles.formLabel}>Название поля</label>
  <input 
    type="text" 
    className={styles.formInput}
    placeholder="Введите значение"
  />
</div>

<div className={styles.formGroup}>
  <label className={styles.formLabel}>Описание</label>
  <textarea className={styles.formTextarea} />
</div>

<div className={styles.formGroup}>
  <label className={styles.formLabel}>Выбор</label>
  <select className={styles.formSelect}>
    <option>Вариант 1</option>
    <option>Вариант 2</option>
  </select>
</div>
```

### 9. **Фильтры**

```tsx
<div className={styles.filters}>
  <div className={styles.filtersGrid}>
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Фильтр 1</label>
      <input className={styles.formInput} />
    </div>
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Фильтр 2</label>
      <select className={styles.formSelect}>...</select>
    </div>
  </div>
</div>
```

### 10. **Прогресс-бары**

```tsx
<div className={styles.progressBar}>
  <div 
    className={styles.progressFill} 
    style={{ width: '75%' }}
  />
</div>
```

### 11. **Состояния загрузки**

```tsx
// Загрузка
<div className={styles.loading}>
  <div className={styles.spinner}></div>
  <p>Загрузка данных...</p>
</div>

// Пустое состояние
<div className={styles.emptyState}>
  <div className={styles.emptyStateIcon}>📭</div>
  <h3 className={styles.emptyStateTitle}>Нет данных</h3>
  <p className={styles.emptyStateText}>
    Данные отсутствуют или не найдены
  </p>
  <button className={`${styles.btn} ${styles.btnPrimary}`}>
    Добавить
  </button>
</div>
```

### 12. **Алерты (уведомления)**

```tsx
<div className={`${styles.alert} ${styles.alertSuccess}`}>
  <svg>...</svg>
  <div>
    <strong>Успех!</strong>
    <p>Операция выполнена успешно</p>
  </div>
</div>
```

**Варианты алертов:**
- `alertSuccess` - успех (зеленый)
- `alertWarning` - предупреждение (оранжевый)
- `alertDanger` - ошибка (красный)
- `alertInfo` - информация (синий)

### 13. **Модальные окна**

```tsx
{isOpen && (
  <div className={styles.modal}>
    <div className={styles.modalContent}>
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>Заголовок</h2>
        <button 
          className={styles.modalClose}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div>
        {/* Содержимое модального окна */}
      </div>
    </div>
  </div>
)}
```

### 14. **Пагинация**

```tsx
<div className={styles.pagination}>
  <button className={styles.paginationBtn}>
    ← Назад
  </button>
  <button className={`${styles.paginationBtn} ${styles.active}`}>
    1
  </button>
  <button className={styles.paginationBtn}>
    2
  </button>
  <button className={styles.paginationBtn}>
    Вперед →
  </button>
</div>
```

---

## 🎯 Утилитарные классы

```tsx
// Отступы
<div className={styles.mt2}>Верхний отступ</div>
<div className={styles.mb3}>Нижний отступ</div>

// Выравнивание
<div className={styles.textCenter}>Центр</div>
<div className={styles.textRight}>Справа</div>

// Flexbox
<div className={`${styles.flex} ${styles.justifyBetween} ${styles.alignCenter}`}>
  <div>Слева</div>
  <div>Справа</div>
</div>

// Промежутки
<div className={`${styles.flex} ${styles.gap2}`}>
  <div>Элемент 1</div>
  <div>Элемент 2</div>
</div>

// Анимации
<div className={styles.fadeIn}>
  Плавное появление
</div>
```

---

## 🎨 Цветовая палитра

### Основные цвета:
- **Синий (Primary)**: `#3b82f6` → `#2563eb`
- **Зеленый (Success)**: `#10b981` → `#059669`
- **Оранжевый (Warning)**: `#f59e0b` → `#d97706`
- **Красный (Danger)**: `#ef4444` → `#dc2626`
- **Фиолетовый**: `#667eea` → `#764ba2`

### Нейтральные цвета:
- **Темный текст**: `#1e293b`, `#334155`, `#475569`
- **Светлый текст**: `#64748b`, `#94a3b8`
- **Фон**: `#f8fafc`, `#f1f5f9`, `#e2e8f0`

---

## 📱 Адаптивность

Все компоненты автоматически адаптируются под мобильные устройства:

```css
@media (max-width: 768px) {
  /* Сетки становятся одноколоночными */
  /* Кнопки растягиваются на всю ширину */
  /* Таблицы получают горизонтальную прокрутку */
  /* Отступы уменьшаются */
}
```

---

## 💡 Лучшие практики

### 1. **Всегда используйте CSS Module**
```tsx
// ✅ Правильно
import styles from '../tenders.module.css';
<div className={styles.card}>...</div>

// ❌ Неправильно
<div className="card">...</div>
```

### 2. **Комбинируйте классы правильно**
```tsx
// ✅ Правильно
<button className={`${styles.btn} ${styles.btnPrimary}`}>

// ❌ Неправильно
<button className="btn btnPrimary">
```

### 3. **Используйте семантические иконки**
```tsx
// ✅ Правильно - SVG иконки
<svg width="20" height="20" viewBox="0 0 24 24">...</svg>

// ✅ Правильно - Emoji для быстрого прототипирования
<span>📊</span>
```

### 4. **Группируйте связанные элементы**
```tsx
<div className={styles.btnGroup}>
  <button className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить</button>
  <button className={`${styles.btn} ${styles.btnSecondary}`}>Отмена</button>
</div>
```

### 5. **Используйте правильные состояния**
```tsx
// Загрузка
if (loading) return <div className={styles.loading}>...</div>

// Ошибка
if (error) return <div className={styles.emptyState}>...</div>

// Данные
return <div className={styles.tendersContainer}>...</div>
```

---

## 🚀 Примеры использования

### Пример 1: Простая страница со списком

```tsx
import styles from '../tenders.module.css';

export default function TendersListPage() {
  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          📋 Список тендеров
        </h1>
        <p className={styles.pageDescription}>
          Все тендеры компании
        </p>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Название</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Тендер 1</td>
              <td>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                  Активный
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Пример 2: Форма создания

```tsx
import styles from '../tenders.module.css';

export default function CreateTenderPage() {
  return (
    <div className={styles.tendersContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          ➕ Новый тендер
        </h1>
      </div>

      <div className={styles.card}>
        <form>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Название</label>
            <input 
              type="text" 
              className={styles.formInput}
              placeholder="Введите название тендера"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Описание</label>
            <textarea 
              className={styles.formTextarea}
              placeholder="Опишите тендер"
            />
          </div>

          <div className={styles.btnGroup}>
            <button 
              type="submit" 
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              Создать
            </button>
            <button 
              type="button" 
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 🔧 Кастомизация

Если нужно изменить стили, редактируйте файл `tenders.module.css`:

```css
/* Изменить основной цвет */
.btnPrimary {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

/* Изменить размер карточек */
.cardsGrid {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

/* Добавить новый вариант кнопки */
.btnCustom {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
}
```

---

## 📚 Дополнительные ресурсы

- [CSS Modules документация](https://github.com/css-modules/css-modules)
- [Next.js CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
- [Tailwind CSS (для справки по цветам)](https://tailwindcss.com/docs/customizing-colors)

---

**Создано для модуля тендеров финансового приложения** 🚀
