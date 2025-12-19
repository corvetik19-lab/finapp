/**
 * AI Studio Access Control - Client Side
 * Клиентские функции для проверки доступа
 */

// Супер-админ email
const SUPER_ADMIN_EMAIL = "corvetik1@yandex.ru";

/**
 * Проверяет, является ли пользователь супер-админом
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

/**
 * Получить email супер-админа
 */
export function getSuperAdminEmail(): string {
  return SUPER_ADMIN_EMAIL;
}
