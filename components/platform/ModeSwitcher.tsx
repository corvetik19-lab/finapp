"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAvailableModes, getModeConfig } from "@/lib/platform/mode-registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, User, FileText, Settings, ChevronUp, ChevronDown, CheckCircle, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  account_balance_wallet: Wallet,
  trending_up: TrendingUp,
  person: User,
  description: FileText,
  settings: Settings,
};

interface ModeSwitcherProps {
  allowedModes?: string[];
  globalEnabledModes?: string[];
}

export default function ModeSwitcher({ allowedModes, globalEnabledModes }: ModeSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>("finance");

  // Filter modes based on both organization allowedModes AND global platform settings
  const allModes = getAvailableModes();
  
  // Сначала фильтруем по глобально включённым режимам платформы
  const globallyEnabled = globalEnabledModes && globalEnabledModes.length > 0
    ? allModes.filter(mode => globalEnabledModes.includes(mode.key))
    : allModes;
  
  // Затем фильтруем по разрешённым для организации
  // Если allowedModes передан (даже пустой массив) - используем его
  // Если не передан (undefined) - используем глобальные
  const availableModes = allowedModes !== undefined
    ? globallyEnabled.filter(mode => allowedModes.includes(mode.key))
    : globallyEnabled;
  
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

  if (singleModeOnly && !pathname.startsWith('/admin') && !pathname.startsWith('/settings')) {
    const singleMode = availableModes[0];
    return (
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2">
          {renderIcon(singleMode.icon, singleMode.color)}
          <span className="hidden sm:inline font-medium">{singleMode.name}</span>
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
          <div className="absolute top-full left-0 mt-2 z-50 w-80 rounded-xl border shadow-2xl bg-white dark:bg-zinc-900">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Режимы работы</h3>
              <p className="text-sm text-muted-foreground">Выберите режим для переключения</p>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {availableModes.map((mode) => (
                <button key={mode.key} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${mode.key === currentMode ? 'bg-primary/10' : 'hover:bg-muted'}`} onClick={() => handleModeSwitch(mode.key)} disabled={mode.key === currentMode}>
                  <div className="p-2 rounded-lg bg-muted">{renderIcon(mode.icon, mode.color)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mode.name}</span>
                      {mode.isPremium && <Badge variant="secondary" className="text-xs">PRO</Badge>}
                      {mode.key === currentMode && <Badge className="text-xs">Активен</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                  </div>
                  {mode.key === currentMode && <CheckCircle className="h-5 w-5" style={{ color: mode.color }} />}
                </button>
              ))}
            </div>
            <div className="p-3 border-t text-center text-sm text-muted-foreground">Скоро появятся новые режимы!</div>
          </div>
        </>
      )}
    </div>
  );
}
