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
import { Plus, Lock, Search, Package, Unlock } from "lucide-react";

type ReservationStatus = "active" | "fulfilled" | "cancelled" | "expired";

interface StockReservation {
  id: string;
  reservation_number: string;
  date: string;
  tender_name: string;
  item_name: string;
  warehouse: string;
  quantity: number;
  unit: string;
  reserved_until: string;
  status: ReservationStatus;
}

interface Props {
  reservations: StockReservation[];
  tenders: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; unit: string }>;
}

const statusLabels: Record<ReservationStatus, { label: string; color: string }> = {
  active: { label: "Активно", color: "bg-blue-100 text-blue-700" },
  fulfilled: { label: "Отгружено", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменено", color: "bg-gray-100 text-gray-700" },
  expired: { label: "Истекло", color: "bg-red-100 text-red-700" },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function StockReservationPage({ reservations, tenders, items }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeCount = reservations.filter(r => r.status === "active").length;
  const totalReserved = reservations.filter(r => r.status === "active").reduce((sum, r) => sum + r.quantity, 0);

  const filtered = reservations.filter(r =>
    r.reservation_number.toLowerCase().includes(search.toLowerCase()) ||
    r.tender_name.toLowerCase().includes(search.toLowerCase()) ||
    r.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Резервирование под тендеры</h1>
          <p className="text-muted-foreground">Резервирование ТМЦ под контракты</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Зарезервировать</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новое резервирование</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Тендер</Label>
                <Select><SelectTrigger><SelectValue placeholder="Выберите тендер" /></SelectTrigger>
                  <SelectContent>{tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Товар</Label>
                <Select><SelectTrigger><SelectValue placeholder="Выберите товар" /></SelectTrigger>
                  <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Количество</Label><Input type="number" /></div>
                <div className="space-y-2"><Label>Зарезервировать до</Label><Input type="date" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
                <Button onClick={() => setIsOpen(false)}>Зарезервировать</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Lock className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Всего резервов</div><div className="text-2xl font-bold">{reservations.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Активных</div><div className="text-2xl font-bold text-blue-600">{activeCount}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Ед. зарезервировано</div><div className="text-2xl font-bold">{totalReserved}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Тендеров</div><div className="text-2xl font-bold">{new Set(reservations.map(r => r.tender_name)).size}</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Резервы</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>№</TableHead><TableHead>Тендер</TableHead><TableHead>Товар</TableHead><TableHead>Склад</TableHead><TableHead className="text-right">Кол-во</TableHead><TableHead>До</TableHead><TableHead>Статус</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.reservation_number}</TableCell>
                  <TableCell>{r.tender_name}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.warehouse}</TableCell>
                  <TableCell className="text-right font-mono">{r.quantity} {r.unit}</TableCell>
                  <TableCell>{formatDate(r.reserved_until)}</TableCell>
                  <TableCell><Badge className={statusLabels[r.status]?.color}>{statusLabels[r.status]?.label}</Badge></TableCell>
                  <TableCell>{r.status === "active" && <Button variant="ghost" size="sm"><Unlock className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Резервы не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
