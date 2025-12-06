"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEnabledModes } from "@/lib/platform/platform-settings";
import type { AppModeKey } from "@/lib/platform/modes-config";
import { Switch } from "@/components/ui/switch";
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
      <div className="grid gap-4">
        {allModes.map((mode) => {
          const isEnabled = modes.has(mode.key);
          const isLast = modes.size === 1 && isEnabled;

          return (
            <div
              key={mode.key}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                isEnabled
                  ? "bg-gradient-to-r from-primary/5 to-transparent border-primary/20"
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                    isEnabled
                      ? "bg-primary/10"
                      : "bg-muted grayscale opacity-50"
                  )}
                >
                  {mode.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      !isEnabled && "text-muted-foreground"
                    )}>
                      {mode.label}
                    </span>
                    {isEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Включён
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm",
                    isEnabled ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>
                    {mode.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isLast && (
                  <span className="text-xs text-amber-600">
                    Последний активный
                  </span>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleMode(mode.key)}
                  disabled={isPending}
                />
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
