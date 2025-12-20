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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ClipboardList, Search, AlertTriangle, CheckCircle } from "lucide-react";

type InventoryStatus = "planned" | "in_progress" | "completed" | "cancelled";

interface InventoryCheck {
  id: string;
  document_number: string;
  date: string;
  warehouse: string;
  items_count: number;
  discrepancies: number;
  surplus_amount: number;
  shortage_amount: number;
  status: InventoryStatus;
}

interface Props {
  checks: InventoryCheck[];
  warehouses: Array<{ id: string; name: string }>;
}

const statusLabels: Record<InventoryStatus, { label: string; color: string }> = {
  planned: { label: "Запланирована", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "В процессе", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Завершена", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменена", color: "bg-red-100 text-red-700" },
};

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function InventoryPage({ checks, warehouses }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const inProgressCount = checks.filter(c => c.status === "in_progress").length;
  const totalDiscrepancies = checks.reduce((sum, c) => sum + c.discrepancies, 0);
  const totalShortage = checks.reduce((sum, c) => sum + c.shortage_amount, 0);

  const filtered = checks.filter(c =>
    c.document_number.toLowerCase().includes(search.toLowerCase()) ||
    c.warehouse.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Инвентаризация</h1>
          <p className="text-muted-foreground">Формы ИНВ-3, ИНВ-19</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Начать инвентаризацию</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новая инвентаризация</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Склад</Label>
                <Select><SelectTrigger><SelectValue placeholder="Выберите склад" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Дата проведения</Label><Input type="date" /></div>
              <div className="space-y-2"><Label>Ответственный</Label><Input placeholder="ФИО" /></div>
              <div className="space-y-2"><Label>Основание</Label><Input placeholder="Приказ №" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Создать</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><ClipboardList className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Всего</div><div className="text-2xl font-bold">{checks.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">В процессе</div><div className="text-2xl font-bold text-blue-600">{inProgressCount}</div></CardContent></Card>
        <Card className={totalDiscrepancies > 0 ? "border-amber-200 bg-amber-50" : ""}><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Расхождений</div><div className="text-2xl font-bold text-amber-600">{totalDiscrepancies}</div></CardContent></Card>
        <Card className={totalShortage > 0 ? "border-red-200 bg-red-50" : ""}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Недостача</div><div className="text-2xl font-bold text-red-600">{formatMoney(totalShortage)} ₽</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />Инвентаризации</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>№ документа</TableHead><TableHead>Дата</TableHead><TableHead>Склад</TableHead><TableHead className="text-center">Позиций</TableHead><TableHead className="text-center">Расхожд.</TableHead><TableHead className="text-right">Излишки</TableHead><TableHead className="text-right">Недостача</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.document_number}</TableCell>
                  <TableCell>{formatDate(c.date)}</TableCell>
                  <TableCell>{c.warehouse}</TableCell>
                  <TableCell className="text-center">{c.items_count}</TableCell>
                  <TableCell className="text-center">{c.discrepancies > 0 ? <Badge variant="secondary" className="bg-amber-100 text-amber-700">{c.discrepancies}</Badge> : <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{c.surplus_amount > 0 ? `+${formatMoney(c.surplus_amount)}` : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{c.shortage_amount > 0 ? `−${formatMoney(c.shortage_amount)}` : "—"}</TableCell>
                  <TableCell><Badge className={statusLabels[c.status]?.color}>{statusLabels[c.status]?.label}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Инвентаризации не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
