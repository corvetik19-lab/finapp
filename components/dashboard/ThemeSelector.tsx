"use client";

import { cn } from "@/lib/utils";
import { Check, Sun, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeSelectorProps {
  value: "light" | "dark" | "auto";
  onChange: (theme: "light" | "dark" | "auto") => void;
}

const THEMES = [
  { value: "light" as const, name: "Светлая", icon: Sun, description: "Классическая светлая тема" },
  { value: "dark" as const, name: "Тёмная", icon: Moon, description: "Тёмная тема для работы ночью" },
  { value: "auto" as const, name: "Авто", icon: RefreshCw, description: "Следует системным настройкам" },
];

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((theme) => (
        <Button
          key={theme.value}
          variant="outline"
          className={cn(
            "flex flex-col items-center gap-2 p-4 h-auto transition-all",
            value === theme.value ? "border-primary border-2 bg-primary/5" : "border-muted"
          )}
          onClick={() => onChange(theme.value)}
        >
          <theme.icon className="h-6 w-6" />
          <div className="text-center">
            <div className="font-medium text-sm">{theme.name}</div>
            <div className="text-xs text-muted-foreground">{theme.description}</div>
          </div>
          {value === theme.value && <Check className="h-4 w-4 text-primary" />}
        </Button>
      ))}
    </div>
  );
}
