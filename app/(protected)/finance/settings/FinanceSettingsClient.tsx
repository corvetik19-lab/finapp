"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Zap, Flag, Bookmark } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

interface PlanType {
  id: string;
  name: string;
  description?: string;
}

interface PlanPreset {
  id: string;
  name: string;
  description?: string;
  plan_type_id: string;
}

interface Props {
  categories: Category[];
  planTypes: PlanType[];
  planPresets: PlanPreset[];
}

export default function FinanceSettingsClient({
  categories,
  planTypes,
  planPresets,
}: Props) {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Настройки Финансов</h1><p className="text-muted-foreground">Управление категориями и планами</p></div>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Категории</CardTitle><Button size="sm"><Plus className="h-4 w-4 mr-1" />Добавить</Button></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground mb-4">Всего: {categories.length}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{categories.slice(0, 6).map((c) => <div key={c.id} className="flex items-center gap-2 p-2 rounded border"><span className="text-lg">{c.icon || '📁'}</span><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.type === 'income' ? 'Доход' : 'Расход'}</p></div></div>)}</div>
        {categories.length > 6 && <p className="text-sm text-muted-foreground mt-2">И ещё {categories.length - 6}...</p>}
      </CardContent></Card>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Справочник товаров</CardTitle><Link href="/finance/settings/products"><Button variant="outline" size="sm"><ShoppingCart className="h-4 w-4 mr-1" />Управление</Button></Link></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground">Добавьте товары для быстрого выбора при создании транзакций.</p>
      </CardContent></Card>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Быстрые транзакции</CardTitle><Link href="/finance/settings/quick-presets"><Button variant="outline" size="sm"><Zap className="h-4 w-4 mr-1" />Пресеты</Button></Link></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground">Настройте пресеты для мгновенного добавления частых транзакций.</p>
      </CardContent></Card>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Типы планов</CardTitle><Button size="sm"><Plus className="h-4 w-4 mr-1" />Добавить</Button></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground mb-4">Всего: {planTypes.length}</p>
        <div className="grid gap-2">{planTypes.map((pt) => <div key={pt.id} className="flex items-center gap-2 p-2 rounded border"><Flag className="h-4 w-4" /><div><p className="font-medium text-sm">{pt.name}</p>{pt.description && <p className="text-xs text-muted-foreground">{pt.description}</p>}</div></div>)}</div>
      </CardContent></Card>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Пресеты планов</CardTitle><Button size="sm"><Plus className="h-4 w-4 mr-1" />Добавить</Button></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground mb-4">Всего: {planPresets.length}</p>
        <div className="grid gap-2">{planPresets.map((pp) => <div key={pp.id} className="flex items-center gap-2 p-2 rounded border"><Bookmark className="h-4 w-4" /><div><p className="font-medium text-sm">{pp.name}</p>{pp.description && <p className="text-xs text-muted-foreground">{pp.description}</p>}</div></div>)}</div>
      </CardContent></Card>
    </div>
  );
}
