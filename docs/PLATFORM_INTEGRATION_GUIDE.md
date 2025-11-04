# 🚀 Руководство по интеграции Platform Shell

## Что создано

### ✅ Компоненты платформы

1. **PlatformHeader** - постоянная верхняя панель
2. **ModeSwitcher** - переключатель режимов
3. **ModePlaceholder** - заглушки для новых режимов  
4. **CSS стили** - готовые стили Platform.module.css

### ✅ Библиотеки

1. **mode-registry.ts** - реестр режимов с конфигурацией
2. **organization.ts** - helpers для работы с организациями

### ✅ База данных

- Multi-tenancy структура
- RLS политики
- Вспомогательные функции SQL

## Шаги интеграции

### Шаг 1: Использование PlatformHeader

Добавьте Header в root layout или создайте platform layout:

```typescript
// app/layout.tsx или app/(platform)/layout.tsx
import PlatformHeader from "@/components/platform/PlatformHeader";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { createRouteClient } from "@/lib/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const organization = user ? await getCurrentOrganization() : null;

  return (
    <html lang="ru">
      <body>
        {user && (
          <PlatformHeader
            user={{
              email: user.email,
              full_name: user.user_metadata?.full_name,
            }}
            organization={organization ? { name: organization.name } : undefined}
            notificationCount={0}
          />
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Шаг 2: Создание placeholder страниц

Создайте страницы-заглушки для новых режимов:

```bash
# Investments
mkdir -p app/(protected)/investments
```

```typescript
// app/(protected)/investments/page.tsx
import ModePlaceholder from "@/components/platform/ModePlaceholder";

export default function InvestmentsPage() {
  return <ModePlaceholder modeKey="investments" />;
}
```

```bash
# Personal
mkdir -p app/(protected)/personal
```

```typescript
// app/(protected)/personal/page.tsx
import ModePlaceholder from "@/components/platform/ModePlaceholder";

export default function PersonalPage() {
  return <ModePlaceholder modeKey="personal" />;
}
```

```bash
# Tenders
mkdir -p app/(protected)/tenders
```

```typescript
// app/(protected)/tenders/page.tsx
import ModePlaceholder from "@/components/platform/ModePlaceholder";

export default function TendersPage() {
  return <ModePlaceholder modeKey="tenders" />;
}
```

### Шаг 3: Обновление глобальных стилей

Убедитесь, что в globals.css есть CSS-переменные:

```css
/* styles/globals.css */
:root {
  /* Surface colors */
  --surface-primary: #ffffff;
  --surface-secondary: #f8f9fa;
  --surface-tertiary: #e9ecef;
  --surface-hover: #f1f3f5;
  --surface-active: #e7f5ff;

  /* Text colors */
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-tertiary: #adb5bd;

  /* Border colors */
  --border-primary: #dee2e6;
  --border-hover: #adb5bd;

  /* Brand colors */
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-alpha: rgba(99, 102, 241, 0.1);
  
  --success: #10b981;
  --danger: #ef4444;
}

[data-theme="dark"] {
  --surface-primary: #1a1b1e;
  --surface-secondary: #25262b;
  --surface-tertiary: #2c2e33;
  --surface-hover: #373a40;
  --surface-active: #1e293b;

  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;
  --text-tertiary: #6c757d;

  --border-primary: #373a40;
  --border-hover: #495057;
}
```

### Шаг 4: Проверка работы Mode Switcher

ModeSwitcher автоматически определит текущий режим из URL:

- `/finance/*` → Финансы
- `/investments/*` → Инвестиции
- `/personal/*` → Личные
- `/tenders/*` → Тендеры

### Шаг 5: Тестирование переключения режимов

1. Откройте `/finance/dashboard`
2. Кликните на Mode Switcher
3. Выберите другой режим (например, Investments)
4. Убедитесь, что показывается placeholder
5. Вернитесь к финансам

## API для работы с организациями

### Получить текущую организацию

```typescript
import { getCurrentOrganization } from "@/lib/platform/organization";

const org = await getCurrentOrganization();
console.log(org?.name);
```

### Проверить роль пользователя

```typescript
import { getUserRole, isOrganizationAdmin } from "@/lib/platform/organization";

const role = await getUserRole(orgId);
const isAdmin = await isOrganizationAdmin(orgId);
```

### Проверить, включён ли режим

```typescript
import { isModeEnabled } from "@/lib/platform/organization";

const enabled = await isModeEnabled(orgId, 'investments');
if (!enabled) {
  // Показать сообщение о необходимости включить режим
}
```

### Создать новую организацию

```typescript
import { createOrganization } from "@/lib/platform/organization";

const org = await createOrganization('Моя компания', 'my-company');
```

## Mode Registry API

### Получить доступные режимы

```typescript
import { getAvailableModes } from "@/lib/platform/mode-registry";

const modes = getAvailableModes(); // Только enabled
```

### Проверить права доступа

```typescript
import { checkModePermission } from "@/lib/platform/mode-registry";

const canEdit = checkModePermission('finance', 'member', 'edit');
```

### Получить режимы для роли

```typescript
import { getModesForRole } from "@/lib/platform/mode-registry";

const modes = getModesForRole('admin');
```

## Включение новых режимов

Когда режим готов, просто измените флаг в mode-registry.ts:

```typescript
// lib/platform/mode-registry.ts
export const MODE_REGISTRY = {
  investments: {
    // ...
    isEnabled: true, // Было: false
    // ...
  },
};
```

Затем создайте реальную страницу вместо placeholder:

```typescript
// app/(protected)/investments/dashboard/page.tsx
export default function InvestmentsDashboard() {
  return (
    <div>
      <h1>Инвестиции - Dashboard</h1>
      {/* Ваш функционал */}
    </div>
  );
}
```

## Middleware для проверки доступа

Создайте middleware для защиты режимов:

```typescript
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  // Проверка доступа к режиму
  const path = req.nextUrl.pathname;
  if (path.startsWith("/investments") || 
      path.startsWith("/personal") || 
      path.startsWith("/tenders")) {
    // Можно добавить дополнительные проверки прав доступа
  }
  
  return res;
}

export const config = {
  matcher: [
    "/finance/:path*",
    "/investments/:path*",
    "/personal/:path*",
    "/tenders/:path*",
  ],
};
```

## Следующие шаги

### Готово к использованию ✅
- [x] Database migration
- [x] Mode Registry
- [x] Platform Header
- [x] Mode Switcher
- [x] Placeholders
- [x] Organization helpers

### Рекомендуется добавить 🎯

1. **User Menu** - выпадающее меню с профилем/настройками
2. **Notification Center** - центр уведомлений
3. **Organization Switcher** - переключение между организациями
4. **Settings Pages** - страницы управления

5. **Mode-specific Sidebars** - боковые меню для каждого режима
6. **Breadcrumbs** - навигационные хлебные крошки
7. **Search** - глобальный поиск по платформе

## Troubleshooting

### ModeSwitcher не показывает режимы

Проверьте:
- `MODE_REGISTRY` экспортирован
- `isEnabled: true` для режимов
- CSS файл подключён

### Placeholder не отображается

Проверьте:
- Путь к странице соответствует `routes.root` в mode-registry
- ModePlaceholder.module.css подключён
- modeKey передан правильно

### RLS блокирует запросы

Проверьте:
- Пользователь добавлен в organization_members
- org_id установлен для всех записей
- Политики включены: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

## Результат

После интеграции у вас будет:

✅ **Единый Header** на всех страницах  
✅ **Переключатель режимов** с красивым UI  
✅ **Заглушки** для будущих режимов  
✅ **Multi-tenancy** на уровне БД  
✅ **Система прав** через роли  
✅ **API** для работы с организациями  

---

**Платформа готова к расширению!** 🚀  
Добавляйте новые режимы постепенно, включая их feature flags.
