"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { DashboardCustomizer } from "./DashboardCustomizer";
import type { WidgetVisibilityState } from "@/lib/dashboard/preferences/shared";
import TourGuide from "@/components/onboarding/TourGuide";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";

type DashboardClientProps = {
  children: React.ReactNode;
  widgetVisibility: WidgetVisibilityState;
  showCustomizeButton?: boolean;
};

export default function DashboardClient({
  children,
  showCustomizeButton = true,
}: DashboardClientProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Интерактивный тур по дашборду */}
      <TourGuide page="dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Обзор ваших финансов</p>
        </div>
        {showCustomizeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Настроить
          </Button>
        )}
      </div>

      {/* Чек-лист "Первые шаги" */}
      <OnboardingChecklist />

      {children}

      {showCustomizeButton && isSettingsOpen && (
        <DashboardCustomizer onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
