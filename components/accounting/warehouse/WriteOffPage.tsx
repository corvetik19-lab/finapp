"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Search, FileX } from "lucide-react";

type WriteOffStatus = "draft" | "approved" | "posted" | "cancelled";
type WriteOffReason = "damage" | "expiry" | "loss" | "defect" | "other";

interface WriteOff {
  id: string;
  document_number: string;
  date: string;
  warehouse: string;
  reason: WriteOffReason;
  items_count: number;
  total_amount: number;
  status: WriteOffStatus;
  responsible: string;
}

interface Props {
  writeOffs: WriteOff[];
  warehouses: Array<{ id: string; name: string }>;
}

const statusLabels: Record<WriteOffStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  approved: { label: "Утверждён", color: "bg-blue-100 text-blue-700" },
  posted: { label: "Проведён", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменён", color: "bg-red-100 text-red-700" },
};

const reasonLabels: Record<WriteOffReason, string> = {
  damage: "Порча", expiry: "Истечение срока", loss: "Утеря", defect: "Брак", other: "Прочее",
};

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function WriteOffPage({ writeOffs, warehouses }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const totalAmount = writeOffs.filter(w => w.status === "posted").reduce((sum, w) => sum + w.total_amount, 0);
  const thisMonthCount = writeOffs.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = writeOffs.filter(w =>
    w.document_number.toLowerCase().includes(search.toLowerCase()) ||
    w.warehouse.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Списание ТМЦ</h1>
          <p className="text-muted-foreground">Акты на списание товарно-материальных ценностей</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Создать акт списания</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый акт списания</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Склад</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Причина</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{Object.entries(reasonLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Дата</Label><Input type="date" /></div>
              <div className="space-y-2"><Label>Ответственный</Label><Input placeholder="ФИО" /></div>
              <div className="space-y-2"><Label>Основание</Label><Textarea placeholder="Причина списания, акт осмотра и т.д." /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Создать</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-red-100 rounded-lg"><Trash2 className="h-6 w-6 text-red-600" /></div><div><div className="text-sm text-muted-foreground">Всего актов</div><div className="text-2xl font-bold">{writeOffs.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">За этот месяц</div><div className="text-2xl font-bold">{thisMonthCount}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Списано на сумму</div><div className="text-2xl font-bold text-red-600">{formatMoney(totalAmount)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Складов</div><div className="text-2xl font-bold">{warehouses.length}</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><FileX className="h-4 w-4" />Акты списания</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>№ документа</TableHead><TableHead>Дата</TableHead><TableHead>Склад</TableHead><TableHead>Причина</TableHead><TableHead className="text-center">Позиций</TableHead><TableHead className="text-right">Сумма</TableHead><TableHead>Ответственный</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.document_number}</TableCell>
                  <TableCell>{formatDate(w.date)}</TableCell>
                  <TableCell>{w.warehouse}</TableCell>
                  <TableCell><Badge variant="outline">{reasonLabels[w.reason]}</Badge></TableCell>
                  <TableCell className="text-center">{w.items_count}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatMoney(w.total_amount)} ₽</TableCell>
                  <TableCell className="text-muted-foreground">{w.responsible}</TableCell>
                  <TableCell><Badge className={statusLabels[w.status]?.color}>{statusLabels[w.status]?.label}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><FileX className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Акты списания не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
