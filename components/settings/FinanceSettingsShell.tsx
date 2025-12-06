"use client";

import CategoriesManager from "./CategoriesManager";
import FinanceGeneralSettings from "./FinanceGeneralSettings";
import { ProductItemsManager } from "@/components/product-items/ProductItemsManager";
import { QuickPresetsManager } from "@/components/quick-presets/QuickPresetsManager";
import type { CategoryRecord } from "./CategoriesManager";
import type { FinanceSettings } from "@/types/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, FolderTree, ShoppingCart, Zap, Wallet } from "lucide-react";

interface Props {
  categories: CategoryRecord[];
  settings: FinanceSettings;
}

export default function FinanceSettingsShell({
  categories,
  settings,
}: Props) {
  const handleSaveSettings = async (newSettings: FinanceSettings) => {
    const response = await fetch("/api/settings/modes/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });

    if (!response.ok) {
      throw new Error("Failed to save settings");
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <Wallet className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки финансов</h1>
          <p className="text-muted-foreground mt-1">Управление категориями, товарами и параметрами финансового учёта</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Основные</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Категории</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Товары</span>
          </TabsTrigger>
          <TabsTrigger value="quick" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Быстрые</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Основные настройки
              </CardTitle>
              <CardDescription>Настройте бюджеты, уведомления, отчёты и интерфейс</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FinanceGeneralSettings categories={categories} settings={settings} onSave={handleSaveSettings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                Категории
              </CardTitle>
              <CardDescription>Создавайте и редактируйте категории доходов и расходов</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <CategoriesManager categories={categories} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Товары и услуги
              </CardTitle>
              <CardDescription>Справочник товаров для быстрого добавления в транзакции</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ProductItemsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Быстрые транзакции
              </CardTitle>
              <CardDescription>Пресеты для мгновенного добавления частых операций</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <QuickPresetsManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
