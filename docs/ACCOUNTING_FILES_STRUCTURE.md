# Структура файлов модуля Бухгалтерия

## Этап 1: Дашборд

```
components/accounting/dashboard/
├── AccountingDashboardNew.tsx       # Новый главный дашборд
├── FinancialOverviewWidget.tsx      # Финансовый обзор
├── CashFlowWidget.tsx               # Денежный поток
├── ReceivablesWidget.tsx            # Дебиторка
├── PayablesWidget.tsx               # Кредиторка
├── TenderProfitabilityWidget.tsx    # Рентабельность тендеров
├── TaxCalendarWidget.tsx            # Налоговый календарь
├── UnpaidInvoicesWidget.tsx         # Неоплаченные счета
├── QuickActionsWidget.tsx           # Быстрые действия
└── DashboardFilters.tsx             # Фильтры периодов

lib/accounting/dashboard/
├── types.ts                         # Типы для дашборда
├── widgets-service.ts               # Сервис получения данных
└── export-pdf.ts                    # Экспорт в PDF
```

## Этап 2: Документооборот

```
app/(protected)/tenders/accounting/
├── cash-orders/
│   ├── page.tsx                     # Список ПКО/РКО
│   ├── new/page.tsx                 # Создание ордера
│   └── [id]/page.tsx                # Просмотр/редактирование
├── advance-reports/
│   ├── page.tsx                     # Список авансовых отчётов
│   ├── new/page.tsx                 # Создание отчёта
│   └── [id]/page.tsx                # Просмотр/редактирование
├── power-of-attorney/
│   ├── page.tsx                     # Список доверенностей
│   └── new/page.tsx                 # Создание доверенности
└── reconciliation-acts/
    ├── page.tsx                     # Список актов сверки
    └── [counterpartyId]/page.tsx    # Акт сверки

components/accounting/documents/
├── CashOrderForm.tsx                # Форма ПКО/РКО
├── CashOrderPrint.tsx               # Печатная форма
├── AdvanceReportForm.tsx            # Форма авансового отчёта
├── PowerOfAttorneyForm.tsx          # Форма доверенности
├── ReconciliationActForm.tsx        # Форма акта сверки
└── QRPaymentCode.tsx                # QR-код СБП

lib/accounting/documents/
├── cash-orders.ts                   # Сервис кассовых ордеров
├── advance-reports.ts               # Сервис авансовых отчётов
├── power-of-attorney.ts             # Сервис доверенностей
└── reconciliation-acts.ts           # Сервис актов сверки
```

## Этап 3: Интеграция с тендерами

```
app/(protected)/tenders/accounting/
├── tender-budget/[tenderId]/page.tsx
├── tender-pnl/[tenderId]/page.tsx
└── contract-payments/[tenderId]/page.tsx

components/accounting/tenders/
├── TenderBudgetForm.tsx
├── TenderBudgetTable.tsx
├── TenderExpenseTracker.tsx
├── TenderPaymentSchedule.tsx
├── TenderGuarantees.tsx
├── TenderPenalties.tsx
├── TenderPnLDetail.tsx
└── TenderSubcontractors.tsx

lib/accounting/tenders/
├── types.ts
├── budget-service.ts
├── expense-tracker.ts
├── payment-schedule.ts
├── guarantees.ts
├── penalties.ts
└── pnl-report.ts
```

## Этап 4: Платёжный календарь

```
app/(protected)/tenders/accounting/
├── payment-calendar/page.tsx
├── cash-register/page.tsx
└── encashment/page.tsx

components/accounting/cash/
├── PaymentCalendar.tsx
├── PlannedPaymentForm.tsx
├── CashRegister.tsx
├── EncashmentForm.tsx
└── CashLimitAlert.tsx

lib/accounting/cash/
├── types.ts
├── payment-calendar.ts
├── cash-register.ts
└── encashment.ts
```

## Этап 5: Бухгалтерские регистры

```
app/(protected)/tenders/accounting/
├── chart-of-accounts/page.tsx
├── trial-balance/page.tsx
├── account-card/[account]/page.tsx
├── purchase-book/page.tsx
├── sales-book/page.tsx
└── declarations/usn/page.tsx

components/accounting/registers/
├── ChartOfAccounts.tsx
├── TrialBalance.tsx
├── AccountCard.tsx
├── PurchaseBook.tsx
├── SalesBook.tsx
└── UsnDeclaration.tsx

lib/accounting/registers/
├── types.ts
├── chart-of-accounts.ts
├── trial-balance.ts
├── account-card.ts
├── purchase-book.ts
└── sales-book.ts
```

## Этап 6: Зарплатный модуль

```
app/(protected)/tenders/accounting/payroll/
├── page.tsx
├── staffing/page.tsx
├── calculations/page.tsx
├── payslips/page.tsx
├── statements/page.tsx
└── timesheet/page.tsx

components/accounting/payroll/
├── StaffingTable.tsx
├── StaffingForm.tsx
├── PayrollCalculation.tsx
├── TaxCalculations.tsx
├── Payslip.tsx
├── PayrollStatement.tsx
├── Timesheet.tsx
└── TenderLaborCosts.tsx

lib/accounting/payroll/
├── types.ts
├── staffing.ts
├── calculation.ts
├── taxes.ts
├── payslips.ts
├── statements.ts
└── timesheet.ts
```

## Этап 7: Складской учёт

```
app/(protected)/tenders/accounting/warehouse/
├── page.tsx
├── nomenclature/page.tsx
├── warehouses/page.tsx
├── receipt/page.tsx
├── issue/page.tsx
├── transfer/page.tsx
├── balance/page.tsx
├── inventory/page.tsx
└── write-off/page.tsx

components/accounting/warehouse/
├── NomenclatureList.tsx
├── NomenclatureForm.tsx
├── WarehouseList.tsx
├── WarehouseReceipt.tsx
├── WarehouseIssue.tsx
├── WarehouseTransfer.tsx
├── WarehouseBalance.tsx
├── TenderReservation.tsx
├── Inventory.tsx
└── WriteOff.tsx

lib/accounting/warehouse/
├── types.ts
├── nomenclature.ts
├── warehouses.ts
├── receipt.ts
├── issue.ts
├── transfer.ts
├── balance.ts
├── reservation.ts
└── inventory.ts
```

## Этап 8: Банковские интеграции

```
lib/accounting/banks/
├── types.ts
├── base-bank-client.ts
├── sberbank/client.ts
├── alfabank/client.ts
├── vtb/client.ts
├── tochka/client.ts
├── raiffeisen/client.ts
├── modulbank/client.ts
├── otkritie/client.ts
├── statement-import.ts
└── payment-matching.ts

components/accounting/banks/
├── BankIntegrationsList.tsx
├── BankIntegrationCard.tsx
├── SberbankSettings.tsx
├── AlfabankSettings.tsx
├── VtbSettings.tsx
├── TochkaSettings.tsx
├── RaiffeisenSettings.tsx
├── ModulbankSettings.tsx
├── OtkritieSettings.tsx
├── BankStatementImport.tsx
└── PaymentMatching.tsx
```
