"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, Zap, ArrowDown, ArrowUp } from "lucide-react";
import { BankIntegration } from "@/lib/accounting/bank-types";

interface BankRulesPageProps {
  integrations: BankIntegration[];
}

interface ProcessingRule {
  id: string;
  name: string;
  condition_type: "contains" | "starts_with" | "ends_with" | "regex" | "inn";
  condition_value: string;
  condition_field: "purpose" | "counterparty_name" | "counterparty_inn";
  operation_type: "credit" | "debit" | "any";
  action_category?: string;
  action_counterparty_id?: string;
  priority: number;
  is_active: boolean;
}

const DEMO_RULES: ProcessingRule[] = [
  {
    id: "1",
    name: "Оплата за услуги связи",
    condition_type: "contains",
    condition_value: "услуги связи",
    condition_field: "purpose",
    operation_type: "debit",
    action_category: "Связь",
    priority: 1,
    is_active: true,
  },
  {
    id: "2",
    name: "Поступления от ИП",
    condition_type: "starts_with",
    condition_value: "ИП ",
    condition_field: "counterparty_name",
    operation_type: "credit",
    action_category: "Доходы от ИП",
    priority: 2,
    is_active: true,
  },
  {
    id: "3",
    name: "Зарплата",
    condition_type: "contains",
    condition_value: "заработная плата",
    condition_field: "purpose",
    operation_type: "debit",
    action_category: "ФОТ",
    priority: 3,
    is_active: false,
  },
];

const CONDITION_TYPES = {
  contains: "Содержит",
  starts_with: "Начинается с",
  ends_with: "Заканчивается на",
  regex: "Регулярное выражение",
  inn: "ИНН равен",
};

const CONDITION_FIELDS = {
  purpose: "Назначение платежа",
  counterparty_name: "Наименование контрагента",
  counterparty_inn: "ИНН контрагента",
};

export function BankRulesPage({ integrations }: BankRulesPageProps) {
  const [rules, setRules] = useState<ProcessingRule[]>(DEMO_RULES);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const activeRules = rules.filter((r) => r.is_active);

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => 
      r.id === id ? { ...r, is_active: !r.is_active } : r
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Правила обработки</h1>
          <p className="text-muted-foreground">
            Автоматическая категоризация банковских операций
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать правило
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Новое правило</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название правила</Label>
                <Input placeholder="Оплата за аренду" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Поле для проверки</Label>
                  <Select defaultValue="purpose">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_FIELDS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Условие</Label>
                  <Select defaultValue="contains">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Значение</Label>
                <Input placeholder="аренда помещения" />
              </div>
              <div className="space-y-2">
                <Label>Тип операции</Label>
                <Select defaultValue="any">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая</SelectItem>
                    <SelectItem value="credit">Поступление</SelectItem>
                    <SelectItem value="debit">Списание</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Категория для назначения</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Аренда</SelectItem>
                    <SelectItem value="salary">ФОТ</SelectItem>
                    <SelectItem value="utilities">Коммунальные услуги</SelectItem>
                    <SelectItem value="taxes">Налоги</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего правил</div>
                <div className="text-2xl font-bold">{rules.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Активных</div>
            <div className="text-2xl font-bold text-emerald-600">{activeRules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Подключений</div>
            <div className="text-2xl font-bold">{integrations.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Правила обработки
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Условие</TableHead>
                <TableHead>Тип операции</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead className="text-center">Активно</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {CONDITION_FIELDS[rule.condition_field]}
                      </span>
                      <br />
                      <Badge variant="outline" className="mt-1">
                        {CONDITION_TYPES[rule.condition_type]}: &quot;{rule.condition_value}&quot;
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.operation_type === "credit" ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowDown className="h-4 w-4" />
                        Поступление
                      </div>
                    ) : rule.operation_type === "debit" ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowUp className="h-4 w-4" />
                        Списание
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Любая</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{rule.action_category || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{rule.priority}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Правила не созданы</p>
                    <p className="text-sm">Создайте правила для автоматической категоризации</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
