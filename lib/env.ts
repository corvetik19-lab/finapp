/**
 * Централизованная валидация переменных окружения
 * Использует Zod для типобезопасной валидации при старте приложения
 */

import { z } from "zod";

/**
 * Схема для серверных переменных окружения
 * Эти переменные доступны только на сервере
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(100, "SUPABASE_SERVICE_ROLE_KEY должен быть валидным ключом"),
  
  // OPENROUTER_API_KEY - для режима ИИ Студии
  OPENROUTER_API_KEY: z
    .string()
    .startsWith("sk-or-", "OPENROUTER_API_KEY должен начинаться с 'sk-or-'")
    .optional(),
  
  // OPENROUTER_FINANCE_API_KEY - для режима Финансы
  OPENROUTER_FINANCE_API_KEY: z
    .string()
    .startsWith("sk-or-", "OPENROUTER_FINANCE_API_KEY должен начинаться с 'sk-or-'")
    .optional(),
  
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY не может быть пустым")
    .optional(),

  OPENROUTER_SITE_URL: z
    .string()
    .url("OPENROUTER_SITE_URL должен быть валидным URL")
    .optional(),

  OPENROUTER_SITE_NAME: z
    .string()
    .optional(),

  RESEND_FROM_EMAIL: z
    .string()
    .optional(),

  SENTRY_ORG: z
    .string()
    .optional(),

  SENTRY_PROJECT: z
    .string()
    .optional(),
});

/**
 * Схема для клиентских переменных окружения
 * Эти переменные доступны и на клиенте (NEXT_PUBLIC_*)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL должен быть валидным URL"),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(100, "NEXT_PUBLIC_SUPABASE_ANON_KEY должен быть валидным ключом"),

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL должен быть валидным URL")
    .optional(),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL должен быть валидным URL")
    .optional(),
});

/**
 * Полная схема для всех переменных окружения
 */
const _fullEnvSchema = serverEnvSchema.merge(clientEnvSchema);

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof _fullEnvSchema>;

/**
 * Валидация клиентских переменных окружения
 * Безопасно для использования на клиенте
 */
function validateClientEnv(): ClientEnv {
  const clientVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const parsed = clientEnvSchema.safeParse(clientVars);

  if (!parsed.success) {
    console.error(
      "❌ Ошибка валидации клиентских переменных окружения:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Невалидные клиентские переменные окружения");
  }

  return parsed.data;
}

/**
 * Валидация серверных переменных окружения
 * Только для использования на сервере
 */
function validateServerEnv(): ServerEnv {
  // Проверяем что мы на сервере
  if (typeof window !== "undefined") {
    throw new Error("validateServerEnv() можно вызывать только на сервере");
  }

  const serverVars = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_FINANCE_API_KEY: process.env.OPENROUTER_FINANCE_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  };

  const parsed = serverEnvSchema.safeParse(serverVars);

  if (!parsed.success) {
    console.error(
      "❌ Ошибка валидации серверных переменных окружения:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Невалидные серверные переменные окружения");
  }

  return parsed.data;
}

/**
 * Ленивая инициализация клиентских переменных
 */
let _clientEnv: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (!_clientEnv) {
    _clientEnv = validateClientEnv();
  }
  return _clientEnv;
}

/**
 * Ленивая инициализация серверных переменных
 */
let _serverEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    _serverEnv = validateServerEnv();
  }
  return _serverEnv;
}

/**
 * Получить все переменные окружения (только на сервере)
 */
export function getEnv(): Env {
  return {
    ...getClientEnv(),
    ...getServerEnv(),
  };
}

/**
 * Хелперы для быстрого доступа к часто используемым переменным
 */
export const env = {
  get supabaseUrl(): string {
    return getClientEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  
  get supabaseAnonKey(): string {
    return getClientEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  
  get supabaseServiceRoleKey(): string {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  
  // API ключ для режима ИИ Студии
  get openrouterApiKey(): string | undefined {
    return getServerEnv().OPENROUTER_API_KEY;
  },
  
  get openrouterFinanceApiKey(): string | undefined {
    return getServerEnv().OPENROUTER_FINANCE_API_KEY;
  },
  
  get resendApiKey(): string | undefined {
    return getServerEnv().RESEND_API_KEY;
  },

  get siteUrl(): string | undefined {
    return getClientEnv().NEXT_PUBLIC_SITE_URL;
  },

  get appUrl(): string | undefined {
    return getClientEnv().NEXT_PUBLIC_APP_URL;
  },
};
