"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BookOpen, 
  ArrowLeft,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  Calculator
} from "lucide-react";
import { 
  KudirEntry, 
  AccountingSettings,
  formatMoney,
  formatDate,
  getQuarterName,
  TAX_SYSTEMS
} from "@/lib/accounting/types";

interface KudirPageProps {
  entries: KudirEntry[];
  settings: AccountingSettings | null;
  year: number;
}

export function KudirPage({ entries, settings, year }: KudirPageProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");

  // Фильтрация по кварталу
  const filteredEntries = useMemo(() => {
    if (selectedQuarter === "all") return entries;
    
    const quarter = parseInt(selectedQuarter);
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.entry_date);
      const month = entryDate.getMonth();
      return month >= startMonth && month <= endMonth;
    });
  }, [entries, selectedQuarter]);

  // Расчёт итогов
  const totals = useMemo(() => {
    const totalIncome = filteredEntries.reduce((sum, e) => sum + (e.income || 0), 0);
    const totalExpense = filteredEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
    const totalDeductible = filteredEntries.reduce((sum, e) => sum + (e.deductible_expense || 0), 0);
    
    return {
      income: totalIncome,
      expense: totalExpense,
      deductible: totalDeductible,
      profit: totalIncome - totalExpense,
      taxBase: settings?.tax_system === 'usn_income_expense' 
        ? totalIncome - totalDeductible 
        : totalIncome,
    };
  }, [filteredEntries, settings?.tax_system]);

  // Расчёт налога
  const taxAmount = useMemo(() => {
    if (!settings) return 0;
    
    const rate = settings.usn_rate || 6;
    let tax = Math.round(totals.taxBase * rate / 100);
    
    // Минимальный налог для УСН Доходы-Расходы
    if (settings.tax_system === 'usn_income_expense') {
      const minTax = Math.round(totals.income * (settings.usn_min_tax_rate || 1) / 100);
      if (tax < minTax) {
        tax = minTax;
      }
    }
    
    return tax;
  }, [totals, settings]);

  // Итоги по кварталам
  const quarterlyTotals = useMemo(() => {
    const quarters = [1, 2, 3, 4].map(q => {
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 2;
      
      const quarterEntries = entries.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        const month = entryDate.getMonth();
        return month >= startMonth && month <= endMonth;
      });
      
      const income = quarterEntries.reduce((sum, e) => sum + (e.income || 0), 0);
      const expense = quarterEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
      
      return {
        quarter: q,
        income,
        expense,
        profit: income - expense,
      };
    });
    
    return quarters;
  }, [entries]);

  const taxSystemInfo = settings ? TAX_SYSTEMS[settings.tax_system] : null;

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Книга учёта доходов и расходов
            </h1>
            <p className="text-muted-foreground">
              {year} год • {taxSystemInfo?.name || 'Не настроено'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить запись
          </Button>
        </div>
      </div>

      {/* Итоги по кварталам */}
      <div className="grid gap-4 md:grid-cols-4">
        {quarterlyTotals.map(qt => (
          <Card key={qt.quarter} className={selectedQuarter === String(qt.quarter) ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getQuarterName(qt.quarter)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Доходы:</span>
                  <span className="font-medium">{formatMoney(qt.income)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Расходы:</span>
                  <span className="font-medium">{formatMoney(qt.expense)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t">
                  <span>Прибыль:</span>
                  <span className={`font-bold ${qt.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(qt.profit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Итоговая статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего доходов</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего расходов</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totals.expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Налоговая база</CardTitle>
            <Calculator className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(totals.taxBase)}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings?.tax_system === 'usn_income_expense' 
                ? 'Доходы − Расходы'
                : 'Все доходы'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Налог к уплате</CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatMoney(taxAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings?.usn_rate || 6}% от базы
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Весь год</SelectItem>
                <SelectItem value="1">I квартал</SelectItem>
                <SelectItem value="2">II квартал</SelectItem>
                <SelectItem value="3">III квартал</SelectItem>
                <SelectItem value="4">IV квартал</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица записей */}
      <Card>
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Записей нет</h3>
              <p className="text-muted-foreground mb-4">
                Записи появятся автоматически при создании документов
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить запись вручную
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>Описание операции</TableHead>
                  <TableHead className="text-right">Доход</TableHead>
                  <TableHead className="text-right">Расход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.entry_number}</TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell>
                      {entry.primary_document_type && entry.primary_document_number ? (
                        <span className="text-sm">
                          {entry.primary_document_type} №{entry.primary_document_number}
                          {entry.primary_document_date && (
                            <span className="text-muted-foreground ml-1">
                              от {formatDate(entry.primary_document_date)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">
                      {entry.income > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatMoney(entry.income)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.expense > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatMoney(entry.expense)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Итого */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4} className="text-right">
                    Итого за период:
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatMoney(totals.income)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatMoney(totals.expense)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
