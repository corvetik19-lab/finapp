# План разработки: Назначение тендеров сотрудникам

## Общее описание
Система назначения тендеров сотрудникам с полным контролем для админа организации, realtime обновлениями и аналитикой времени на этапах.

---

## Задачи

### 1. Исправить список сотрудников при создании/редактировании тендера
**Статус:** ✅ Выполнено

**Проблема:** В выпадающем списке сотрудников отображаются неправильные роли (все "Наблюдатели")

**Решение:**
- [ ] Найти компонент формы тендера где выбирается сотрудник
- [ ] Изменить запрос чтобы брать сотрудников из таблицы `employees` с их ролями
- [ ] Отображать правильную роль сотрудника в списке выбора

---

### 2. Источник сотрудников - только из таблицы employees
**Статус:** ✅ Выполнено

**Требование:** Назначать можно только сотрудников добавленных в "Сотрудники", не из users

**Решение:**
- [ ] Изменить API endpoint для получения списка сотрудников
- [ ] Использовать таблицу `employees` вместо `users`
- [ ] Фильтровать только активных сотрудников (`status = 'active'`, `deleted_at IS NULL`)

---

### 3. Видимость тендеров по ролям
**Статус:** ✅ Выполнено (RLS политики применены)

**Требования:**
- Сотрудник видит только **свои** назначенные тендеры
- Админ организации видит **все** тендеры своей организации
- Свободные тендеры (без назначенного сотрудника) отображаются отдельно для админа

**Примечание:** Супер-админ управляет только приложением в целом, для работы с тендерами он использует свою роль админа организации в своей организации.

**Решение:**
- [ ] Создать RLS политики для таблицы `tenders`
- [ ] Добавить поле `assigned_employee_id` в таблицу тендеров (если нет)
- [ ] Реализовать функцию проверки роли пользователя
- [ ] Фильтрация на уровне API и базы данных
- [ ] Отдельный блок "Свободные тендеры" для админа организации

---

### 4. Назначение и переназначение тендеров
**Статус:** ✅ Выполнено (API /api/tenders/[id]/assign)

**Требования:**
- Админ организации может назначить неназначенный тендер сотруднику
- Можно переназначить тендер на любом этапе
- При переназначении сохраняется текущий этап и вся информация

**Решение:**
- [ ] API endpoint для назначения/переназначения тендера
- [ ] Логика сохранения этапа при переназначении
- [ ] Валидация: только админ может назначать/переназначать

---

### 5. Realtime обновления
**Статус:** ✅ Настроено (таблицы добавлены в supabase_realtime)

**Требования:**
- При назначении тендера он моментально появляется у сотрудника
- При переназначении тендер исчезает у старого и появляется у нового сотрудника

**Решение:**
- [ ] Настроить Supabase Realtime для таблицы тендеров
- [ ] Подписка на изменения `assigned_employee_id`
- [ ] Обновление UI без перезагрузки страницы

---

### 6. Дашборд для админа организации
**Статус:** ✅ API выполнено (/api/tenders/admin-overview)

**Требования:**
- Полная картина всех тендеров организации
- Группировка по этапам
- Информация о сотруднике, работающем с тендером
- Время нахождения на текущем этапе
- Быстрое назначение/переназначение

**Решение:**
- [ ] Создать компонент `TendersDashboard` для админа
- [ ] Kanban-доска или таблица с группировкой по этапам
- [ ] Статистика: количество тендеров на каждом этапе
- [ ] Индикатор времени на этапе
- [ ] Кнопка быстрого назначения

---

### 7. Аналитика времени на этапах
**Статус:** ✅ Выполнено (таблица tender_stage_history расширена)

**Требования:**
- Фиксировать время входа на каждый этап
- Показывать сколько времени тендер на текущем этапе
- Сохранять историю переходов для аналитики

**Решение:**
- [ ] Создать таблицу `tender_stage_history`
  - `id`, `tender_id`, `stage`, `entered_at`, `exited_at`, `employee_id`
- [ ] Триггер на изменение этапа тендера
- [ ] Вычисление времени на этапе
- [ ] API для получения истории и аналитики

---

## База данных

### Новые/изменённые таблицы

```sql
-- Добавить поле assigned_employee_id если нет
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES employees(id);

-- История этапов тендера
CREATE TABLE tender_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  stage text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  employee_id uuid REFERENCES employees(id),
  duration_seconds integer GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(exited_at, now()) - entered_at))::integer
  ) STORED,
  company_id uuid NOT NULL REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- Индексы
CREATE INDEX idx_tender_stage_history_tender ON tender_stage_history(tender_id);
CREATE INDEX idx_tender_stage_history_stage ON tender_stage_history(stage);
CREATE INDEX idx_tender_stage_history_company ON tender_stage_history(company_id);
```

### RLS политики

```sql
-- Сотрудник видит только свои тендеры, админ организации видит все
CREATE POLICY "Employees see own tenders" ON tenders
  FOR SELECT
  USING (
    -- Сотрудник видит только свои назначенные тендеры
    assigned_employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR
    -- Админ организации видит все тендеры своей организации (включая свободные)
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = tenders.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

-- Только админ организации может назначать/переназначать тендеры
CREATE POLICY "Admin can assign tenders" ON tenders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = tenders.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );
```

---

## Файлы для изменения/создания

### Компоненты
- [ ] `components/tenders/TenderForm.tsx` - исправить выбор сотрудника
- [ ] `components/tenders/EmployeeSelect.tsx` - новый компонент выбора сотрудника
- [ ] `components/tenders/TendersDashboard.tsx` - дашборд для админа
- [ ] `components/tenders/TenderStageTimer.tsx` - отображение времени на этапе
- [ ] `components/tenders/QuickAssignModal.tsx` - быстрое назначение

### API
- [ ] `app/api/tenders/employees/route.ts` - список сотрудников для назначения
- [ ] `app/api/tenders/[id]/assign/route.ts` - назначение/переназначение
- [ ] `app/api/tenders/dashboard/route.ts` - данные для дашборда
- [ ] `app/api/tenders/stage-history/route.ts` - история этапов

### Сервисы
- [ ] `lib/tenders/assignment-service.ts` - логика назначения
- [ ] `lib/tenders/stage-tracking-service.ts` - отслеживание этапов

### Миграции
- [ ] `db/migrations/0169_tender_assignment.sql` - поле assigned_employee_id
- [ ] `db/migrations/0170_tender_stage_history.sql` - таблица истории

---

## Порядок реализации

1. **Миграции БД** - добавить поля и таблицы
2. **API для сотрудников** - правильный список из employees
3. **Форма тендера** - исправить выбор сотрудника
4. **API назначения** - логика назначения/переназначения
5. **RLS политики** - видимость по ролям
6. **Realtime** - мгновенные обновления
7. **Дашборд админа** - полная картина
8. **Аналитика времени** - история и метрики

---

## Начало работы

**Текущий шаг:** Исправить список сотрудников в форме тендера
