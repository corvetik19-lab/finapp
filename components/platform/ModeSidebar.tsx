"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getModeConfig } from "@/lib/platform/mode-registry";
import { usePermissions } from "@/lib/auth/use-permissions";
import styles from "./ModeSidebar.module.css";

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  href?: string;
  children?: MenuItem[];
}

interface ModeMenuConfig {
  [key: string]: MenuItem[];
}

// Меню для каждого режима
const MODE_MENUS: ModeMenuConfig = {
  finance: [
    { key: 'dashboard', label: 'Дашборд', icon: 'insights', href: '/finance/dashboard' },
    { key: 'transactions', label: 'Транзакции', icon: 'receipt_long', href: '/finance/transactions' },
    { key: 'receipts', label: 'Чеки', icon: 'receipt', href: '/finance/receipts' },
    { key: 'budgets', label: 'Бюджеты', icon: 'pie_chart', href: '/finance/budgets' },
    {
      key: 'cards',
      label: 'Карты',
      icon: 'credit_card',
      children: [
        { key: 'debit-cards', label: 'Дебетовые карты', icon: 'credit_card', href: '/finance/cards' },
        { key: 'credit-cards', label: 'Кредитные карты', icon: 'payment', href: '/finance/credit-cards' },
      ]
    },
    { key: 'loans', label: 'Кредиты', icon: 'account_balance', href: '/finance/loans' },
    { key: 'payments', label: 'Платежи', icon: 'payment', href: '/finance/payments' },
    {
      key: 'reports',
      label: 'Отчёты',
      icon: 'assessment',
      children: [
        { key: 'reports-main', label: 'Отчёты', icon: 'bar_chart', href: '/finance/reports' },
        { key: 'analytics', label: 'Аналитика', icon: 'analytics', href: '/finance/analytics/advanced' },
        { key: 'forecasts', label: 'Прогнозы', icon: 'trending_up', href: '/finance/forecasts' },
        { key: 'custom-reports', label: 'Свои отчёты', icon: 'description', href: '/finance/reports/custom' },
      ]
    },
    { key: 'achievements', label: 'Достижения', icon: 'emoji_events', href: '/achievements' },
    {
      key: 'ai',
      label: 'AI',
      icon: 'psychology',
      children: [
        { key: 'ai-chat', label: 'AI Чат', icon: 'chat', href: '/ai-chat' },
        { key: 'ai-advisor', label: 'AI Советник', icon: 'lightbulb', href: '/ai-advisor' },
        { key: 'ai-analytics', label: 'AI Аналитика', icon: 'auto_graph', href: '/ai-analytics' },
      ]
    },
    { key: 'notifications', label: 'Уведомления', icon: 'notifications_active', href: '/notifications' },
    { key: 'settings', label: 'Настройки режима', icon: 'tune', href: '/finance/settings' },
  ],

  investments: [
    { key: 'dashboard', label: 'Дашборд', icon: 'insights', href: '/investments/dashboard' },
    { key: 'portfolio', label: 'Портфель', icon: 'pie_chart', href: '/investments/portfolio' },
    { key: 'stocks', label: 'Акции', icon: 'trending_up', href: '/investments/stocks' },
    { key: 'bonds', label: 'Облигации', icon: 'account_balance', href: '/investments/bonds' },
    { key: 'analytics', label: 'Аналитика', icon: 'analytics', href: '/investments/analytics' },
    { key: 'settings', label: 'Настройки режима', icon: 'tune', href: '/investments/settings' },
  ],

  personal: [
    { key: 'dashboard', label: 'Дашборд', icon: 'insights', href: '/personal/dashboard' },
    { key: 'notes', label: 'Заметки', icon: 'sticky_note_2', href: '/personal/notes' },
    { key: 'tasks', label: 'Задачи', icon: 'task', href: '/personal/tasks' },
    { key: 'calendar', label: 'Календарь', icon: 'calendar_month', href: '/personal/calendar' },
    { key: 'plans', label: 'Планы', icon: 'flag', href: '/personal/plans' },
    { key: 'bookmarks', label: 'Закладки', icon: 'bookmark', href: '/personal/bookmarks' },
    { key: 'prompts', label: 'Промпты', icon: 'lightbulb', href: '/personal/prompts' },
    { key: 'fitness', label: 'Фитнес', icon: 'fitness_center', href: '/personal/fitness' },
    { key: 'settings', label: 'Настройки режима', icon: 'tune', href: '/personal/settings' },
  ],

  tenders: [
    { key: 'dashboard', label: 'Дашборд', icon: 'dashboard', href: '/tenders/dashboard' },
    { key: 'department', label: 'Тендерный отдел', icon: 'work', href: '/tenders/department' },
    { key: 'realization', label: 'Реализация', icon: 'inventory_2', href: '/tenders/realization' },
    { key: 'calendar', label: 'Календарь', icon: 'calendar_month', href: '/tenders/calendar' },
    { key: 'tasks', label: 'Задачи', icon: 'task', href: '/tenders/tasks' },
    { key: 'list', label: 'Реестр тендеров', icon: 'description', href: '/tenders/list' },
    { key: 'claims', label: 'Взыскание долгов', icon: 'gavel', href: '/tenders/claims' },
    { key: 'logistics', label: 'Логистика', icon: 'local_shipping', href: '/tenders/logistics' },
    { key: 'employees', label: 'Сотрудники', icon: 'people', href: '/tenders/employees' },
    {
      key: 'reports',
      label: 'Отчёты',
      icon: 'assessment',
      children: [
        { key: 'reports-statistics', label: 'Сводный отчёт', icon: 'analytics', href: '/tenders/reports/statistics' },
        { key: 'reports-department', label: 'Тендерный отдел', icon: 'bar_chart', href: '/tenders/reports/department' },
        { key: 'reports-realization', label: 'Реализация', icon: 'inventory', href: '/tenders/reports/realization' },
        { key: 'reports-payments', label: 'Оплаты от заказчиков', icon: 'arrow_downward', href: '/tenders/reports/payments' },
        { key: 'reports-payouts', label: 'Расходы', icon: 'arrow_upward', href: '/tenders/reports/payouts' },
        { key: 'reports-customer', label: 'Дебиторка', icon: 'account_balance_wallet', href: '/tenders/reports/customer-line' },
        { key: 'reports-support', label: 'Банковские гарантии', icon: 'verified_user', href: '/tenders/reports/support-line' },
        { key: 'reports-manager', label: 'Показатели менеджеров', icon: 'person', href: '/tenders/reports/manager-performance' },
      ]
    },
    {
      key: 'dictionaries',
      label: 'Справочники',
      icon: 'menu_book',
      children: [
        { key: 'dict-customers', label: 'Заказчики', icon: 'business_center', href: '/tenders/dictionaries/customers' },
        { key: 'dict-suppliers', label: 'Поставщики', icon: 'local_shipping', href: '/tenders/dictionaries/suppliers' },
        { key: 'dict-platforms', label: 'Площадки', icon: 'storefront', href: '/tenders/dictionaries/platforms' },
        { key: 'dict-regions', label: 'Регионы', icon: 'location_on', href: '/tenders/dictionaries/regions' },
        { key: 'dict-banks', label: 'Банки', icon: 'account_balance', href: '/tenders/dictionaries/banks' },
        { key: 'dict-types', label: 'Типы тендеров', icon: 'category', href: '/tenders/dictionaries/types' },
      ]
    },
    { key: 'subscription', label: 'Подписка', icon: 'card_membership', href: '/tenders/settings/subscription' },
    { key: 'settings', label: 'Настройки', icon: 'settings', href: '/tenders/settings' },
  ],
};

export default function ModeSidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { isAdmin, isSuperAdmin, loading } = usePermissions();

  // Определяем текущий режим из URL
  const getCurrentMode = () => {
    const segments = pathname.split('/').filter(Boolean);
    const modeKey = segments[0];

    // Если это dashboard или маршруты finance режима, значит finance
    if (modeKey === 'dashboard' || modeKey === 'achievements' ||
      modeKey === 'cards' || modeKey === 'credit-cards' ||
      modeKey === 'transactions' || modeKey === 'receipts' || modeKey === 'loans' || modeKey === 'payments' || modeKey === 'budgets' ||
      modeKey === 'reports' || modeKey === 'forecasts' || modeKey === 'analytics' ||
      modeKey === 'ai-advisor' || modeKey === 'ai-chat' || modeKey === 'ai-analytics' ||
      modeKey === 'plans' || modeKey === 'notifications' || modeKey === 'settings') {
      return 'finance';
    }

    return modeKey;
  };

  const currentMode = getCurrentMode();
  const modeConfig = getModeConfig(currentMode);
  
  // Фильтруем меню: супер-админу не показываем пункт "Подписка"
  const menuItems = (MODE_MENUS[currentMode] || []).filter(item => {
    if (item.key === 'subscription' && isSuperAdmin) return false;
    return true;
  });

  // Не показываем sidebar для страниц настроек и админки
  const isSettingsPage = pathname.startsWith('/settings');
  const isAdminPage = pathname.startsWith('/admin');
  
  if (isSettingsPage || isAdminPage) {
    return null;
  }

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.key);

    // Проверяем активность для родителя и детей
    const isActive = item.href ?
      (pathname === item.href || pathname.startsWith(item.href + '/')) :
      item.children?.some(child => child.href && (pathname === child.href || pathname.startsWith(child.href + '/')));

    if (hasChildren) {
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleExpand(item.key)}
            className={`${styles.modeNavItem} ${isActive ? styles.modeNavItemActive : ''}`}
          >
            <span className="material-icons">{item.icon}</span>
            <span>{item.label}</span>
            <span className="material-icons" style={{ marginLeft: 'auto' }}>
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {isExpanded && (
            <div className={styles.modeNavSubmenu}>
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href!}
        className={`${styles.modeNavItem} ${isActive ? styles.modeNavItemActive : ''}`}
      >
        <span className="material-icons">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  if (loading || !modeConfig || menuItems.length === 0) {
    return null;
  }

  // Проверка доступа к режиму
  // Финансы доступны всем (базовый модуль)
  // Инвестиции и Тендеры - по правам
  /*
  if (currentMode === 'investments' && !hasAppAccess('investments')) {
    return null; // Или редирект, но здесь мы просто скрываем сайдбар
  }

  if (currentMode === 'tenders' && !hasAppAccess('tenders')) {
    return null;
  }
  */

  return (
    <aside className={styles.modeSidebar}>
      {/* Mode Header */}
      <div className={styles.modeHeader}>
        <span
          className="material-icons"
          style={{ color: modeConfig.color }}
        >
          {modeConfig.icon}
        </span>
        <div className={styles.modeInfo}>
          <div className={styles.modeName}>{modeConfig.name}</div>
          <div className={styles.modeDescription}>{modeConfig.description}</div>
        </div>
      </div>

      {/* Mode Menu */}
      <nav className={styles.modeNav}>
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Admin Link (Bottom) */}
      {isAdmin && (
        <div className="mt-auto p-4 border-t border-slate-100">
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <span className="material-icons text-slate-400">admin_panel_settings</span>
            <span>Администрирование</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
