# 💰 План редизайна модуля "Финансы" на shadcn/ui

> **Цель:** Переработать все страницы финансового модуля на shadcn/ui компоненты
> **Эстетика:** Corporate Minimalism — как в модуле "Тендеры"
> **Принцип:** Единый sidebar + header, карточки shadcn, таблицы, модалки

---

## 📋 Структура модуля "Финансы"

### Страницы для редизайна:
1. **Dashboard** (`/finance/dashboard`) — главная страница с виджетами
2. **Транзакции** (`/finance/transactions`) — список транзакций
3. **Счета/Карты** (`/finance/cards`) — управление счетами
4. **Бюджеты** (`/finance/budgets`) — бюджеты по категориям
5. **Планы** (`/finance/plans`) — финансовые цели
6. **Кредиты** (`/finance/loans`) — управление кредитами
7. **Кредитные карты** (`/finance/credit-cards`) — кредитные карты
8. **Платежи** (`/finance/payments`) — регулярные платежи
9. **Чеки** (`/finance/receipts`) — сканирование чеков
10. **Отчёты** (`/finance/reports`) — финансовые отчёты
11. **Прогнозы** (`/finance/forecasts`) — прогнозирование
12. **Аналитика** (`/finance/analytics/advanced`) — расширенная аналитика
13. **Настройки** (`/finance/settings`) — настройки модуля

---

## 🎯 Этапы реализации

### Этап 1: Создание базового Layout ✅
- [x] Создать `FinanceLayout` компонент по аналогии с `TendersLayout`
- [x] Создать `FinanceSidebar` с навигацией по разделам
- [x] Настроить breadcrumbs для финансового модуля
- [x] Добавить header с toggle sidebar
- [x] Интегрировать layout во все страницы финансов

### Этап 2: Dashboard (Главная) ✅ Завершено
- [x] Переработать summary cards на shadcn Card
- [x] Обновить DashboardClient на shadcn Button
- [x] Обновить BudgetSection на shadcn компоненты
- [x] Обновить BudgetStatusWidget на shadcn Progress
- [x] Обновить FinancialTrendsCard на shadcn Card + Select
- [x] Обновить ExpenseByCategoryCard на shadcn Card + Select
- [x] Обновить NetWorthWidget на shadcn Card + Button
- [x] Обновить PlansWidget на shadcn Card + Progress + Dialog
- [x] Обновить DashboardCustomizer на shadcn Dialog
- [x] Обновить SortableWidget на shadcn Switch + Tailwind
- [x] Обновить WidgetLibrary на shadcn Button + Tailwind
- [x] Обновить ProductManagementCard на shadcn Card + Select
- [x] Обновить RecentNotesCard на shadcn Card + Form
- [x] Обновить UpcomingPaymentsCard на shadcn Card + Select + Dialog
- [x] Обновить CategoryManagementCard на shadcn Card + Select + Button

### Этап 3: Транзакции ✅
- [x] Обновить header с кнопками действий
- [x] Переработать analytics cards на shadcn Card
- [x] Обновить AccountsSection на shadcn Collapsible + Card
- [x] Переработать фильтры на shadcn Select/Input
- [x] Обновить QuickTransactionButton на shadcn Dialog + Button
- [x] Обновить QuickPresetsManager на shadcn Card + Table + Select
- [x] Обновить ImportCsvModal на shadcn Dialog + Table
- [x] Обновить FileViewerModal на shadcn Dialog
- [x] Обновить ExportCsvButton на shadcn Button
- [x] Обновить ImportCsvTrigger на shadcn Button
- [x] Обновить LoadMoreButton на shadcn Button
- [x] Переработать TransactionsGroupedList на shadcn Dialog + Collapsible + Tailwind

### Этап 4: Счета/Карты ✅
- [x] Переработать список счетов на Card grid
- [x] Обновить модалку добавления счёта (AddCardModal → shadcn Dialog)
- [x] Обновить модалку пополнения (AddFundsModal → shadcn Dialog)
- [x] Обновить модалку перевода (TransferModalLauncher → shadcn Dialog)
- [x] Обновить EditDebitCardButton → shadcn Dialog
- [x] Обновить ReportsModal → shadcn Dialog
- [x] Удалить cards.module.css

### Этап 5: Бюджеты ✅
- [x] Переработать страницу бюджетов на shadcn Card
- [x] Обновить BudgetsList на shadcn Card + Progress
- [x] Обновить BudgetForm на shadcn Card + Input
- [x] Обновить SavingsDistribution на shadcn Collapsible
- [x] Удалить Budgets.module.css и SavingsDistribution.module.css

### Этап 6: Планы (Цели) ✅
- [x] Переработать PlansPageClient на shadcn Card + Dialog
- [x] Обновить прогресс-бары на shadcn Progress
- [x] Обновить модалки создания/редактирования и взносов на shadcn Dialog
- [x] Удалить page.module.css

### Этап 7: Кредиты ✅
- [x] Переработать LoansPageClient на shadcn Card + Button + Progress
- [x] Обновить LoanFormModal на shadcn Dialog + Input + Select
- [x] Обновить LoanRepayModal на shadcn Dialog + Input + Textarea
- [x] Обновить LoanTransactionsModal на shadcn Dialog + Button
- [x] Удалить Loans.module.css, LoanModal.module.css, LoanTransactionsModal.module.css

### Этап 8: Платежи ✅
- [x] Переработать PaymentsPageClient на shadcn Card + Select + Tailwind
- [x] Обновить page.tsx на Tailwind
- [x] Удалить page.module.css и PaymentsPageClient.module.css
- [x] UpcomingPaymentsCard уже мигрирован в Этапе 2 (Дашборд)

### Этап 9: Чеки ✅
- [x] Обновить FloatingReceiptButton на shadcn Button + lucide-react
- [x] Обновить ReceiptsManager на shadcn Card + Dialog + Button
- [x] Удалить FloatingReceiptButton.module.css и ReceiptsManager.module.css
- [x] ReceiptChatModal.tsx → shadcn Button + Input + Dialog + Tailwind (полная переработка ~780 строк)

### Этап 10: Отчёты ✅
- [x] Обновить ReportsList на shadcn Button + lucide-react + Tailwind
- [x] Удалить ReportsList.module.css
- [x] ReportBuilder.tsx → shadcn Button + Input + Tailwind
- [x] ReportChart.tsx → shadcn Button + Tailwind

### Этап 11: Прогнозы и Аналитика ✅
- [x] Обновить AdvancedAnalyticsClient на shadcn Card + Button + Tailwind
- [x] Удалить AdvancedAnalytics.module.css и Analytics.module.css
- [ ] Дочерние компоненты (PeriodComparisonView, SeasonalityView, TrendsView, FinancialHealthView) используют общий CSS

### Этап 12: Настройки ✅
- [x] ProductItemsManager.tsx → shadcn Card + Table + Button + Input + Select
- [x] QuickPresetsManager.tsx уже мигрирован на shadcn/ui
- [x] Удалить ProductItemsManager.module.css и QuickPresetsManager.module.css

### Этап 13: Дополнительные компоненты транзакций ✅
- [x] TransactionItems.tsx → shadcn Checkbox + Button + Input + Tailwind
- [x] ProductAutocomplete.tsx → shadcn Input + Button + Tailwind
- [x] AttachmentsList.tsx → shadcn Button + Tailwind
- [x] FileUpload.tsx → shadcn Button + Tailwind
- [x] ExpenseStructure.tsx → shadcn Card + Progress + Tailwind
- [x] SummaryWithPeriod.tsx → shadcn Card + Select + Input + Tailwind
- [x] ClientPaginatedList.tsx → shadcn Button + Tailwind
- [x] Удалены соответствующие CSS модули

### Статус миграции Finance модуля: ✅ ЗАВЕРШЁН

### Этап 14: Analytics Views ✅
- [x] PeriodComparisonView.tsx → shadcn Card + Button + Table
- [x] TrendsView.tsx → shadcn Card + Tailwind
- [x] SeasonalityView.tsx → shadcn Card + Tailwind
- [x] FinancialHealthView.tsx → shadcn Card + Tailwind

### Этап 15: AI Analytics ✅
- [x] AIAnalyticsContent.tsx → shadcn Button + Tailwind
- [x] AIInsights.tsx → shadcn Card + lucide icons
- [x] FinancialHealthScore.tsx → shadcn Card + SVG progress
- [x] FinancialTips.tsx → shadcn Card
- [x] AnomaliesDetection.tsx → shadcn Card + Badge
- [x] ForecastChart.tsx → shadcn Card + Badge + Chart.js

### Этап 16: Calculator ✅
- [x] Calculator.tsx → shadcn Card + Button
- [x] AmountInputWithCalculator.tsx → shadcn Input + Button + Label

### Этап 17: Forecasts ✅
- [x] EnhancedForecastView.tsx → shadcn Card + Select + Table
- [x] GoalForecastView.tsx → shadcn Card + Progress + Badge
- [x] OptimizationView.tsx → shadcn Card + Badge
- [x] SpendingAlertsView.tsx → shadcn Card + Badge + Progress

### Этап 18: Gamification & Notifications ✅
- [x] AchievementNotification.tsx → shadcn Card + Badge + Button
- [x] StreakWidget.tsx → shadcn Card
- [x] NotificationBell.tsx → shadcn Button + Badge
- [x] NotificationPanel.tsx → shadcn Card + Button
- [x] SmartNotificationsList.tsx → shadcn Card + Button + Badge

### Этап 19: Onboarding ✅
- [x] FirstStepsChecklist.tsx → shadcn Card + Progress + Checkbox + Button
- [x] OnboardingChecklist.tsx → shadcn Card + Progress + Button
- [x] OnboardingTour.tsx → shadcn Card + Progress + Button

### Этап 20: Offline & Chat ✅
- [x] OfflineIndicator.tsx → shadcn Badge + lucide icons
- [x] QuickCommands.tsx → shadcn Card + Button

### Этап 21: Layout & Settings ✅
- [x] ThemeSelector.tsx → Tailwind + lucide icons
- [x] UserProfileDropdown.tsx → Tailwind + lucide icons
- [x] ProtectedShell.tsx → shadcn Button + Tailwind
- [x] FileUploader.tsx → shadcn Button + Card
- [x] SettingsNav.tsx → Tailwind + lucide icons
- [x] SettingsShell.tsx → shadcn Card + Button
- [x] ProfileManager.tsx → shadcn Card + Dialog + Button + Input

### Этап 22: Platform ✅
- [x] ModeSidebar.tsx → Tailwind + lucide icons
- [x] OrganizationSwitcher.tsx → shadcn Button + Badge
- [x] NotificationCenter.tsx → shadcn Button + Badge
- [x] ModePlaceholder.tsx → shadcn Card + Button + Badge
- [x] PlatformHeader.tsx → уже мигрирован (shadcn Button + Input)
- [x] UserMenu.tsx → уже мигрирован (shadcn DropdownMenu)
- [x] Удалены Platform.module.css, ModePlaceholder.module.css

### Этап 23: Toast & Mobile ✅
- [x] ToastContainer.tsx → Tailwind + lucide icons
- [x] MobileReceiptsManager.tsx → shadcn Button + Card

### Этап 24: Dashboard Modals ✅
- [x] BudgetQuickAddForm.tsx → shadcn Button + Input + Label + Select
- [x] CategoryTransactionsModal.tsx → shadcn Dialog + Badge
- [x] WidgetSettingsModal.tsx → shadcn Dialog + Checkbox
- [x] UpcomingPaymentFormModal.tsx → shadcn Dialog + Button + Input + Select
- [x] Удалён Dashboard.module.css

### Этап 25: Notes & Admin ✅
- [x] NotesPageClient.tsx → shadcn Dialog + Table + Badge + Input + Checkbox
- [x] create-organization-modal.tsx → shadcn Dialog + Button + Input + Select + Checkbox
- [x] organizations-list.tsx → shadcn Table + Badge + Button
- [x] Удалены NotesPage.module.css, CreateOrganizationModal.module.css, OrganizationsList.module.css, OrganizationDetails.module.css

### Этап 26: Dictionaries ✅
- [x] PlatformsPage.tsx → shadcn Dialog + Table + Card + Badge + Button + Input + Select
- [x] CustomersPage.tsx → shadcn Dialog + Table + Card + Badge + Button + Input + Select + Checkbox
- [x] Удалены PlatformsPage.module.css, CustomersPage.module.css

### Этап 27: Logistics ✅
- [x] ShipmentsManager.tsx → shadcn Card + Button + Tailwind
- [x] ShipmentsTable.tsx → shadcn Table + Button + Badge + Select + Input
- [x] ShipmentFormModal.tsx → shadcn Dialog + Input + Label + Select + RadioGroup + Textarea
- [x] Удалены ShipmentsManager.module.css, ShipmentsTable.module.css, ShipmentFormModal.module.css

### Этап 28: Settings ✅
- [x] FinanceSettingsShell.tsx → shadcn Tabs + lucide-react
- [x] FinanceGeneralSettings.tsx → shadcn Card + Checkbox + Select + Input + Button
- [x] ApiKeysManager.tsx → shadcn Card + Button + Input + Checkbox + Badge + Alert
- [x] DepartmentsSettings.tsx → shadcn Dialog + Card + Button + Select + Checkbox + Badge
- [x] IntegrationsManager.tsx → shadcn Card + Button + Input + Badge + Alert
- [x] LegalEntitiesManager.tsx → shadcn Dialog + Card + Tabs + Button + Input + Select + Checkbox + Badge + Alert
- [x] OrganizationSettings.tsx → shadcn Card + Button + Input + Badge + Alert
- [x] RolesManager.tsx → shadcn Dialog + Card + Button + Input + Textarea + Checkbox + Badge
- [x] UsersManager.tsx → shadcn Dialog + Table + Button + Input + Select + Badge
- [x] modes/FinanceModeSettings.tsx → shadcn Card + Button + Select + Alert + Badge
- [x] Удалены все *.module.css из components/settings/

### Этап 29: Employees ✅
- [x] AbsenceCalendar.tsx → shadcn Card + Button + Input + Select + Badge + Alert
- [x] AvatarUploader.tsx → shadcn Button + lucide-react
- [x] ImageCropper.tsx → shadcn Button + lucide-react
- [x] DepartmentsManager.tsx → shadcn Card + Button + Input + Textarea + Alert
- [x] InvitationsList.tsx → shadcn Card + Button + Badge + Alert
- [x] employee-form-modal.tsx → shadcn Dialog + Input + Label + Textarea + Checkbox + Alert
- [x] EmployeeActivityChart.tsx → lucide-react + Tailwind
- [x] EmployeeHistory.tsx → lucide-react + Tailwind
- [x] EmployeeComparison.tsx → shadcn Table + Badge
- [x] EmployeeDocuments.tsx → shadcn Card + Button + Input + Textarea + Badge + Alert
- [x] EmployeeNotifications.tsx → shadcn Card + Button + Badge
- [x] EmployeeTendersKanban.tsx → shadcn Badge + Tailwind
- [x] Удалены все *.module.css из components/employees/

### Этап 30: AI & Admin ✅
- [x] AIAdvisorClient.tsx → shadcn Button + Badge + Tailwind + Chart.js (полная переработка ~690 строк)
- [x] Chat-fixed.tsx → shadcn Button + Tailwind
- [x] webhooks/page.tsx → shadcn Button + Input + Checkbox + Dialog + Badge + Tailwind
- [x] Удалены AIAdvisor.module.css, Chat.module.css, webhooks.module.css

Все CSS модули успешно мигрированы!

---

## 🧩 Компоненты для создания

### Layout компоненты:
- `components/finance/finance-layout.tsx` — основной layout
- `components/finance/finance-sidebar.tsx` — боковое меню

### Общие компоненты:
- `components/finance/finance-card.tsx` — карточка с метриками
- `components/finance/finance-table.tsx` — таблица данных
- `components/finance/amount-display.tsx` — отображение суммы
- `components/finance/period-selector.tsx` — выбор периода

---

## 📁 Структура файлов

```
components/finance/
├── finance-layout.tsx          # Основной layout
├── finance-sidebar.tsx         # Боковое меню
├── dashboard/
│   ├── summary-cards.tsx       # Карточки итогов
│   ├── budget-widget.tsx       # Виджет бюджетов
│   ├── trends-widget.tsx       # График трендов
│   ├── category-widget.tsx     # Расходы по категориям
│   └── ...
├── transactions/
│   ├── transaction-list.tsx    # Список транзакций
│   ├── transaction-filters.tsx # Фильтры
│   ├── transaction-form.tsx    # Форма добавления
│   └── ...
├── accounts/
│   ├── account-card.tsx        # Карточка счёта
│   ├── account-list.tsx        # Список счетов
│   └── ...
└── ...
```

---

## 🎨 Стилевые решения

### Цветовая схема:
- **Доходы:** `text-green-600`, `bg-green-50`
- **Расходы:** `text-red-600`, `bg-red-50`
- **Переводы:** `text-blue-600`, `bg-blue-50`
- **Нейтральный:** `text-gray-600`, `bg-gray-50`

### Типографика:
- Заголовки: `text-2xl font-semibold tracking-tight`
- Подзаголовки: `text-sm text-muted-foreground`
- Суммы: `text-xl font-bold` или `text-2xl font-bold`

### Отступы:
- Между секциями: `space-y-6`
- Внутри карточек: `p-4` или `p-6`
- Grid gap: `gap-4`

---

## ✅ Прогресс выполнения

| Этап | Описание | Статус |
|------|----------|--------|
| 1 | Базовый Layout | ✅ Готово |
| 2 | Dashboard | ✅ Готово |
| 3 | Транзакции | ✅ Готово |
| 4 | Счета/Карты | ✅ Готово |
| 5 | Бюджеты | ✅ Готово |
| 6 | Планы | ✅ Готово |
| 7 | Кредиты | ✅ Готово |
| 8 | Платежи | ✅ Готово |
| 9 | Чеки | ✅ Готово |
| 10 | Отчёты | ✅ Готово |
| 11 | Прогнозы | ✅ Готово |
| 12 | Настройки | ✅ Готово |
| 17 | Forecasts | ✅ Готово |
| 18 | Gamification | ✅ Готово |
| 19 | Onboarding | ✅ Готово |
| 20 | Offline/Chat | ✅ Готово |
| 21 | Layout/Settings | ✅ Готово |

---

## ✅ Миграция на shadcn/ui — ЗАВЕРШЕНА (04.12.2024)

### Выполнено:

**Все `<button>` мигрированы на shadcn Button (0 осталось):**

- ✅ `components/admin/organization-details.tsx` → shadcn Tabs + Button
- ✅ `components/admin/users-table.tsx` → shadcn Select + Badge
- ✅ `app/(protected)/admin/settings/modes/tenders/page.tsx` → shadcn Card/Select/Input/Checkbox/Button
- ✅ `components/layout/Navigation.tsx` → shadcn Button
- ✅ `components/layout/UserProfileDropdown.tsx` → shadcn DropdownMenu
- ✅ `components/platform/ModeSidebar.tsx` → shadcn Button
- ✅ `components/dashboard/ThemeSelector.tsx` → shadcn Button
- ✅ `components/toast/ToastContainer.tsx` → shadcn Button
- ✅ `components/tenders/NotificationBell.tsx` → shadcn Button + Lucide icons
- ✅ `components/tenders/tender-attachments.tsx` → shadcn Button
- ✅ `components/tenders/tender-comments.tsx` → shadcn Button
- ✅ `components/tenders/tender-kanban.tsx` → shadcn Button
- ✅ `app/(protected)/finance/loans/recalculate-button.tsx` → shadcn Button
- ✅ `app/(protected)/finance/transactions/page.tsx` → shadcn Button
- ✅ `app/(protected)/personal/bookmarks/page.tsx` → shadcn Button/Input/Select/Card
- ✅ `app/(protected)/personal/prompts/page.tsx` → shadcn Button/Card
- ✅ `app/(protected)/settings/security/page.tsx` → shadcn Card/Button
- ✅ `app/(public)/login/page.tsx` → shadcn Card/Button/Input/Alert
- ✅ `app/(public)/reset-password/page.tsx` → shadcn Card/Button/Input/Alert
- ✅ `app/global-error.tsx` → shadcn Button

**Заменены `<img>` на next/image Image:**
- ✅ `components/employees/AvatarUploader.tsx`
- ✅ `components/employees/EmployeeComparison.tsx`
- ✅ `components/transactions/AttachmentsList.tsx`
- ✅ `components/settings/DepartmentsSettings.tsx`
- ✅ `components/settings/OrganizationSettings.tsx`

### Нативные `<select>` — оставлены намеренно:

**С `optgroup` (shadcn Select не поддерживает группировку):**
- `components/budgets/BudgetForm.tsx` — группы категорий
- `components/product-items/ProductItemsManager.tsx`
- `app/(protected)/finance/transactions/txn/AddTransactionButton.tsx`
- `app/(protected)/finance/transactions/txn/TransactionForm.tsx`
- `app/(protected)/finance/transactions/txn/TransferButton.tsx`

**С `{...register()}` от react-hook-form (требует Controller):**
- `components/employees/employee-form-modal.tsx`
- `components/tenders/tender-form-modal.tsx`
- Другие формы с react-hook-form

> **Примечание:** Все нативные select стилизованы Tailwind CSS классами (`border-input`, `bg-background`, `rounded-md`) и визуально соответствуют shadcn.

---

## 📊 Итоговая статистика миграции

| Категория | Статус |
|-----------|--------|
| CSS Modules | ✅ 100% (0 файлов) |
| Button → shadcn | ✅ 100% |
| `<img>` → next/image | ✅ 100% |
| Dialog/Modal | ✅ 100% |
| Input → shadcn | ✅ 100% |
| Card → shadcn | ✅ 100% |
| Select → shadcn | ⚠️ Частично (optgroup/register не поддерживаются) |

### TypeScript & ESLint:
- ✅ `npx tsc --noEmit` — 0 ошибок
- ✅ `npm run lint` — 0 ошибок, 0 warnings

---

## �📝 Заметки

- Все CSS Modules постепенно заменяем на Tailwind классы
- Используем shadcn/ui компоненты из `@/components/ui/`
- Сохраняем существующую бизнес-логику
- Модалки переводим на shadcn Dialog
- Формы переводим на React Hook Form + shadcn Form
