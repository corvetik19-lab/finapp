"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link2, CheckCircle, AlertTriangle, Search, Zap, XCircle } from "lucide-react";

type MatchStatus = "matched" | "suggested" | "unmatched" | "manual";

interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  counterparty: string;
  purpose: string;
  match_status: MatchStatus;
  matched_document?: { id: string; number: string; type: string };
  suggested_matches?: Array<{ id: string; number: string; type: string; amount: number; confidence: number }>;
}

interface Props {
  transactions: BankTransaction[];
  period: string;
}

const statusLabels: Record<MatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  matched: { label: "Сопоставлено", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="h-3 w-3" /> },
  suggested: { label: "Есть варианты", color: "bg-blue-100 text-blue-700", icon: <Zap className="h-3 w-3" /> },
  unmatched: { label: "Не найдено", color: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="h-3 w-3" /> },
  manual: { label: "Вручную", color: "bg-purple-100 text-purple-700", icon: <Link2 className="h-3 w-3" /> },
};

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function PaymentReconciliationPage({ transactions, period }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const matchedCount = transactions.filter(t => t.match_status === "matched").length;
  const unmatchedCount = transactions.filter(t => t.match_status === "unmatched").length;
  const suggestedCount = transactions.filter(t => t.match_status === "suggested").length;
  const matchRate = transactions.length > 0 ? (matchedCount / transactions.length) * 100 : 0;

  const filtered = transactions.filter(t => {
    const matchesSearch = t.counterparty.toLowerCase().includes(search.toLowerCase()) || t.purpose.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.match_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Автосверка платежей</h1>
          <p className="text-muted-foreground">Сопоставление банковских операций с документами • {period}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={selected.size === 0}><XCircle className="h-4 w-4 mr-2" />Отклонить ({selected.size})</Button>
          <Button disabled={selected.size === 0}><CheckCircle className="h-4 w-4 mr-2" />Подтвердить ({selected.size})</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Link2 className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Всего операций</div><div className="text-2xl font-bold">{transactions.length}</div></div></div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50"><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Сопоставлено</div><div className="text-2xl font-bold text-emerald-600">{matchedCount}</div></CardContent></Card>
        <Card className={suggestedCount > 0 ? "border-blue-200 bg-blue-50" : ""}><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3 text-blue-500" />Есть варианты</div><div className="text-2xl font-bold text-blue-600">{suggestedCount}</div></CardContent></Card>
        <Card className={unmatchedCount > 0 ? "border-amber-200 bg-amber-50" : ""}><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Не найдено</div><div className="text-2xl font-bold text-amber-600">{unmatchedCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Процент сопоставления</span><span className="text-sm font-medium">{matchRate.toFixed(0)}%</span></div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${(matchedCount / transactions.length) * 100}%` }} />
            <div className="bg-blue-500 h-full" style={{ width: `${(suggestedCount / transactions.length) * 100}%` }} />
            <div className="bg-amber-500 h-full" style={{ width: `${(unmatchedCount / transactions.length) * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск по контрагенту или назначению..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="matched">Сопоставлено</SelectItem>
            <SelectItem value="suggested">Есть варианты</SelectItem>
            <SelectItem value="unmatched">Не найдено</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />Операции для сверки</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} /></TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Назначение</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Документ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id} className={selected.has(t.id) ? "bg-muted/50" : ""}>
                  <TableCell><Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} /></TableCell>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell className={`text-right font-mono ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{t.amount >= 0 ? "+" : ""}{formatMoney(t.amount)} ₽</TableCell>
                  <TableCell className="font-medium max-w-[150px] truncate">{t.counterparty}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{t.purpose}</TableCell>
                  <TableCell><Badge className={`gap-1 ${statusLabels[t.match_status]?.color}`}>{statusLabels[t.match_status]?.icon}{statusLabels[t.match_status]?.label}</Badge></TableCell>
                  <TableCell>
                    {t.matched_document ? (
                      <span className="text-sm">{t.matched_document.type} №{t.matched_document.number}</span>
                    ) : t.suggested_matches && t.suggested_matches.length > 0 ? (
                      <Select><SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Выберите документ" /></SelectTrigger>
                        <SelectContent>{t.suggested_matches.map(m => <SelectItem key={m.id} value={m.id}>{m.type} №{m.number} ({m.confidence}%)</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Button variant="outline" size="sm">Найти вручную</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Операции не найдены</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
