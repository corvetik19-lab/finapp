"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAvailableModes, getModeConfig } from "@/lib/platform/mode-registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, User, FileText, Settings, ChevronUp, ChevronDown, CheckCircle, Brain, Sparkles, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  account_balance_wallet: Wallet,
  trending_up: TrendingUp,
  person: User,
  description: FileText,
  settings: Settings,
  psychology: Brain,
  auto_awesome: Sparkles,
};

interface ModeSwitcherProps {
  allowedModes?: string[];
  globalEnabledModes?: string[];
  userAllowedModes?: string[];
}

export default function ModeSwitcher({ allowedModes, globalEnabledModes, userAllowedModes }: ModeSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>("finance");

  // Filter modes based on organization allowedModes, user role, AND global platform settings
  const allModes = getAvailableModes();
  
  // Сначала фильтруем по глобально включённым режимам платформы
  const globallyEnabled = globalEnabledModes && globalEnabledModes.length > 0
    ? allModes.filter(mode => globalEnabledModes.includes(mode.key))
    : allModes;
  
  // Затем фильтруем по разрешённым для организации
  let orgFilteredModes = allowedModes !== undefined
    ? globallyEnabled.filter(mode => allowedModes.includes(mode.key))
    : globallyEnabled;
  
  // Если есть userAllowedModes (из роли пользователя) - используем их как финальный фильтр
  // Это ограничивает режимы только теми, что доступны пользователю по роли
  let availableModes = userAllowedModes && userAllowedModes.length > 0
    ? orgFilteredModes.filter(mode => userAllowedModes.includes(mode.key))
    : orgFilteredModes;
  
  // Если доступен только один режим - не показываем переключатель
  const singleModeOnly = availableModes.length === 1;

  useEffect(() => {
    // Если мы в админке или глобальных настройках, сбрасываем активный режим
    if (pathname.startsWith('/admin') || pathname.startsWith('/settings')) {
      setCurrentMode('');
      return;
    }

    // Определяем текущий режим из URL
    const modeKey = pathname.split("/")[1];
    const mode = getModeConfig(modeKey);
    if (mode && mode.isEnabled) {
      setCurrentMode(modeKey);
    }
  }, [pathname]);

  const handleModeSwitch = (modeKey: string) => {
    const mode = getModeConfig(modeKey);
    if (!mode) return;

    router.push(mode.routes.dashboard);
    setIsOpen(false);
  };

  const current = (pathname.startsWith('/admin') || pathname.startsWith('/settings'))
    ? { name: 'Администрирование', icon: 'settings', color: '#64748b' }
    : getModeConfig(currentMode);

  if (!current) return null;

  const renderIcon = (iconName: string, color: string, className?: string) => {
    const IconComponent = ICON_MAP[iconName] || Settings;
    return <IconComponent className={className || "h-5 w-5"} style={{ color }} />;
  };

  // Если только один режим доступен - показываем только название без выпадающего списка
  if (singleModeOnly) {
    const singleMode = availableModes[0];
    // В админке показываем "Администрирование", иначе название режима
    const isInAdmin = pathname.startsWith('/admin') || pathname.startsWith('/settings');
    return (
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2">
          {isInAdmin ? (
            <>
              {renderIcon('settings', '#64748b')}
              <span className="hidden sm:inline font-medium">Администрирование</span>
            </>
          ) : (
            <>
              {renderIcon(singleMode.icon, singleMode.color)}
              <span className="hidden sm:inline font-medium">{singleMode.name}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} aria-label="Переключить режим" className="gap-2">
        {renderIcon(current.icon, current.color)}
        <span className="hidden sm:inline">{current.name}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 w-[380px] rounded-2xl border border-gray-200 shadow-xl bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-800 border-b border-gray-100 dark:border-zinc-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Режимы работы</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Выберите режим для переключения</p>
            </div>
            <div className="p-3 space-y-1.5 max-h-[450px] overflow-y-auto bg-white dark:bg-zinc-900">
              {availableModes.map((mode) => (
                <button 
                  key={mode.key} 
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                    mode.key === currentMode 
                      ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`} 
                  onClick={() => handleModeSwitch(mode.key)} 
                  disabled={mode.key === currentMode}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${mode.color}15` }}
                  >
                    {renderIcon(mode.icon, mode.color, "h-5 w-5")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white">{mode.name}</span>
                      {mode.isPremium && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">PRO</span>
                      )}
                      {mode.key === currentMode && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Активен</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{mode.description}</p>
                  </div>
                  {mode.key === currentMode && (
                    <CheckCircle className="h-5 w-5 shrink-0" style={{ color: mode.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
