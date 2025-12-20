"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast/ToastContext";
import { Loader2, Save, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateOrganizationModes } from "@/lib/admin/organization-settings";

interface ModeInfo {
  key: string;
  label: string;
  icon: string;
  description: string;
}

interface OrgModesManagerProps {
  allModes: readonly ModeInfo[];
  globalEnabledModes: string[];
  orgModes: string[];
  organizationId: string;
  isSuperAdmin?: boolean;
}

export function OrgModesManager({ 
  allModes, 
  globalEnabledModes, 
  orgModes, 
  organizationId,
  isSuperAdmin = false
}: OrgModesManagerProps) {
  const [modes, setModes] = useState<Set<string>>(new Set(orgModes));
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();
  const { show: showToast } = useToast();

  const toggleMode = (key: string) => {
    // Только супер-админ может менять режимы
    if (!isSuperAdmin) {
      showToast("Изменение режимов доступно только администратору платформы", { type: "error" });
      return;
    }
    
    // Нельзя включить режим, который отключён глобально
    if (!globalEnabledModes.includes(key)) {
      showToast("Этот режим отключён администратором платформы", { type: "error" });
      return;
    }

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
      const result = await updateOrganizationModes(organizationId, Array.from(modes));
      
      if (result.ok) {
        showToast("Режимы организации сохранены", { type: "success" });
        setHasChanges(false);
        router.refresh();
      } else {
        showToast(result.error || "Ошибка сохранения", { type: "error" });
      }
    });
  };

  const enabledCount = modes.size;
  const availableCount = globalEnabledModes.length;

  return (
    <div className="space-y-6">
      {/* Статус */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={enabledCount === availableCount ? "default" : "secondary"}>
            {enabledCount} из {availableCount} включено
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
          const isGloballyEnabled = globalEnabledModes.includes(mode.key);
          const isLast = modes.size === 1 && isEnabled;

          return (
            <div
              key={mode.key}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                !isGloballyEnabled
                  ? "bg-gray-50 border-gray-200 opacity-60"
                  : isEnabled
                    ? "bg-gradient-to-r from-blue-50 to-transparent border-blue-200"
                    : "bg-muted/30 border-muted"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                    !isGloballyEnabled
                      ? "bg-gray-200 grayscale"
                      : isEnabled
                        ? "bg-blue-100"
                        : "bg-muted grayscale opacity-50"
                  )}
                >
                  {mode.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      !isGloballyEnabled && "text-gray-400",
                      !isEnabled && isGloballyEnabled && "text-muted-foreground"
                    )}>
                      {mode.label}
                    </span>
                    {!isGloballyEnabled && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        <Lock className="h-3 w-3 mr-1" />
                        Отключён платформой
                      </Badge>
                    )}
                    {isEnabled && isGloballyEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Включён
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm",
                    !isGloballyEnabled 
                      ? "text-gray-400" 
                      : isEnabled 
                        ? "text-muted-foreground" 
                        : "text-muted-foreground/50"
                  )}>
                    {mode.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isLast && isGloballyEnabled && (
                  <span className="text-xs text-amber-600">
                    Последний активный
                  </span>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleMode(mode.key)}
                  disabled={isPending || !isGloballyEnabled || !isSuperAdmin}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Подсказка */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">💡 Информация о режимах:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Включённые режимы доступны всем сотрудникам организации</li>
          {!isSuperAdmin && (
            <li className="text-amber-600 font-medium">
              Изменение режимов доступно только администратору платформы при создании или настройке организации
            </li>
          )}
          {isSuperAdmin && (
            <>
              <li>Режимы с замком отключены глобально и недоступны</li>
              <li>Минимум один режим всегда должен быть включён</li>
            </>
          )}
          <li>Вы можете ограничить доступ к режимам для конкретных сотрудников в разделе «Роли и права»</li>
        </ul>
      </div>
    </div>
  );
}
