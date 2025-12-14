# План разработки модуля "Поставщики"

**Дата начала:** 13 декабря 2024  
**Провайдер IP-телефонии:** Mango Office  
**Статус:** 🔄 В разработке

---

## Оглавление

1. [Концепция](#концепция)
2. [Архитектура](#архитектура)
3. [Структура БД](#структура-бд)
4. [API Mango Office](#api-mango-office)
5. [Этапы разработки](#этапы-разработки)

---

## Концепция

Модуль **"Поставщики"** — полноценная CRM-подсистема для работы с поставщиками в контексте тендеров.

### Ключевые возможности

- **Управление поставщиками** — карточки, контакты, категории, рейтинг
- **Документооборот** — КП, счета, договоры, прайс-листы
- **Заметки** — история взаимодействий
- **Связь с тендерами** — участие поставщиков в тендерах
- **Связь с бухгалтерией** — синхронизация с контрагентами
- **IP-телефония (Mango Office)** — звонки, история, всплывающие карточки

---

## Архитектура

### Структура файлов

```text
app/(protected)/tenders/suppliers/
├── page.tsx                    # Список поставщиков
├── layout.tsx                  # Layout с навигацией
├── [id]/
│   └── page.tsx               # Карточка поставщика
├── categories/
│   └── page.tsx               # Категории поставщиков
├── calls/
│   └── page.tsx               # История звонков
└── settings/
    └── page.tsx               # Настройки телефонии

app/api/telephony/
├── mango/
│   ├── call/route.ts          # Инициация звонка
│   ├── webhook/route.ts       # Webhook от Mango
│   └── events/route.ts        # SSE для realtime событий
└── lookup/route.ts            # Поиск поставщика по номеру

components/suppliers/
├── SuppliersPage.tsx          # Главная страница
├── SupplierCard.tsx           # Карточка поставщика
├── SupplierForm.tsx           # Форма создания/редактирования
├── SupplierContacts.tsx       # Контакты
├── SupplierNotes.tsx          # Заметки
├── SupplierFiles.tsx          # Файлы
├── SupplierCalls.tsx          # История звонков
├── SupplierTenders.tsx        # Связанные тендеры
├── SupplierDocuments.tsx      # Документы бухгалтерии
├── CategoriesPage.tsx         # Управление категориями
├── CallsHistoryPage.tsx       # История звонков
├── TelephonySettingsPage.tsx  # Настройки Mango Office
├── CallButton.tsx             # Кнопка звонка
├── IncomingCallPopup.tsx      # Всплывающая карточка
├── ActiveCallWidget.tsx       # Виджет активного звонка
└── CallProvider.tsx           # React Context для телефонии

lib/suppliers/
├── types.ts                   # TypeScript типы
├── service.ts                 # CRUD операции
├── mango-service.ts           # Интеграция с Mango Office
└── file-service.ts            # Работа с файлами
```

---

## Структура БД

### Таблица `suppliers`

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Основная информация
  name VARCHAR(500) NOT NULL,
  short_name VARCHAR(200),
  inn VARCHAR(12),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  
  -- Адреса
  legal_address TEXT,
  actual_address TEXT,
  
  -- Контакты компании
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Классификация
  category_id UUID REFERENCES supplier_categories(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[],
  
  -- Связь с бухгалтерией
  counterparty_id UUID REFERENCES accounting_counterparties(id),
  
  -- Описание
  description TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### Таблица `supplier_categories`

```sql
CREATE TABLE supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'Package',
  parent_id UUID REFERENCES supplier_categories(id),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Таблица `supplier_contacts`

```sql
CREATE TABLE supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  name VARCHAR(300) NOT NULL,
  position VARCHAR(200),
  department VARCHAR(200),
  
  phone VARCHAR(50),
  phone_mobile VARCHAR(50),
  phone_internal VARCHAR(20),
  email VARCHAR(255),
  telegram VARCHAR(100),
  
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Таблица `supplier_notes`

```sql
CREATE TABLE supplier_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  title VARCHAR(300),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Таблица `supplier_files`

```sql
CREATE TABLE supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  file_type VARCHAR(30) DEFAULT 'other' CHECK (file_type IN (
    'commercial_offer', 'invoice', 'contract', 'price_list', 
    'certificate', 'license', 'other'
  )),
  
  description TEXT,
  tender_id UUID REFERENCES tenders(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Таблица `supplier_tenders`

```sql
CREATE TABLE supplier_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  
  role VARCHAR(30) DEFAULT 'participant' CHECK (role IN (
    'participant', 'winner', 'subcontractor', 'partner'
  )),
  status VARCHAR(30) DEFAULT 'invited' CHECK (status IN (
    'invited', 'confirmed', 'submitted', 'rejected', 'won', 'lost'
  )),
  
  proposed_price BIGINT,
  final_price BIGINT,
  notes TEXT,
  
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  
  UNIQUE(supplier_id, tender_id)
);
```

### Таблица `mango_settings`

```sql
CREATE TABLE mango_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,
  
  -- API credentials
  api_key VARCHAR(100) NOT NULL,
  api_salt VARCHAR(100) NOT NULL,
  
  -- Настройки
  is_enabled BOOLEAN DEFAULT true,
  record_calls BOOLEAN DEFAULT true,
  
  -- Маппинг пользователей на внутренние номера
  -- { "user_id": "extension" }
  extension_mapping JSONB DEFAULT '{}',
  
  -- Webhook
  webhook_url TEXT,
  webhook_secret VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Таблица `call_history`

```sql
CREATE TABLE call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Связи
  supplier_id UUID REFERENCES suppliers(id),
  contact_id UUID REFERENCES supplier_contacts(id),
  
  -- Данные звонка
  mango_call_id VARCHAR(100),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  extension VARCHAR(20),
  
  -- Временные метки
  started_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  duration INTEGER DEFAULT 0,
  talk_duration INTEGER DEFAULT 0,
  
  -- Статус
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'ringing', 'answered', 'completed', 'missed', 'busy', 'failed', 'cancelled'
  )),
  
  -- Дополнительно
  recording_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Индексы

```sql
-- suppliers
CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_category ON suppliers(category_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_inn ON suppliers(inn);
CREATE INDEX idx_suppliers_counterparty ON suppliers(counterparty_id);

-- contacts
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX idx_supplier_contacts_phone ON supplier_contacts(phone);
CREATE INDEX idx_supplier_contacts_phone_mobile ON supplier_contacts(phone_mobile);

-- files
CREATE INDEX idx_supplier_files_supplier ON supplier_files(supplier_id);
CREATE INDEX idx_supplier_files_type ON supplier_files(file_type);

-- tenders
CREATE INDEX idx_supplier_tenders_supplier ON supplier_tenders(supplier_id);
CREATE INDEX idx_supplier_tenders_tender ON supplier_tenders(tender_id);

-- calls
CREATE INDEX idx_call_history_company ON call_history(company_id);
CREATE INDEX idx_call_history_supplier ON call_history(supplier_id);
CREATE INDEX idx_call_history_from ON call_history(from_number);
CREATE INDEX idx_call_history_to ON call_history(to_number);
CREATE INDEX idx_call_history_started ON call_history(started_at DESC);
```

### RLS Policies

```sql
-- Все таблицы: доступ только к данным своей компании
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mango_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Пример политики для suppliers
CREATE POLICY "Users can view suppliers of their company"
  ON suppliers FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage suppliers of their company"
  ON suppliers FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));
```

---

## API Mango Office

### Аутентификация

Mango Office использует подпись запросов:

```typescript
import crypto from 'crypto';

function signRequest(apiKey: string, apiSalt: string, params: object): string {
  const json = JSON.stringify(params);
  const sign = crypto
    .createHash('sha256')
    .update(apiKey + json + apiSalt)
    .digest('hex');
  return sign;
}
```

### Основные методы API

#### 1. Инициация звонка

```http
POST https://app.mango-office.ru/vpbx/commands/callback
```

```typescript
interface CallbackRequest {
  command_id: string;      // Уникальный ID команды
  from: {
    extension: string;     // Внутренний номер сотрудника
  };
  to_number: string;       // Номер для звонка
}
```

#### 2. Webhook событий

Mango отправляет события на наш webhook:

```typescript
interface MangoEvent {
  entry_id: string;        // ID записи
  call_id: string;         // ID звонка
  timestamp: number;       // Unix timestamp
  seq: number;             // Порядковый номер
  
  call_state: 'Appeared' | 'Connected' | 'Disconnected';
  location: 'ivr' | 'queue' | 'abonent';
  
  from: {
    number: string;
    extension?: string;
  };
  to: {
    number: string;
    extension?: string;
  };
  
  disconnect_reason?: number;
  talk_time?: number;
}
```

#### 3. Получение записи разговора

```http
POST https://app.mango-office.ru/vpbx/queries/recording/post
```

---

## Этапы разработки

### Этап 1: Фундамент ✅

- [x] 1.1 Создать план разработки (этот документ)
- [x] 1.2 SQL-миграция для всех таблиц
- [x] 1.3 TypeScript типы (`lib/suppliers/types.ts`)
- [x] 1.4 Layout с навигацией (`layout.tsx`)
- [x] 1.5 Добавить в меню тендеров

### Этап 2: CRUD поставщиков ✅

- [x] 2.1 Сервисные функции (`lib/suppliers/service.ts`)
- [x] 2.2 Список поставщиков с фильтрами
- [x] 2.3 Форма создания/редактирования
- [x] 2.4 Карточка поставщика (базовая)
- [x] 2.5 Удаление поставщика (soft delete)

### Этап 3: Категории ✅

- [x] 3.1 CRUD категорий
- [x] 3.2 Страница управления категориями
- [x] 3.3 Фильтр по категориям в списке

### Этап 4: Контакты ✅

- [x] 4.1 CRUD контактов
- [x] 4.2 Компонент контактов в карточке
- [x] 4.3 Основной контакт, decision maker

### Этап 5: Заметки ✅

- [x] 5.1 CRUD заметок
- [x] 5.2 Компонент заметок в карточке
- [x] 5.3 Закрепление заметок

### Этап 6: Файлы ✅

- [x] 6.1 Supabase Storage bucket
- [x] 6.2 Загрузка файлов
- [x] 6.3 Категоризация файлов
- [x] 6.4 Просмотр и скачивание
- [x] 6.5 Привязка к тендеру

### Этап 7: Связь с тендерами ✅

- [x] 7.1 CRUD связей supplier_tenders
- [x] 7.2 Компонент тендеров в карточке
- [ ] 7.3 Добавление поставщика из тендера

### Этап 8: Связь с бухгалтерией ✅

- [x] 8.1 Синхронизация с контрагентами
- [x] 8.2 Отображение документов
- [x] 8.3 Статистика закупок

### Этап 9: IP-телефония (Mango Office) ✅

- [x] 9.1 Настройки Mango Office
- [x] 9.2 API для исходящих звонков
- [x] 9.3 Webhook для входящих событий
- [x] 9.4 CallProvider (React Context)
- [x] 9.5 Кнопка звонка
- [x] 9.6 Виджет активного звонка
- [x] 9.7 Всплывающая карточка входящего
- [x] 9.8 История звонков
- [x] 9.9 Записи разговоров

### Этап 10: Полировка ✅

- [x] 10.1 Поиск по всем полям (реализован в SuppliersPage)
- [x] 10.2 Расширенные фильтры (категория, статус, рейтинг)
- [x] 10.3 Экспорт в CSV/Excel (lib/suppliers/export.ts)
- [x] 10.4 Массовые операции (выбор, изменение статуса/категории, удаление, синхронизация)
- [x] 10.5 Мобильная адаптация (адаптивная таблица, скрытие колонок, компактные кнопки)

---

## Прогресс

| Этап | Статус | Дата |
|------|--------|------|
| Этап 1: Фундамент | ✅ | 13.12.2024 |
| Этап 2: CRUD поставщиков | ✅ | 13.12.2024 |
| Этап 3: Категории | ✅ | 13.12.2024 |
| Этап 4: Контакты | ✅ | 13.12.2024 |
| Этап 5: Заметки | ✅ | 13.12.2024 |
| Этап 6: Файлы | ✅ | 13.12.2024 |
| Этап 7: Связь с тендерами | ✅ | 13.12.2024 |
| Этап 8: Связь с бухгалтерией | ✅ | 13.12.2024 |
| Этап 9: IP-телефония | ✅ | 13.12.2024 |
| Этап 10: Полировка | ✅ | 13.12.2024 |

**Легенда:** ✅ Готово | 🔄 В работе | ⏳ Ожидает

---

## Расширенный функционал (v2.0)

### Этап 11: Напоминания и задачи ✅

- [x] 11.1 SQL: таблица supplier_tasks
- [x] 11.2 TypeScript типы для задач
- [x] 11.3 CRUD сервис задач (tasks-service.ts)
- [x] 11.4 Компонент списка задач (SupplierTasks.tsx)
- [x] 11.5 Форма создания задачи
- [ ] 11.6 Уведомления о сроках (CRON) - TODO
- [x] 11.7 Интеграция в карточку поставщика

### Этап 12: История взаимодействий (Activity Log) ✅

- [x] 12.1 SQL: таблица supplier_activities
- [x] 12.2 Автоматическая запись действий (logActivity)
- [x] 12.3 Компонент ленты активности (SupplierActivityLog.tsx)
- [x] 12.4 Фильтры по типу активности
- [x] 12.5 Комментарии менеджеров (addComment)

### Этап 13: Договоры и условия ✅

- [x] 13.1 SQL: таблица supplier_contracts
- [x] 13.2 CRUD сервис договоров (contracts-service.ts)
- [x] 13.3 Компонент списка договоров (SupplierContracts.tsx)
- [x] 13.4 Условия оплаты (отсрочка, предоплата)
- [x] 13.5 Уведомления об окончании договора (isExpiringSoon)
- [ ] 13.6 Загрузка сканов договоров - TODO

### Этап 14: Сравнение поставщиков ✅

- [x] 14.1 Компонент выбора поставщиков для сравнения (SupplierComparison.tsx)
- [x] 14.2 Таблица сравнения по критериям
- [x] 14.3 Рейтинг по категориям товаров
- [ ] 14.4 История цен (SQL + UI) - TODO
- [x] 14.5 Экспорт сравнения (CSV)

### Этап 15: Дашборд аналитики ✅

- [x] 15.1 SQL агрегации для статистики (analytics-service.ts)
- [x] 15.2 Топ поставщиков по объёму закупок
- [x] 15.3 Динамика работы (таблица активности)
- [x] 15.4 Проблемные поставщики (просрочки, предупреждения)
- [ ] 15.5 KPI менеджеров по работе с поставщиками - TODO

### Этап 16: Интеграция с email ✅

- [x] 16.1 SQL: таблицы supplier_emails, supplier_email_templates
- [x] 16.2 Шаблоны писем (email-service.ts)
- [x] 16.3 Отправка email из карточки (SupplierEmailComposer.tsx)
- [x] 16.4 История переписки
- [ ] 16.5 Автоматическая привязка входящих писем - TODO

### Этап 17: Прайс-листы поставщиков ✅

- [x] 17.1 SQL: таблица supplier_pricelists (уже создана в v2)
- [x] 17.2 Загрузка и хранение прайсов (pricelist-service.ts)
- [x] 17.3 Компонент SupplierPricelists.tsx
- [ ] 17.4 Парсинг Excel прайсов - TODO
- [ ] 17.5 Сравнение цен между поставщиками - TODO

### Этап 18: Оценка и отзывы ✅

- [x] 18.1 SQL: таблица supplier_reviews (уже создана в v2)
- [x] 18.2 Система оценки по критериям (качество, доставка, цена, коммуникация)
- [x] 18.3 Отзывы от сотрудников (reviews-service.ts)
- [x] 18.4 Агрегированный скоринг (автоматический расчёт overall_rating)
- [x] 18.5 Компонент отзывов в карточке (SupplierReviews.tsx)

### Этап 19: Геолокация ✅

- [x] 19.1 Поля координат в таблице suppliers (latitude, longitude, geocoded_at)
- [x] 19.2 Компонент SuppliersMap.tsx с открытием в Яндекс.Картах
- [x] 19.3 Сервис geolocation-service.ts
- [x] 19.4 Расчёт расстояния (формула Haversine)
- [x] 19.5 Фильтр по радиусу
- [x] 19.6 Страница /tenders/suppliers/map

### Этап 20: Дубликаты и слияние ✅

- [x] 20.1 Автоматическое определение дубликатов по ИНН, телефону, email, названию
- [x] 20.2 UI списка потенциальных дубликатов (SuppliersDuplicates.tsx)
- [x] 20.3 Инструмент слияния карточек с выбором основной
- [x] 20.4 Перенос связанных данных при слиянии (контакты, файлы, задачи, договоры и др.)
- [x] 20.5 Страница /tenders/suppliers/duplicates

---

## Прогресс v2.0

| Этап | Статус | Дата |
|------|--------|------|
| Этап 11: Напоминания и задачи | ✅ | 13.12.2024 |
| Этап 12: История взаимодействий | ✅ | 13.12.2024 |
| Этап 13: Договоры и условия | ✅ | 13.12.2024 |
| Этап 14: Сравнение поставщиков | ✅ | 13.12.2024 |
| Этап 15: Дашборд аналитики | ✅ | 13.12.2024 |
| Этап 16: Интеграция с email | ✅ | 13.12.2024 |
| Этап 17: Прайс-листы | ✅ | 13.12.2024 |
| Этап 18: Оценка и отзывы | ✅ | 13.12.2024 |
| Этап 19: Геолокация | ✅ | 13.12.2024 |
| Этап 20: Дубликаты и слияние | ✅ | 13.12.2024 |
