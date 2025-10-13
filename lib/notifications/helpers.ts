import type { NotificationInput } from "./types";

type NotifyOptions = {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
};

// Упрощенные функции для создания уведомлений разных типов

export function notifySuccess(options: NotifyOptions): NotificationInput {
  return {
    type: "success",
    priority: "normal",
    ...options,
  };
}

export function notifyError(options: NotifyOptions): NotificationInput {
  return {
    type: "error",
    priority: "high",
    ...options,
  };
}

export function notifyWarning(options: NotifyOptions): NotificationInput {
  return {
    type: "warning",
    priority: "normal",
    ...options,
  };
}

export function notifyInfo(options: NotifyOptions): NotificationInput {
  return {
    type: "info",
    priority: "low",
    ...options,
  };
}

// Предопределенные уведомления для частых случаев

export const CommonNotifications = {
  // Транзакции
  transactionCreated: (amount: string): NotificationInput =>
    notifySuccess({
      title: "Транзакция добавлена",
      message: `Транзакция на сумму ${amount} успешно создана`,
      actionUrl: "/transactions",
      actionLabel: "Посмотреть транзакции",
      icon: "receipt",
    }),

  transactionUpdated: (): NotificationInput =>
    notifySuccess({
      title: "Транзакция обновлена",
      message: "Изменения успешно сохранены",
      actionUrl: "/transactions",
      actionLabel: "Посмотреть транзакции",
      icon: "edit",
    }),

  transactionDeleted: (): NotificationInput =>
    notifyInfo({
      title: "Транзакция удалена",
      message: "Транзакция успешно удалена",
      icon: "delete",
    }),

  // Бюджеты
  budgetExceeded: (category: string, percent: number): NotificationInput =>
    notifyWarning({
      title: "Превышен бюджет",
      message: `Бюджет категории "${category}" израсходован на ${percent}%`,
      actionUrl: "/budgets",
      actionLabel: "Посмотреть бюджеты",
      icon: "warning",
    }),

  budgetCreated: (): NotificationInput =>
    notifySuccess({
      title: "Бюджет создан",
      message: "Новый бюджет успешно добавлен",
      actionUrl: "/budgets",
      actionLabel: "Посмотреть бюджеты",
      icon: "pie_chart",
    }),

  // Платежи
  paymentDue: (name: string, daysLeft: number): NotificationInput =>
    notifyWarning({
      title: "Предстоящий платеж",
      message: `Платеж "${name}" через ${daysLeft} дн.`,
      actionUrl: "/payments",
      actionLabel: "Посмотреть платежи",
      icon: "receipt_long",
    }),

  paymentOverdue: (name: string): NotificationInput =>
    notifyError({
      title: "Просроченный платеж",
      message: `Платеж "${name}" просрочен!`,
      actionUrl: "/payments",
      actionLabel: "Посмотреть платежи",
      icon: "error",
    }),

  // Планы
  planGoalReached: (name: string): NotificationInput =>
    notifySuccess({
      title: "Цель достигнута! 🎉",
      message: `Поздравляем! Вы достигли цели плана "${name}"`,
      actionUrl: "/plans",
      actionLabel: "Посмотреть планы",
      icon: "celebration",
    }),

  planProgress: (name: string, percent: number): NotificationInput =>
    notifyInfo({
      title: "Прогресс плана",
      message: `План "${name}" выполнен на ${percent}%`,
      actionUrl: "/plans",
      actionLabel: "Посмотреть планы",
      icon: "flag",
    }),

  // Общие
  saveError: (): NotificationInput =>
    notifyError({
      title: "Ошибка сохранения",
      message: "Не удалось сохранить изменения. Попробуйте еще раз",
      icon: "error",
    }),

  loadError: (): NotificationInput =>
    notifyError({
      title: "Ошибка загрузки",
      message: "Не удалось загрузить данные. Попробуйте обновить страницу",
      icon: "error",
    }),
};
