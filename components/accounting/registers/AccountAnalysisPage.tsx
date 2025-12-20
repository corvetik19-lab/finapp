"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Search, BarChart3 } from "lucide-react";

interface AccountEntry {
  date: string;
  document_number: string;
  document_type: string;
  counterparty?: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
}

interface Props {
  accountCode: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: AccountEntry[];
}

const formatMoney = (a: number) => new Intl.NumberFormat("ru-RU").format(a / 100);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

export function AccountAnalysisPage({ accountCode, accountName, openingBalance, closingBalance, totalDebit, totalCredit, entries }: Props) {
  const [search, setSearch] = useState("");

  const filtered = entries.filter(e =>
    e.document_number.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    (e.counterparty?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Анализ счёта {accountCode}</h1>
          <p className="text-muted-foreground">{accountName}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="quarter">За квартал</SelectItem>
              <SelectItem value="year">За год</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Экспорт</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Сальдо на начало</div><div className="text-2xl font-bold">{formatMoney(openingBalance)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Обороты Дт</div><div className="text-2xl font-bold text-blue-600">{formatMoney(totalDebit)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Обороты Кт</div><div className="text-2xl font-bold text-emerald-600">{formatMoney(totalCredit)} ₽</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Сальдо на конец</div><div className="text-2xl font-bold">{formatMoney(closingBalance)} ₽</div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск по документам..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Движение по счёту</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Документ</TableHead><TableHead>Контрагент</TableHead><TableHead className="text-right">Дебет</TableHead><TableHead className="text-right">Кредит</TableHead><TableHead className="text-right">Сальдо</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow className="bg-muted/50"><TableCell colSpan={3} className="font-medium">Сальдо на начало периода</TableCell><TableCell /><TableCell /><TableCell className="text-right font-mono font-medium">{formatMoney(openingBalance)}</TableCell></TableRow>
              {filtered.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell><div className="font-medium">{e.document_number}</div><div className="text-xs text-muted-foreground">{e.document_type}</div></TableCell>
                  <TableCell className="text-sm">{e.counterparty || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{e.debit > 0 ? formatMoney(e.debit) : ""}</TableCell>
                  <TableCell className="text-right font-mono">{e.credit > 0 ? formatMoney(e.credit) : ""}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(e.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium"><TableCell colSpan={3}>Обороты за период</TableCell><TableCell className="text-right font-mono">{formatMoney(totalDebit)}</TableCell><TableCell className="text-right font-mono">{formatMoney(totalCredit)}</TableCell><TableCell /></TableRow>
              <TableRow className="bg-muted/50"><TableCell colSpan={3} className="font-medium">Сальдо на конец периода</TableCell><TableCell /><TableCell /><TableCell className="text-right font-mono font-medium">{formatMoney(closingBalance)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
