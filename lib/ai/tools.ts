/**
 * AI Tools - Инструменты для управления приложением через чат
 */

import { z } from "zod";

// Схемы параметров для каждого инструмента
export const toolSchemas = {
  // Дебетовые карты
  addDebitCard: z.object({
    name: z.string().describe("Название карты"),
    bank: z.string().describe("Название банка"),
    balance: z.number().describe("Текущий баланс на карте"),
    currency: z.string().default("RUB").describe("Валюта (RUB, USD, EUR)"),
    cardNumber: z.string().optional().describe("Последние 4 цифры карты"),
  }),

  // Кредитные карты
  addCreditCard: z.object({
    name: z.string().describe("Название карты"),
    bank: z.string().describe("Название банка"),
    creditLimit: z.number().describe("Кредитный лимит"),
    balance: z.number().describe("Текущий долг"),
    currency: z.string().default("RUB").describe("Валюта"),
    cardNumber: z.string().optional().describe("Последние 4 цифры карты"),
  }),

  // Транзакции
  addTransaction: z.object({
    amount: z.number().describe("Сумма транзакции"),
    categoryName: z.string().describe("Название категории"),
    accountName: z.string().optional().describe("Название счёта/карты"),
    note: z.string().optional().describe("Заметка к транзакции"),
    date: z.string().optional().describe("Дата в формате YYYY-MM-DD"),
    direction: z.enum(["income", "expense"]).describe("Тип: доход или расход"),
  }),

  // Бюджеты
  addBudget: z.object({
    categoryName: z.string().describe("Название категории"),
    amount: z.number().describe("Лимит бюджета"),
    period: z.enum(["monthly", "weekly", "yearly"]).describe("Период бюджета"),
  }),

  // Планы (цели накопления)
  addPlan: z.object({
    name: z.string().describe("Название плана/цели"),
    targetAmount: z.number().describe("Целевая сумма"),
    currentAmount: z.number().default(0).describe("Текущая сумма"),
    deadline: z.string().optional().describe("Срок достижения в формате YYYY-MM-DD"),
  }),

  // Закладки
  addBookmark: z.object({
    title: z.string().describe("Название закладки"),
    url: z.string().describe("URL адрес"),
    category: z.string().optional().describe("Категория закладки"),
    description: z.string().optional().describe("Описание"),
  }),

  // Промпты
  addPrompt: z.object({
    title: z.string().describe("Название промпта"),
    content: z.string().describe("Текст промпта"),
    category: z.string().optional().describe("Категория промпта"),
    tags: z.array(z.string()).optional().describe("Теги для поиска"),
  }),

  // Аналитика и отчёты
  getFinancialSummary: z.object({
    period: z.enum(["week", "month", "year"]).default("month").describe("Период анализа"),
  }),

  getExpensesByCategory: z.object({
    startDate: z.string().optional().describe("Начальная дата YYYY-MM-DD. Если не указано - первый день текущего месяца"),
    endDate: z.string().optional().describe("Конечная дата YYYY-MM-DD. Если не указано - последний день текущего месяца"),
    month: z.string().optional().describe("Название месяца на русском (например 'ноябрь', 'октябрь'). Если указано - автоматически вычислить startDate и endDate"),
    year: z.number().optional().describe("Год (например 2024). Используется вместе с month"),
  }),

  getAccountBalance: z.object({
    accountName: z.string().optional().describe("Название счёта или 'all' для всех"),
  }),

  // Категории
  addCategory: z.object({
    name: z.string().describe("Название категории"),
    type: z.enum(["income", "expense"]).describe("Тип категории"),
    icon: z.string().optional().describe("Иконка (emoji или material icon)"),
  }),

  // === УПРАВЛЕНИЕ ПЛАНАМИ ===
  getPlans: z.object({
    status: z.enum(["active", "completed", "cancelled", "all"]).optional().describe("Фильтр по статусу"),
  }),

  updatePlan: z.object({
    planId: z.string().describe("ID плана для обновления"),
    name: z.string().optional().describe("Новое название"),
    targetAmount: z.number().optional().describe("Новая целевая сумма"),
    currentAmount: z.number().optional().describe("Текущая сумма"),
    deadline: z.string().optional().describe("Новый срок YYYY-MM-DD"),
    status: z.enum(["active", "completed", "cancelled"]).optional().describe("Новый статус"),
  }),

  deletePlan: z.object({
    planId: z.string().describe("ID плана для удаления"),
  }),

  addPlanTopup: z.object({
    planId: z.string().describe("ID плана"),
    amount: z.number().describe("Сумма пополнения"),
    description: z.string().optional().describe("Описание пополнения"),
  }),

  // === ФИТНЕС ПРОГРАММЫ ===
  getFitnessPrograms: z.object({
    active: z.boolean().optional().describe("Только активные программы"),
  }),

  addFitnessProgram: z.object({
    name: z.string().describe("Название программы"),
    description: z.string().optional().describe("Описание программы"),
    duration: z.number().optional().describe("Длительность в днях"),
    frequency: z.number().optional().describe("Тренировок в неделю"),
    goal: z.string().optional().describe("Цель тренировок"),
  }),

  updateFitnessProgram: z.object({
    programId: z.string().describe("ID программы для обновления"),
    name: z.string().optional().describe("Новое название"),
    description: z.string().optional().describe("Новое описание"),
    duration: z.number().optional().describe("Новая длительность"),
    frequency: z.number().optional().describe("Новая частота"),
    goal: z.string().optional().describe("Новая цель"),
    isActive: z.boolean().optional().describe("Активность программы"),
  }),

  deleteFitnessProgram: z.object({
    programId: z.string().describe("ID программы для удаления"),
  }),

  addFitnessWorkout: z.object({
    programId: z.string().describe("ID программы"),
    date: z.string().optional().describe("Дата тренировки YYYY-MM-DD"),
    duration: z.number().describe("Длительность в минутах"),
    exercises: z.string().optional().describe("Выполненные упражнения"),
    notes: z.string().optional().describe("Заметки о тренировке"),
    calories: z.number().optional().describe("Сожжено калорий"),
  }),

  // === ПРОСМОТР ДАННЫХ ===
  getTransactions: z.object({
    limit: z.number().optional().default(20).describe("Количество транзакций"),
    offset: z.number().optional().default(0).describe("Пропустить N записей"),
    startDate: z.string().optional().describe("Начальная дата YYYY-MM-DD"),
    endDate: z.string().optional().describe("Конечная дата YYYY-MM-DD"),
    categoryName: z.string().optional().describe("Фильтр по категории"),
    direction: z.enum(["income", "expense", "transfer", "all"]).optional().describe("Тип транзакции"),
  }),

  getCategories: z.object({
    type: z.enum(["income", "expense", "all"]).optional().describe("Тип категорий"),
  }),

  getAccounts: z.object({
    includeBalance: z.boolean().optional().default(true).describe("Включить баланс"),
  }),

  getBudgets: z.object({
    period: z.enum(["current", "all"]).optional().default("current").describe("Период"),
  }),

  getNotes: z.object({
    limit: z.number().optional().default(10).describe("Количество заметок"),
    search: z.string().optional().describe("Поиск по тексту"),
  }),

  getBookmarks: z.object({
    category: z.string().optional().describe("Фильтр по категории"),
    limit: z.number().optional().default(20).describe("Количество закладок"),
  }),

  // === УДАЛЕНИЕ ===
  deleteTransaction: z.object({
    transactionId: z.string().describe("ID транзакции для удаления"),
  }),

  deleteCategory: z.object({
    categoryId: z.string().describe("ID категории для удаления"),
  }),

  deleteAccount: z.object({
    accountId: z.string().describe("ID счёта для удаления"),
  }),

  deleteBudget: z.object({
    budgetId: z.string().describe("ID бюджета для удаления"),
  }),

  deleteNote: z.object({
    noteId: z.string().describe("ID заметки для удаления"),
  }),

  deleteBookmark: z.object({
    bookmarkId: z.string().describe("ID закладки для удаления"),
  }),

  // === ОБНОВЛЕНИЕ ===
  updateTransaction: z.object({
    transactionId: z.string().describe("ID транзакции"),
    amount: z.number().optional().describe("Новая сумма"),
    categoryName: z.string().optional().describe("Новая категория"),
    description: z.string().optional().describe("Новое описание"),
    date: z.string().optional().describe("Новая дата YYYY-MM-DD"),
  }),

  updateCategory: z.object({
    categoryId: z.string().describe("ID категории"),
    name: z.string().optional().describe("Новое название"),
    icon: z.string().optional().describe("Новая иконка"),
  }),

  updateBudget: z.object({
    budgetId: z.string().describe("ID бюджета"),
    amount: z.number().optional().describe("Новый лимит"),
    period: z.enum(["monthly", "weekly", "yearly"]).optional().describe("Новый период"),
  }),

  updateAccount: z.object({
    accountId: z.string().describe("ID счёта"),
    name: z.string().optional().describe("Новое название"),
    balance: z.number().optional().describe("Новый баланс"),
  }),

  // === ЗАМЕТКИ ===
  addNote: z.object({
    title: z.string().describe("Заголовок заметки"),
    content: z.string().describe("Содержание заметки"),
    tags: z.array(z.string()).optional().describe("Теги"),
  }),

  updateNote: z.object({
    noteId: z.string().describe("ID заметки"),
    title: z.string().optional().describe("Новый заголовок"),
    content: z.string().optional().describe("Новое содержание"),
    tags: z.array(z.string()).optional().describe("Новые теги"),
  }),

  // === АНАЛИТИКА ===
  getSpendingByMonth: z.object({
    months: z.number().optional().default(6).describe("Количество месяцев"),
  }),

  getTopCategories: z.object({
    limit: z.number().optional().default(5).describe("Количество категорий"),
    period: z.enum(["week", "month", "year"]).optional().default("month").describe("Период"),
  }),

  getNetWorth: z.object({}),

  getMonthlyTrends: z.object({
    months: z.number().optional().default(12).describe("Количество месяцев"),
  }),

  // === ОБРАБОТКА ЧЕКОВ ===
  processReceipt: z.object({
    receiptText: z.string().describe("Полный текст чека от кассы"),
    accountName: z.string().optional().describe("Название счёта для списания (по умолчанию - первый счёт)"),
  }),
};

// Определение инструментов для AI
export const aiTools = {
  addDebitCard: {
    description: "Добавить новую дебетовую карту в систему. Используй когда пользователь просит добавить карту, счёт или дебетовую карту.",
    parameters: toolSchemas.addDebitCard,
  },

  addCreditCard: {
    description: "Добавить новую кредитную карту. Используй когда пользователь хочет добавить кредитку.",
    parameters: toolSchemas.addCreditCard,
  },

  addTransaction: {
    description: "Добавить новую транзакцию (доход или расход). Используй для записи покупок, поступлений денег.",
    parameters: toolSchemas.addTransaction,
  },

  addBudget: {
    description: "Создать бюджет для категории. Используй когда пользователь хочет ограничить расходы по категории.",
    parameters: toolSchemas.addBudget,
  },

  addPlan: {
    description: "Создать план накопления или цель. Используй когда пользователь хочет накопить на что-то.",
    parameters: toolSchemas.addPlan,
  },

  addBookmark: {
    description: "Добавить закладку (полезную ссылку). Используй когда пользователь даёт ссылку для сохранения.",
    parameters: toolSchemas.addBookmark,
  },

  addPrompt: {
    description: "Сохранить промпт для AI. Используй когда пользователь хочет сохранить шаблон запроса.",
    parameters: toolSchemas.addPrompt,
  },

  getFinancialSummary: {
    description: "Получить финансовую сводку за период. Используй для анализа финансов пользователя.",
    parameters: toolSchemas.getFinancialSummary,
  },

  getExpensesByCategory: {
    description: "Получить расходы по категориям. Используй для детального анализа трат.",
    parameters: toolSchemas.getExpensesByCategory,
  },

  getAccountBalance: {
    description: "Получить баланс счёта/карты или всех счетов. Используй когда пользователь спрашивает сколько денег.",
    parameters: toolSchemas.getAccountBalance,
  },

  addCategory: {
    description: "Добавить новую категорию транзакций. Используй когда пользователь хочет создать новую категорию расходов/доходов.",
    parameters: toolSchemas.addCategory,
  },

  // === УПРАВЛЕНИЕ ПЛАНАМИ ===
  getPlans: {
    description: "Получить список финансовых планов. Используй для просмотра целей пользователя.",
    parameters: toolSchemas.getPlans,
  },

  updatePlan: {
    description: "Обновить существующий план. Используй для изменения названия, суммы, срока или статуса плана.",
    parameters: toolSchemas.updatePlan,
  },

  deletePlan: {
    description: "Удалить план. Используй когда пользователь хочет удалить цель.",
    parameters: toolSchemas.deletePlan,
  },

  addPlanTopup: {
    description: "Пополнить план (добавить деньги к цели). Используй когда пользователь вносит деньги в план накопления.",
    parameters: toolSchemas.addPlanTopup,
  },

  // === ФИТНЕС ПРОГРАММЫ ===
  getFitnessPrograms: {
    description: "Получить список фитнес-программ. Используй для просмотра тренировочных планов.",
    parameters: toolSchemas.getFitnessPrograms,
  },

  addFitnessProgram: {
    description: "Создать новую фитнес-программу. Используй когда пользователь хочет начать тренировки.",
    parameters: toolSchemas.addFitnessProgram,
  },

  updateFitnessProgram: {
    description: "Обновить фитнес-программу. Используй для изменения названия, описания, длительности программы.",
    parameters: toolSchemas.updateFitnessProgram,
  },

  deleteFitnessProgram: {
    description: "Удалить фитнес-программу. Используй когда пользователь хочет удалить программу тренировок.",
    parameters: toolSchemas.deleteFitnessProgram,
  },

  addFitnessWorkout: {
    description: "Записать выполненную тренировку. Используй когда пользователь отчитывается о тренировке.",
    parameters: toolSchemas.addFitnessWorkout,
  },

  // === ПРОСМОТР ДАННЫХ ===
  getTransactions: {
    description: "Получить список транзакций. Используй для просмотра истории операций, фильтрации по дате, категории.",
    parameters: toolSchemas.getTransactions,
  },

  getCategories: {
    description: "Получить список категорий доходов/расходов. Используй чтобы показать доступные категории.",
    parameters: toolSchemas.getCategories,
  },

  getAccounts: {
    description: "Получить список всех счетов/карт с балансами. Используй чтобы показать все счета пользователя.",
    parameters: toolSchemas.getAccounts,
  },

  getBudgets: {
    description: "Получить список бюджетов. Используй чтобы показать установленные лимиты по категориям.",
    parameters: toolSchemas.getBudgets,
  },

  getNotes: {
    description: "Получить список заметок. Используй для поиска и просмотра заметок пользователя.",
    parameters: toolSchemas.getNotes,
  },

  getBookmarks: {
    description: "Получить список закладок. Используй чтобы показать сохранённые ссылки.",
    parameters: toolSchemas.getBookmarks,
  },

  // === УДАЛЕНИЕ ===
  deleteTransaction: {
    description: "Удалить транзакцию. Используй когда пользователь хочет удалить операцию.",
    parameters: toolSchemas.deleteTransaction,
  },

  deleteCategory: {
    description: "Удалить категорию. Используй когда нужно удалить неиспользуемую категорию.",
    parameters: toolSchemas.deleteCategory,
  },

  deleteAccount: {
    description: "Удалить счёт/карту. Используй когда пользователь закрыл счёт.",
    parameters: toolSchemas.deleteAccount,
  },

  deleteBudget: {
    description: "Удалить бюджет. Используй чтобы убрать лимит по категории.",
    parameters: toolSchemas.deleteBudget,
  },

  deleteNote: {
    description: "Удалить заметку. Используй когда заметка больше не нужна.",
    parameters: toolSchemas.deleteNote,
  },

  deleteBookmark: {
    description: "Удалить закладку. Используй чтобы убрать ссылку из списка.",
    parameters: toolSchemas.deleteBookmark,
  },

  // === ОБНОВЛЕНИЕ ===
  updateTransaction: {
    description: "Обновить транзакцию. Используй для исправления суммы, категории, описания или даты операции.",
    parameters: toolSchemas.updateTransaction,
  },

  updateCategory: {
    description: "Обновить категорию. Используй чтобы переименовать или изменить иконку категории.",
    parameters: toolSchemas.updateCategory,
  },

  updateBudget: {
    description: "Обновить бюджет. Используй чтобы изменить лимит или период бюджета.",
    parameters: toolSchemas.updateBudget,
  },

  updateAccount: {
    description: "Обновить счёт. Используй чтобы изменить название или скорректировать баланс счёта.",
    parameters: toolSchemas.updateAccount,
  },

  // === ЗАМЕТКИ ===
  addNote: {
    description: "Создать заметку. Используй когда пользователь хочет что-то записать или запомнить.",
    parameters: toolSchemas.addNote,
  },

  updateNote: {
    description: "Обновить заметку. Используй чтобы изменить содержание или теги заметки.",
    parameters: toolSchemas.updateNote,
  },

  // === АНАЛИТИКА ===
  getSpendingByMonth: {
    description: "Получить расходы по месяцам. Используй для анализа динамики трат во времени.",
    parameters: toolSchemas.getSpendingByMonth,
  },

  getTopCategories: {
    description: "Получить топ категорий по расходам. Используй чтобы показать куда уходит больше всего денег.",
    parameters: toolSchemas.getTopCategories,
  },

  getNetWorth: {
    description: "Получить чистые активы (все счета минус долги). Используй чтобы показать общее финансовое состояние.",
    parameters: toolSchemas.getNetWorth,
  },

  getMonthlyTrends: {
    description: "Получить месячные тренды доходов и расходов. Используй для анализа финансовой динамики.",
    parameters: toolSchemas.getMonthlyTrends,
  },

  // === ОБРАБОТКА ЧЕКОВ ===
  processReceipt: {
    description: "Обработать кассовый чек и создать транзакцию с позициями товаров. ИСПОЛЬЗУЙ когда пользователь присылает чек (текст от кассы). Автоматически находит товары в БД, создаёт транзакцию и добавляет позиции.",
    parameters: toolSchemas.processReceipt,
  },
};

// Типы для TypeScript
export type ToolName = keyof typeof aiTools;
export type ToolParameters<T extends ToolName> = z.infer<typeof toolSchemas[T]>;
