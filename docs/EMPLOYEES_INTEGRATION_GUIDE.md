# 🔗 Интеграция модуля сотрудников с тендерами

## ✅ Что реализовано

### 1. Страница профиля сотрудника
**URL:** `/tenders/employees/[id]`

**Функционал:**
- ✅ Детальная информация о сотруднике
- ✅ Контактные данные (email, телефон, telegram)
- ✅ Рабочая информация (должность, отдел, дата приема)
- ✅ Статистика (заглушка для будущей интеграции)
- ✅ Кнопка редактирования
- ✅ Навигация назад к списку

**Компоненты:**
- `app/(protected)/tenders/employees/[id]/page.tsx` - серверный компонент
- `app/(protected)/tenders/employees/[id]/employee-profile-client.tsx` - клиентский компонент

### 2. Ссылки на профиль
- ✅ В таблице сотрудников имя стало кликабельным
- ✅ При наведении меняет цвет
- ✅ Ведет на страницу профиля

### 3. Утилиты для интеграции
**Файл:** `lib/employees/client-utils.ts`

**Функции:**
```typescript
// Получить список сотрудников для select
getEmployeesForSelect(companyId, role?)

// Получить менеджеров
getManagersForTender(companyId)

// Получить тендерных специалистов
getTenderSpecialists(companyId)

// Получить всех активных сотрудников
getAllActiveEmployees(companyId)
```

## 🔧 Как интегрировать с формой тендера

### Шаг 1: Обновить форму тендера

В `components/tenders/tender-form-modal.tsx` добавить:

```typescript
import { useEffect, useState } from 'react';
import { getManagersForTender, getTenderSpecialists } from '@/lib/employees/client-utils';

// В компоненте:
const [managers, setManagers] = useState<Array<{id: string; name: string}>>([]);
const [specialists, setSpecialists] = useState<Array<{id: string; name: string}>>([]);

useEffect(() => {
  const loadEmployees = async () => {
    const [managersData, specialistsData] = await Promise.all([
      getManagersForTender(companyId),
      getTenderSpecialists(companyId),
    ]);
    setManagers(managersData);
    setSpecialists(specialistsData);
  };
  
  loadEmployees();
}, [companyId]);

// В JSX заменить:
<select {...register('manager_id')}>
  <option value="">Не назначен</option>
  {managers.map((manager) => (
    <option key={manager.id} value={manager.id}>
      {manager.name}
    </option>
  ))}
</select>
```

### Шаг 2: Добавить фильтр по ответственному

В `app/(protected)/tenders/list/tenders-list-client.tsx`:

```typescript
// Добавить в фильтры:
const [filters, setFilters] = useState({
  // ... существующие фильтры
  manager_id: '',
});

// Добавить select:
<select
  value={filters.manager_id}
  onChange={(e) => setFilters({ ...filters, manager_id: e.target.value })}
>
  <option value="">Все менеджеры</option>
  {managers.map((manager) => (
    <option key={manager.id} value={manager.id}>
      {manager.name}
    </option>
  ))}
</select>
```

### Шаг 3: Обновить API тендеров

В `app/api/tenders/route.ts` добавить фильтр:

```typescript
if (filters.manager_id) {
  query = query.eq('manager_id', filters.manager_id);
}
```

## 📊 Добавление статистики

### Создать функцию получения статистики сотрудника

В `lib/employees/service.ts` добавить:

```typescript
export async function getEmployeeStats(employeeId: string) {
  const supabase = await createClient();
  
  // Получаем тендеры сотрудника
  const { data: tenders } = await supabase
    .from('tenders')
    .select('status')
    .or(`manager_id.eq.${employeeId},specialist_id.eq.${employeeId}`)
    .is('deleted_at', null);
  
  if (!tenders) return null;
  
  const total = tenders.length;
  const won = tenders.filter(t => t.status === 'won').length;
  const lost = tenders.filter(t => t.status === 'lost').length;
  const active = tenders.filter(t => t.status === 'active').length;
  
  return {
    total_tenders: total,
    won_tenders: won,
    lost_tenders: lost,
    active_tenders: active,
    success_rate: total > 0 ? Math.round((won / (won + lost)) * 100) : 0,
  };
}
```

### Создать API endpoint

`app/api/employees/[id]/stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeStats } from '@/lib/employees/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await getEmployeeStats(params.id);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}
```

### Обновить профиль сотрудника

В `employee-profile-client.tsx`:

```typescript
const [stats, setStats] = useState(null);

useEffect(() => {
  const loadStats = async () => {
    const response = await fetch(`/api/employees/${employeeId}/stats`);
    if (response.ok) {
      const data = await response.json();
      setStats(data);
    }
  };
  loadStats();
}, [employeeId]);

// В JSX заменить заглушки:
<div>{stats?.total_tenders || 0}</div>
<div>{stats?.won_tenders || 0}</div>
<div>{stats?.lost_tenders || 0}</div>
<div>{stats?.success_rate || 0}%</div>
```

## 🎯 Дополнительные возможности

### 1. Автоназначение менеджера

При создании тендера можно автоматически назначать менеджера с наименьшей загрузкой:

```typescript
async function getManagerWithLeastLoad(companyId: string) {
  const managers = await getManagersForTender(companyId);
  
  // Для каждого менеджера получаем количество активных тендеров
  const managersWithLoad = await Promise.all(
    managers.map(async (manager) => {
      const response = await fetch(
        `/api/tenders?company_id=${companyId}&manager_id=${manager.id}&status=active`
      );
      const tenders = await response.json();
      return {
        ...manager,
        activeCount: tenders.length,
      };
    })
  );
  
  // Сортируем по загрузке и возвращаем первого
  managersWithLoad.sort((a, b) => a.activeCount - b.activeCount);
  return managersWithLoad[0]?.id;
}
```

### 2. Уведомления о назначении

При назначении сотрудника на тендер отправлять уведомление:

```typescript
async function notifyEmployeeAssignment(employeeId: string, tenderId: string) {
  // Получаем email сотрудника
  const employee = await getEmployeeById(employeeId);
  
  // Отправляем email (через Supabase Edge Function или другой сервис)
  await fetch('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      to: employee.email,
      subject: 'Вы назначены на тендер',
      tender_id: tenderId,
    }),
  });
}
```

### 3. История назначений

Создать таблицу `tender_assignments`:

```sql
CREATE TABLE tender_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  employee_id UUID REFERENCES employees(id),
  role TEXT, -- 'manager', 'specialist', etc.
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id)
);
```

## 📱 UI компоненты

### Компонент выбора сотрудника

`components/employees/employee-selector.tsx`:

```typescript
interface EmployeeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  role?: EmployeeRole;
  label: string;
  required?: boolean;
}

export function EmployeeSelector({
  value,
  onChange,
  role,
  label,
  required,
}: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState([]);
  
  useEffect(() => {
    const load = async () => {
      const data = await getEmployeesForSelect(COMPANY_ID, role);
      setEmployees(data);
    };
    load();
  }, [role]);
  
  return (
    <div>
      <label>
        {label} {required && <span>*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Не назначен</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## ✅ Чек-лист интеграции

- [x] Создана страница профиля сотрудника
- [x] Добавлены ссылки на профиль в таблице
- [x] Созданы утилиты для получения списков сотрудников
- [ ] Обновлена форма тендера (использовать утилиты)
- [ ] Добавлен фильтр тендеров по ответственному
- [ ] Создан API endpoint статистики
- [ ] Обновлен профиль с реальной статистикой
- [ ] Добавлены уведомления о назначении
- [ ] Создана история назначений

## 🚀 Следующие шаги

1. **Обновить форму тендера** - использовать новые утилиты для загрузки сотрудников
2. **Добавить фильтр** - фильтровать тендеры по ответственному
3. **Реализовать статистику** - показывать реальные данные в профиле
4. **Добавить уведомления** - оповещать сотрудников о назначении
5. **Создать дашборд** - показывать загрузку менеджеров

---

**Основа готова! Теперь можно постепенно добавлять дополнительный функционал.** 🎉
