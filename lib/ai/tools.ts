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
    accountName: z.string().describe("Название счёта/карты"),
    description: z.string().optional().describe("Описание транзакции"),
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
    startDate: z.string().optional().describe("Начальная дата YYYY-MM-DD"),
    endDate: z.string().optional().describe("Конечная дата YYYY-MM-DD"),
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
};

// Типы для TypeScript
export type ToolName = keyof typeof aiTools;
export type ToolParameters<T extends ToolName> = z.infer<typeof toolSchemas[T]>;
