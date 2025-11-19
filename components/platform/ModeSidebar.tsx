"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getModeConfig } from "@/lib/platform/mode-registry";
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
        { key: 'reports-department', label: 'Тендерный отдел', icon: 'bar_chart', href: '/tenders/reports/department' },
        { key: 'reports-realization', label: 'Реализация', icon: 'inventory', href: '/tenders/reports/realization' },
        { key: 'reports-payments', label: 'Реестр оплат', icon: 'payments', href: '/tenders/reports/payments' },
        { key: 'reports-statistics', label: 'Статистика', icon: 'analytics', href: '/tenders/reports/statistics' },
        { key: 'reports-manager', label: 'Показатели менеджера', icon: 'person', href: '/tenders/reports/manager-performance' },
        { key: 'reports-support', label: 'Линейка обеспечения', icon: 'security', href: '/tenders/reports/support-line' },
        { key: 'reports-customer', label: 'Деньги у заказчиков', icon: 'account_balance', href: '/tenders/reports/customer-line' },
        { key: 'reports-payouts', label: 'Отчёт по выплатам', icon: 'payment', href: '/tenders/reports/payouts' },
      ]
    },
    { 
      key: 'dictionaries', 
      label: 'Справочники', 
      icon: 'menu_book',
      children: [
        { key: 'dict-types', label: 'Типы тендеров', icon: 'category', href: '/tenders/dictionaries/types' },
        { key: 'dict-responsible', label: 'Ответственные за этапы', icon: 'assignment_ind', href: '/tenders/dictionaries/responsible' },
        { key: 'dict-tender-tasks', label: 'Задачи по тендеру', icon: 'checklist', href: '/tenders/dictionaries/tender-tasks' },
        { key: 'dict-app-tasks', label: 'Задачи по заявкам', icon: 'playlist_add_check', href: '/tenders/dictionaries/application-tasks' },
        { key: 'dict-legal', label: 'Юр лица', icon: 'business', href: '/tenders/dictionaries/legal-entities' },
        { key: 'dict-suppliers', label: 'Поставщики', icon: 'store', href: '/tenders/dictionaries/suppliers' },
      ]
    },
    { key: 'settings', label: 'Настройки', icon: 'settings', href: '/tenders/settings' },
  ],
};

export default function ModeSidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
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
  const menuItems = MODE_MENUS[currentMode] || [];
  
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
  
  if (!modeConfig || menuItems.length === 0) {
    return null;
  }
  
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
    </aside>
  );
}
