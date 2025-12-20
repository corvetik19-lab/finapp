"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, Search, Building2 } from "lucide-react";

type Status = "active" | "completed" | "suspended" | "terminated";

interface Subcontractor {
  id: string;
  counterparty_name: string;
  counterparty_inn: string;
  contract_number: string;
  contract_amount: number;
  paid_amount: number;
  work_description: string;
  status: Status;
}

interface Props {
  tenderName: string;
  subcontractors: Subcontractor[];
}

const statusLabels: Record<Status, { label: string; color: string }> = {
  active: { label: "В работе", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Завершено", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Приостановлено", color: "bg-amber-100 text-amber-700" },
  terminated: { label: "Расторгнут", color: "bg-red-100 text-red-700" },
};

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);

export function SubcontractorsPage({ tenderName, subcontractors }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const totalAmount = subcontractors.reduce((sum, s) => sum + s.contract_amount, 0);
  const paidAmount = subcontractors.reduce((sum, s) => sum + s.paid_amount, 0);
  const activeCount = subcontractors.filter(s => s.status === "active").length;

  const filtered = subcontractors.filter(s =>
    s.counterparty_name.toLowerCase().includes(search.toLowerCase()) ||
    s.contract_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Субподрядчики</h1>
          <p className="text-muted-foreground">{tenderName}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый субподрядчик</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Контрагент</Label><Input placeholder="Наименование организации" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>ИНН</Label><Input placeholder="ИНН" /></div>
                <div className="space-y-2"><Label>№ договора</Label><Input placeholder="№" /></div>
              </div>
              <div className="space-y-2"><Label>Сумма договора</Label><Input type="number" /></div>
              <div className="space-y-2"><Label>Описание работ</Label><Input placeholder="Вид работ" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Добавить</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Всего</div><div className="text-2xl font-bold">{subcontractors.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">В работе</div><div className="text-2xl font-bold text-blue-600">{activeCount}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Сумма договоров</div><div className="text-2xl font-bold">{formatMoney(totalAmount)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Оплачено</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(paidAmount)} ₽</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Субподрядчики</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Контрагент</TableHead><TableHead>ИНН</TableHead><TableHead>№ договора</TableHead><TableHead className="text-right">Сумма</TableHead><TableHead className="text-right">Оплачено</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.counterparty_name}</TableCell>
                  <TableCell className="font-mono text-sm">{s.counterparty_inn}</TableCell>
                  <TableCell>{s.contract_number}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(s.contract_amount)} ₽</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{formatMoney(s.paid_amount)} ₽</TableCell>
                  <TableCell><Badge className={statusLabels[s.status]?.color}>{statusLabels[s.status]?.label}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Субподрядчики не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
