"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEnabledModes } from "@/lib/platform/platform-settings";
import type { AppModeKey } from "@/lib/platform/modes-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast/ToastContext";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeInfo {
  key: string;
  label: string;
  icon: string;
  description: string;
}

interface GlobalModesManagerProps {
  allModes: readonly ModeInfo[];
  enabledModes: AppModeKey[];
}

export function GlobalModesManager({ allModes, enabledModes }: GlobalModesManagerProps) {
  const [modes, setModes] = useState<Set<string>>(new Set(enabledModes));
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();
  const { show: showToast } = useToast();

  const toggleMode = (key: string) => {
    const newModes = new Set(modes);
    
    if (newModes.has(key)) {
      // Нельзя отключить последний режим
      if (newModes.size <= 1) {
        showToast("Нельзя отключить все режимы. Минимум один должен быть включён.", { type: "error" });
        return;
      }
      newModes.delete(key);
    } else {
      newModes.add(key);
    }
    
    setModes(newModes);
    setHasChanges(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateEnabledModes(Array.from(modes) as AppModeKey[]);
      
      if (result.ok) {
        showToast("Настройки режимов сохранены", { type: "success" });
        setHasChanges(false);
        router.refresh();
      } else {
        showToast(result.error || "Ошибка сохранения", { type: "error" });
      }
    });
  };

  const enabledCount = modes.size;
  const totalCount = allModes.length;

  return (
    <div className="space-y-6">
      {/* Статус */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={enabledCount === totalCount ? "default" : "secondary"}>
            {enabledCount} из {totalCount} включено
          </Badge>
          {enabledCount === 1 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Минимум
            </Badge>
          )}
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Сохранить изменения
          </Button>
        )}
      </div>

      {/* Список режимов */}
      <div className="grid gap-3">
        {allModes.map((mode) => {
          const isEnabled = modes.has(mode.key);
          const isLast = modes.size === 1 && isEnabled;

          // Цвета для каждого режима
          const modeColors: Record<string, string> = {
            finance: "#8B5CF6",
            tenders: "#F59E0B", 
            personal: "#EC4899",
            investments: "#10B981",
          };
          const color = modeColors[mode.key] || "#6366F1";

          return (
            <div
              key={mode.key}
              className={cn(
                "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer group",
                isEnabled
                  ? "bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg"
                  : "bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
              style={{
                borderColor: isEnabled ? color : "transparent",
              }}
              onClick={() => toggleMode(mode.key)}
            >
              {/* Индикатор активности слева */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all",
                  isEnabled ? "opacity-100" : "opacity-0"
                )}
                style={{ backgroundColor: color }}
              />

              <div className="flex items-center gap-4 pl-2">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all shadow-sm",
                    isEnabled
                      ? "scale-100"
                      : "scale-90 grayscale opacity-60"
                  )}
                  style={{
                    backgroundColor: isEnabled ? `${color}15` : undefined,
                  }}
                >
                  {mode.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold text-base",
                      !isEnabled && "text-muted-foreground"
                    )}>
                      {mode.label}
                    </span>
                    {isEnabled && (
                      <Badge 
                        className="text-xs text-white"
                        style={{ backgroundColor: color }}
                      >
                        ✓ Активен
                      </Badge>
                    )}
                    {!isEnabled && (
                      <Badge variant="outline" className="text-xs text-gray-400">
                        Отключён
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mt-0.5",
                    isEnabled ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>
                    {mode.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isLast && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                    ⚠️ Последний
                  </Badge>
                )}
                <div 
                  className={cn(
                    "w-14 h-8 rounded-full flex items-center transition-all p-1",
                    isEnabled 
                      ? "justify-end" 
                      : "justify-start bg-gray-200 dark:bg-zinc-700"
                  )}
                  style={{
                    backgroundColor: isEnabled ? color : undefined,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMode(mode.key);
                  }}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-white shadow-md transition-transform",
                    isEnabled ? "scale-100" : "scale-90"
                  )} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Подсказка */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">💡 Как это работает:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Это <strong>глобальные режимы платформы</strong> - влияют на ВСЕ организации</li>
          <li>Отключённые режимы не будут доступны ни одной организации</li>
          <li>Организации могут дополнительно ограничить режимы в своих настройках</li>
          <li>Минимум один режим всегда должен быть включён</li>
        </ul>
        <p className="mt-2 text-xs text-indigo-600">
          📌 Для настройки своих личных режимов перейдите в настройки вашей организации
        </p>
      </div>
    </div>
  );
}
