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
import { Plus, ArrowRightLeft, Search, Truck } from "lucide-react";

type TransferStatus = "draft" | "in_transit" | "completed" | "cancelled";

interface StockTransfer {
  id: string;
  document_number: string;
  date: string;
  from_warehouse: string;
  to_warehouse: string;
  items_count: number;
  total_quantity: number;
  status: TransferStatus;
  notes?: string;
}

interface Props {
  transfers: StockTransfer[];
  warehouses: Array<{ id: string; name: string }>;
}

const statusLabels: Record<TransferStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-700" },
  in_transit: { label: "В пути", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Завершено", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменено", color: "bg-red-100 text-red-700" },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function StockTransferPage({ transfers, warehouses }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const inTransitCount = transfers.filter(t => t.status === "in_transit").length;
  const completedCount = transfers.filter(t => t.status === "completed").length;

  const filtered = transfers.filter(t =>
    t.document_number.toLowerCase().includes(search.toLowerCase()) ||
    t.from_warehouse.toLowerCase().includes(search.toLowerCase()) ||
    t.to_warehouse.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Перемещения между складами</h1>
          <p className="text-muted-foreground">Внутренние перемещения ТМЦ</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Новое перемещение</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Создать перемещение</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Со склада</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>На склад</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Дата</Label><Input type="date" /></div>
              <div className="space-y-2"><Label>Примечание</Label><Input placeholder="Причина перемещения" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Создать</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><ArrowRightLeft className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Всего</div><div className="text-2xl font-bold">{transfers.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3 text-blue-500" />В пути</div><div className="text-2xl font-bold text-blue-600">{inTransitCount}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Завершено</div><div className="text-2xl font-bold text-emerald-600">{completedCount}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Складов</div><div className="text-2xl font-bold">{warehouses.length}</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Перемещения</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>№ документа</TableHead><TableHead>Дата</TableHead><TableHead>Откуда</TableHead><TableHead>Куда</TableHead><TableHead className="text-center">Позиций</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.document_number}</TableCell>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>{t.from_warehouse}</TableCell>
                  <TableCell>{t.to_warehouse}</TableCell>
                  <TableCell className="text-center">{t.items_count}</TableCell>
                  <TableCell><Badge className={statusLabels[t.status]?.color}>{statusLabels[t.status]?.label}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><Truck className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Перемещения не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
