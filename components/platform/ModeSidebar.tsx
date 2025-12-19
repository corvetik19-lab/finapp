"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getModeConfig } from "@/lib/platform/mode-registry";
import { usePermissions } from "@/lib/auth/use-permissions";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ShieldCheck, LayoutDashboard, Receipt, PieChart, CreditCard, Landmark, Banknote, BarChart3, TrendingUp, FileText, Trophy, Brain, MessageCircle, Lightbulb, LineChart, Bell, Settings, Briefcase, Package, Calendar, ListTodo, Flag, Bookmark, Dumbbell, StickyNote, Gavel, Truck, Users, Book, Building, MapPin, Tag, Wallet, Image, Video, Mic, FlaskConical, History, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, LucideIcon> = {
  insights: LayoutDashboard,
  receipt_long: Receipt,
  receipt: Receipt,
  pie_chart: PieChart,
  credit_card: CreditCard,
  payment: Banknote,
  account_balance: Landmark,
  assessment: BarChart3,
  bar_chart: BarChart3,
  analytics: LineChart,
  trending_up: TrendingUp,
  description: FileText,
  emoji_events: Trophy,
  psychology: Brain,
  chat: MessageCircle,
  lightbulb: Lightbulb,
  auto_graph: LineChart,
  notifications_active: Bell,
  tune: Settings,
  settings: Settings,
  dashboard: LayoutDashboard,
  work: Briefcase,
  inventory_2: Package,
  inventory: Package,
  calendar_month: Calendar,
  task: ListTodo,
  flag: Flag,
  bookmark: Bookmark,
  fitness_center: Dumbbell,
  sticky_note_2: StickyNote,
  gavel: Gavel,
  local_shipping: Truck,
  people: Users,
  menu_book: Book,
  business_center: Building,
  storefront: Building,
  location_on: MapPin,
  category: Tag,
  card_membership: CreditCard,
  account_balance_wallet: Wallet,
  verified_user: ShieldCheck,
  person: Users,
  arrow_downward: TrendingUp,
  arrow_upward: TrendingUp,
  image: Image,
  movie: Video,
  mic: Mic,
  science: FlaskConical,
  history: History,
  auto_awesome: Sparkles,
};

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
      key: 'accounting',
      label: 'Бухгалтерия',
      icon: 'account_balance',
      children: [
        { key: 'accounting-dashboard', label: 'Обзор', icon: 'dashboard', href: '/tenders/accounting' },
        { key: 'accounting-bank-accounts', label: 'Расчётные счета', icon: 'account_balance', href: '/tenders/accounting/bank-accounts' },
        { key: 'accounting-documents', label: 'Документы', icon: 'description', href: '/tenders/accounting/documents' },
        { key: 'accounting-kudir', label: 'КУДиР', icon: 'menu_book', href: '/tenders/accounting/kudir' },
        { key: 'accounting-taxes', label: 'Налоги', icon: 'account_balance_wallet', href: '/tenders/accounting/taxes' },
        { key: 'accounting-calendar', label: 'Календарь платежей', icon: 'calendar_month', href: '/tenders/accounting/taxes/calendar' },
        { key: 'accounting-counterparties', label: 'Контрагенты', icon: 'people', href: '/tenders/accounting/counterparties' },
        { key: 'accounting-reports', label: 'Отчёты', icon: 'assessment', href: '/tenders/accounting/reports' },
        { key: 'accounting-settings', label: 'Настройки', icon: 'settings', href: '/tenders/accounting/settings' },
      ]
    },
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
    { key: 'settings', label: 'Настройки тендеров', icon: 'settings', href: '/tenders/settings' },
  ],

  'ai-studio': [
    { key: 'chat', label: 'Чат', icon: 'chat', href: '/ai-studio/chat' },
    { key: 'image', label: 'Изображения', icon: 'image', href: '/ai-studio/image' },
    { key: 'video', label: 'Видео', icon: 'movie', href: '/ai-studio/video' },
    { key: 'audio', label: 'Аудио', icon: 'mic', href: '/ai-studio/audio' },
    { key: 'document', label: 'Документы', icon: 'description', href: '/ai-studio/document' },
    { key: 'research', label: 'Исследования', icon: 'science', href: '/ai-studio/research' },
    { key: 'history', label: 'История', icon: 'history', href: '/ai-studio/history' },
    { key: 'settings', label: 'Настройки', icon: 'settings', href: '/ai-studio/settings' },
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

    // AI Studio
    if (modeKey === 'ai-studio') {
      return 'ai-studio';
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
          <Button variant="ghost" onClick={() => toggleExpand(item.key)} className={cn("w-full justify-start gap-3 px-3 py-2 h-auto text-sm", isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "")}>
            {(() => { const Icon = ICON_MAP[item.icon] || Settings; return <Icon className="h-5 w-5" />; })()}<span className="flex-1 text-left">{item.label}</span>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {isExpanded && <div className="ml-4 mt-1 space-y-1">{item.children!.map(child => renderMenuItem(child, level + 1))}</div>}
        </div>
      );
    }
    return <Link key={item.key} href={item.href!} className={cn("flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{(() => { const Icon = ICON_MAP[item.icon] || Settings; return <Icon className="h-5 w-5" />; })()}<span>{item.label}</span></Link>;
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
    <aside className="fixed left-0 top-16 z-30 hidden md:flex flex-col w-64 h-[calc(100vh-4rem)] bg-card border-r">
      <div className="flex items-center gap-3 p-4 border-b">
        {(() => { const Icon = ICON_MAP[modeConfig.icon] || Settings; return <Icon className="h-6 w-6" style={{ color: modeConfig.color }} />; })()}
        <div><div className="font-semibold">{modeConfig.name}</div><div className="text-xs text-muted-foreground">{modeConfig.description}</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">{menuItems.map(item => renderMenuItem(item))}</nav>
      {isAdmin && (
        <div className="p-4 border-t"><Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"><ShieldCheck className="h-5 w-5" /><span>Администрирование</span></Link></div>
      )}
    </aside>
  );
}
