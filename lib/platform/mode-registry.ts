/**
 * Mode Registry - централизованная регистрация режимов платформы
 */

export interface ModeFeatures {
  ai: boolean;
  analytics: boolean;
  exports: boolean;
  integrations: boolean;
  notifications: boolean;
}

export interface ModePermissions {
  view: string[];
  create: string[];
  edit: string[];
  delete: string[];
  admin: string[];
}

export interface ModeRoutes {
  root: string;
  dashboard: string;
  settings?: string;
}

export interface ModeConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isEnabled: boolean;
  isPremium: boolean;
  order: number;
  permissions: ModePermissions;
  routes: ModeRoutes;
  features: ModeFeatures;
  minRole?: string;
}

export const MODE_REGISTRY: Record<string, ModeConfig> = {
  finance: {
    key: 'finance',
    name: 'Финансы',
    icon: 'account_balance_wallet',
    color: '#10B981',
    description: 'Учёт доходов, расходов, бюджетов и финансовая аналитика',
    isEnabled: true,
    isPremium: false,
    order: 1,
    permissions: {
      view: ['viewer', 'member', 'admin', 'owner'],
      create: ['member', 'admin', 'owner'],
      edit: ['member', 'admin', 'owner'],
      delete: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/finance',
      dashboard: '/finance/dashboard',
      settings: '/settings/modes/finance',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: true,
      notifications: true,
    },
  },

  investments: {
    key: 'investments',
    name: 'Инвестиции',
    icon: 'trending_up',
    color: '#3B82F6',
    description: 'Управление портфелем, акциями, облигациями и аналитика доходности',
    isEnabled: false, // Feature flag - будет включено позже
    isPremium: true,
    order: 2,
    permissions: {
      view: ['viewer', 'member', 'admin', 'owner'],
      create: ['member', 'admin', 'owner'],
      edit: ['member', 'admin', 'owner'],
      delete: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/investments',
      dashboard: '/investments/dashboard',
      settings: '/settings/modes/investments',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: false,
      notifications: true,
    },
    minRole: 'member',
  },

  personal: {
    key: 'personal',
    name: 'Личные',
    icon: 'person',
    color: '#8B5CF6',
    description: 'Личный органайзер, заметки, задачи и напоминания',
    isEnabled: false,
    isPremium: false,
    order: 3,
    permissions: {
      view: ['member', 'admin', 'owner'],
      create: ['member', 'admin', 'owner'],
      edit: ['member', 'admin', 'owner'],
      delete: ['member', 'admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/personal',
      dashboard: '/personal/dashboard',
      settings: '/settings/modes/personal',
    },
    features: {
      ai: true,
      analytics: false,
      exports: true,
      integrations: false,
      notifications: true,
    },
  },

  tenders: {
    key: 'tenders',
    name: 'Тендеры',
    icon: 'description',
    color: '#F59E0B',
    description: 'Учёт и управление тендерами, документооборот и аналитика',
    isEnabled: false,
    isPremium: true,
    order: 4,
    permissions: {
      view: ['viewer', 'member', 'admin', 'owner'],
      create: ['member', 'admin', 'owner'],
      edit: ['admin', 'owner'],
      delete: ['admin', 'owner'],
      admin: ['owner'],
    },
    routes: {
      root: '/tenders',
      dashboard: '/tenders/dashboard',
      settings: '/settings/modes/tenders',
    },
    features: {
      ai: true,
      analytics: true,
      exports: true,
      integrations: true,
      notifications: true,
    },
    minRole: 'member',
  },
};

/**
 * Получить конфигурацию режима по ключу
 */
export function getModeConfig(key: string): ModeConfig | undefined {
  return MODE_REGISTRY[key];
}

/**
 * Получить все доступные режимы (включённые)
 */
export function getAvailableModes(): ModeConfig[] {
  return Object.values(MODE_REGISTRY)
    .filter((mode) => mode.isEnabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Получить все режимы (включая выключенные)
 */
export function getAllModes(): ModeConfig[] {
  return Object.values(MODE_REGISTRY).sort((a, b) => a.order - b.order);
}

/**
 * Проверить, доступен ли режим для роли
 */
export function isModeAvailableForRole(
  modeKey: string,
  userRole: string
): boolean {
  const mode = getModeConfig(modeKey);
  if (!mode || !mode.isEnabled) return false;

  if (mode.minRole) {
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const minRoleIndex = roleHierarchy.indexOf(mode.minRole);
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    return userRoleIndex >= minRoleIndex;
  }

  return mode.permissions.view.includes(userRole);
}

/**
 * Проверить разрешение на действие в режиме
 */
export function checkModePermission(
  modeKey: string,
  userRole: string,
  action: keyof ModePermissions
): boolean {
  const mode = getModeConfig(modeKey);
  if (!mode) return false;

  return mode.permissions[action].includes(userRole);
}

/**
 * Получить режимы, доступные пользователю по роли
 */
export function getModesForRole(userRole: string): ModeConfig[] {
  return getAvailableModes().filter((mode) =>
    isModeAvailableForRole(mode.key, userRole)
  );
}
