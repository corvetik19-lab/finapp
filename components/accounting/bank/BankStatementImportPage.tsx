"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Download } from "lucide-react";

type ImportStatus = "pending" | "processing" | "completed" | "error";

interface ImportHistory {
  id: string;
  filename: string;
  format: string;
  bank_account: string;
  date: string;
  transactions_count: number;
  new_count: number;
  duplicate_count: number;
  error_count: number;
  status: ImportStatus;
}

interface Props {
  history: ImportHistory[];
  bankAccounts: Array<{ id: string; name: string; bank: string }>;
}

const statusLabels: Record<ImportStatus, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-gray-100 text-gray-700" },
  processing: { label: "Обработка", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Завершён", color: "bg-emerald-100 text-emerald-700" },
  error: { label: "Ошибка", color: "bg-red-100 text-red-700" },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function BankStatementImportPage({ history, bankAccounts }: Props) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const totalImported = history.reduce((sum, h) => sum + h.new_count, 0);
  const totalDuplicates = history.reduce((sum, h) => sum + h.duplicate_count, 0);

  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 100) { clearInterval(interval); setIsUploading(false); return 100; }
        return p + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Импорт банковских выписок</h1>
          <p className="text-muted-foreground">Загрузка выписок из файлов TXT, CSV, 1C</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Upload className="h-6 w-6 text-blue-600" /></div><div><div className="text-sm text-muted-foreground">Импортов</div><div className="text-2xl font-bold">{history.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Загружено операций</div><div className="text-2xl font-bold text-emerald-600">{totalImported}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Дубликатов</div><div className="text-2xl font-bold text-amber-600">{totalDuplicates}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Счетов</div><div className="text-2xl font-bold">{bankAccounts.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />Загрузить выписку</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Банковский счёт</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger><SelectValue placeholder="Выберите счёт" /></SelectTrigger>
                <SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.bank})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Формат файла</label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger><SelectValue placeholder="Выберите формат" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1c">1С (txt)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="sber">Сбербанк</SelectItem>
                  <SelectItem value="alfa">Альфа-Банк</SelectItem>
                  <SelectItem value="tinkoff">Тинькофф</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Файл</label>
              <Input type="file" accept=".txt,.csv,.xls,.xlsx" />
            </div>
          </div>
          {isUploading && <div className="space-y-2"><div className="flex justify-between text-sm"><span>Загрузка...</span><span>{uploadProgress}%</span></div><Progress value={uploadProgress} /></div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline"><Download className="h-4 w-4 mr-2" />Скачать шаблон</Button>
            <Button onClick={handleUpload} disabled={!selectedAccount || !selectedFormat || isUploading}><Upload className="h-4 w-4 mr-2" />Загрузить</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />История импорта</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Файл</TableHead><TableHead>Формат</TableHead><TableHead>Счёт</TableHead><TableHead>Дата</TableHead><TableHead className="text-center">Всего</TableHead><TableHead className="text-center">Новых</TableHead><TableHead className="text-center">Дубли</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.filename}</TableCell>
                  <TableCell><Badge variant="outline">{h.format}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{h.bank_account}</TableCell>
                  <TableCell>{formatDate(h.date)}</TableCell>
                  <TableCell className="text-center">{h.transactions_count}</TableCell>
                  <TableCell className="text-center text-emerald-600">{h.new_count}</TableCell>
                  <TableCell className="text-center text-amber-600">{h.duplicate_count > 0 ? h.duplicate_count : "—"}</TableCell>
                  <TableCell><Badge className={statusLabels[h.status]?.color}>{statusLabels[h.status]?.label}</Badge></TableCell>
                </TableRow>
              ))}
              {history.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><Upload className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>История импорта пуста</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
