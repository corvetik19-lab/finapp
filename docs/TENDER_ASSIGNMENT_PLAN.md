# План разработки: Назначение тендеров сотрудникам

## Общее описание
Система назначения тендеров сотрудникам с полным контролем для админа организации, realtime обновлениями и аналитикой времени на этапах.

---

## Задачи

### 1. Исправить список сотрудников при создании/редактировании тендера
**Статус:** ✅ Выполнено

**Проблема:** В выпадающем списке сотрудников отображаются неправильные роли (все "Наблюдатели")

**Решение:**
- [x] Найти компонент формы тендера где выбирается сотрудник
- [x] Изменить запрос чтобы брать сотрудников из таблицы `employees` с их ролями (из role_data)
- [x] Отображать правильную роль сотрудника в списке выбора

---

### 2. Источник сотрудников - только из таблицы employees
**Статус:** ✅ Выполнено

**Требование:** Назначать можно только сотрудников добавленных в "Сотрудники", не из users

**Решение:**
- [x] Изменить API endpoint для получения списка сотрудников (/api/employees)
- [x] Использовать таблицу `employees` вместо `users`
- [x] Фильтровать только активных сотрудников (`deleted_at IS NULL`)

---

### 3. Видимость тендеров по ролям
**Статус:** ✅ Выполнено (RLS политики применены)

**Требования:**
- Сотрудник видит только **свои** назначенные тендеры
- Админ организации видит **все** тендеры своей организации
- Свободные тендеры (без назначенного сотрудника) отображаются отдельно для админа

**Примечание:** Супер-админ управляет только приложением в целом, для работы с тендерами он использует свою роль админа организации в своей организации.

**Решение:**
- [x] Создать RLS политики для таблицы `tenders` (миграция 0169)
- [x] Используется `tender_responsible` для связи тендер-сотрудник
- [x] Реализована проверка роли в API
- [x] Фильтрация на уровне RLS и API
- [x] Отдельный блок "Свободные тендеры" в /api/tenders/admin-overview

---

### 4. Назначение и переназначение тендеров
**Статус:** ✅ Выполнено (API /api/tenders/[id]/assign)

**Требования:**
- Админ организации может назначить неназначенный тендер сотруднику
- Можно переназначить тендер на любом этапе
- При переназначении сохраняется текущий этап и вся информация

**Решение:**
- [x] API endpoint `/api/tenders/[id]/assign` для назначения/переназначения
- [x] Логика сохранения этапа при переназначении
- [x] Валидация: только админ может назначать/переназначать

---

### 5. Realtime обновления
**Статус:** ✅ Настроено (таблицы добавлены в supabase_realtime)

**Требования:**
- При назначении тендера он моментально появляется у сотрудника
- При переназначении тендер исчезает у старого и появляется у нового сотрудника

**Решение:**
- [x] Таблицы `tenders` и `tender_responsible` добавлены в supabase_realtime
- [ ] Подписка на изменения в компонентах
- [ ] Обновление UI без перезагрузки страницы

---

### 6. Дашборд для админа организации
**Статус:** ✅ Выполнено полностью

**Требования:**
- Полная картина всех тендеров организации
- Группировка по этапам
- Информация о сотруднике, работающем с тендером
- Время нахождения на текущем этапе
- Быстрое назначение/переназначение

**Решение:**
- [x] API `/api/tenders/admin-overview` с полной информацией
- [x] `QuickAssignModal` - компонент быстрого назначения
- [x] `TendersAdminDashboard` - полный дашборд для админа
- [x] `TenderStageTimer` - индикатор времени на этапе
- [x] Страница `/tenders/admin` для админа

---

### 7. Аналитика времени на этапах
**Статус:** ✅ Выполнено (таблица tender_stage_history расширена)

**Требования:**
- Фиксировать время входа на каждый этап
- Показывать сколько времени тендер на текущем этапе
- Сохранять историю переходов для аналитики

**Решение:**
- [x] Расширена таблица `tender_stage_history` (entered_at, exited_at, employee_id)
- [x] Обновлён триггер `log_tender_stage_change()` для закрытия этапов
- [x] Функция `get_tender_stage_duration()` для расчёта времени
- [x] Время на этапе в `/api/tenders/admin-overview`

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
