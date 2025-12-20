"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import { Plus, Zap, ArrowRight, Settings } from "lucide-react";

interface PostingRule {
  id: string;
  name: string;
  trigger_event: string;
  debit_account: string;
  credit_account: string;
  amount_source: string;
  is_active: boolean;
  last_triggered?: string;
  trigger_count: number;
}

interface AutoPostingsPageProps {
  rules: PostingRule[];
}

const triggerEvents: Record<string, string> = {
  invoice_created: "Создан счёт на оплату",
  payment_received: "Получен платёж",
  expense_approved: "Утверждён расход",
  document_posted: "Проведён документ",
  salary_calculated: "Начислена зарплата",
  tax_accrued: "Начислен налог",
};

export function AutoPostingsPage({ rules }: AutoPostingsPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [localRules, setLocalRules] = useState(rules);

  const activeCount = localRules.filter((r) => r.is_active).length;

  const toggleRule = (id: string) => {
    setLocalRules(localRules.map((r) =>
      r.id === id ? { ...r, is_active: !r.is_active } : r
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Автоматические проводки</h1>
          <p className="text-muted-foreground">
            Правила автоматического формирования бухгалтерских проводок
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
              <DialogTitle>Новое правило проводки</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название правила</Label>
                <Input placeholder="Проводка при получении оплаты" />
              </div>
              <div className="space-y-2">
                <Label>Событие-триггер</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите событие" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerEvents).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Счёт дебета</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Дт" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="51">51 - Расчётные счета</SelectItem>
                      <SelectItem value="62">62 - Расчёты с покупателями</SelectItem>
                      <SelectItem value="60">60 - Расчёты с поставщиками</SelectItem>
                      <SelectItem value="70">70 - Расчёты по оплате труда</SelectItem>
                      <SelectItem value="68">68 - Расчёты по налогам</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Счёт кредита</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Кт" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="51">51 - Расчётные счета</SelectItem>
                      <SelectItem value="62">62 - Расчёты с покупателями</SelectItem>
                      <SelectItem value="90">90 - Продажи</SelectItem>
                      <SelectItem value="91">91 - Прочие доходы/расходы</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Источник суммы</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Откуда брать сумму" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document_amount">Сумма документа</SelectItem>
                    <SelectItem value="payment_amount">Сумма платежа</SelectItem>
                    <SelectItem value="vat_amount">Сумма НДС</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Создать</Button>
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
                <div className="text-2xl font-bold">{localRules.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Активных</div>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Проводок создано</div>
            <div className="text-2xl font-bold">
              {localRules.reduce((sum, r) => sum + r.trigger_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Правила автопроводок
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Событие</TableHead>
                <TableHead>Проводка</TableHead>
                <TableHead className="text-center">Сработало</TableHead>
                <TableHead className="text-center">Активно</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localRules.map((rule) => (
                <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {triggerEvents[rule.trigger_event] || rule.trigger_event}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <Badge variant="secondary">Дт {rule.debit_account}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary">Кт {rule.credit_account}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{rule.trigger_count}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {localRules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Правила не созданы</p>
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
