// Константы для email сервиса (без "use server" чтобы можно было экспортировать объекты)

export const EMAIL_TEMPLATE_TYPES = {
  request_quote: "Запрос коммерческого предложения",
  order: "Заказ",
  payment_reminder: "Напоминание об оплате",
  contract: "По договору",
  general: "Общее",
} as const;

export type EmailTemplateType = keyof typeof EMAIL_TEMPLATE_TYPES;
