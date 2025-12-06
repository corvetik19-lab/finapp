'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';

interface Payout {
  id: string;
  date: string;
  recipient: string;
  category: 'supplier' | 'employee' | 'tax' | 'other';
  amount: number;
  contract: string | null;
  status: 'paid' | 'pending' | 'scheduled';
}

export default function PayoutsReportPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    loadPayouts();
  }, [filter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      // Симуляция данных
      const mockData: Payout[] = [
        { id: '1', date: '2024-11-05', recipient: 'ООО "Поставщик 1"', category: 'supplier', amount: 5000000, contract: '№123-2024', status: 'paid' },
        { id: '2', date: '2024-11-10', recipient: 'Иванов И.И.', category: 'employee', amount: 150000, contract: null, status: 'paid' },
        { id: '3', date: '2024-11-15', recipient: 'ФНС России', category: 'tax', amount: 800000, contract: null, status: 'pending' },
        { id: '4', date: '2024-11-12', recipient: 'ООО "Поставщик 2"', category: 'supplier', amount: 3500000, contract: '№456-2024', status: 'paid' },
        { id: '5', date: '2024-11-20', recipient: 'Петров П.П.', category: 'employee', amount: 180000, contract: null, status: 'scheduled' },
        { id: '6', date: '2024-11-08', recipient: 'Аренда офиса', category: 'other', amount: 250000, contract: null, status: 'paid' },
        { id: '7', date: '2024-11-18', recipient: 'ООО "Поставщик 3"', category: 'supplier', amount: 2000000, contract: '№789-2024', status: 'pending' },
      ];
      setPayouts(mockData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      supplier: 'Поставщик',
      employee: 'Сотрудник',
      tax: 'Налоги',
      other: 'Прочее',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      paid: 'Выплачено',
      pending: 'Ожидает',
      scheduled: 'Запланировано',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const filteredPayouts = payouts.filter(p => {
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'pending') return p.status === 'pending' || p.status === 'scheduled';
    return true;
  });

  const stats = {
    total: payouts.reduce((sum, p) => sum + p.amount, 0),
    paid: payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pending: payouts.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0),
    byCategory: {
      supplier: payouts.filter(p => p.category === 'supplier').reduce((sum, p) => sum + p.amount, 0),
      employee: payouts.filter(p => p.category === 'employee').reduce((sum, p) => sum + p.amount, 0),
      tax: payouts.filter(p => p.category === 'tax').reduce((sum, p) => sum + p.amount, 0),
      other: payouts.filter(p => p.category === 'other').reduce((sum, p) => sum + p.amount, 0),
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">💸 Расходы</h1><p className="text-muted-foreground">Выплаты поставщикам, сотрудникам и прочие</p></div>
        <Button><Download className="h-4 w-4 mr-1" />Экспорт</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Всего выплат</p><p className="text-2xl font-bold">{formatCurrency(stats.total)}</p><p className="text-xs text-muted-foreground">{payouts.length} операций</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Выплачено</p><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p><p className="text-xs text-muted-foreground">{((stats.paid / stats.total) * 100).toFixed(1)}% от общей</p></CardContent></Card>
        <Card className="border-l-4 border-l-yellow-500"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Ожидает</p><p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending)}</p><p className="text-xs text-muted-foreground">Требует обработки</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Распределение по категориям</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"><div><p className="font-medium text-sm">Поставщики</p><p className="text-xs text-muted-foreground">{payouts.filter(p => p.category === 'supplier').length} выплат</p></div><span className="text-lg font-bold text-blue-600">{formatCurrency(stats.byCategory.supplier)}</span></div>
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg"><div><p className="font-medium text-sm">Сотрудники</p><p className="text-xs text-muted-foreground">{payouts.filter(p => p.category === 'employee').length} выплат</p></div><span className="text-lg font-bold text-green-600">{formatCurrency(stats.byCategory.employee)}</span></div>
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"><div><p className="font-medium text-sm">Налоги</p><p className="text-xs text-muted-foreground">{payouts.filter(p => p.category === 'tax').length} выплат</p></div><span className="text-lg font-bold text-purple-600">{formatCurrency(stats.byCategory.tax)}</span></div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium text-sm">Прочее</p><p className="text-xs text-muted-foreground">{payouts.filter(p => p.category === 'other').length} выплат</p></div><span className="text-lg font-bold text-gray-600">{formatCurrency(stats.byCategory.other)}</span></div>
      </div></CardContent></Card>

      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Все ({payouts.length})</Button>
        <Button variant={filter === 'paid' ? 'default' : 'outline'} onClick={() => setFilter('paid')}>Выплачено ({payouts.filter(p => p.status === 'paid').length})</Button>
        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Ожидает ({payouts.filter(p => p.status !== 'paid').length})</Button>
      </div>

      <Card><CardHeader><CardTitle>Список выплат</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Получатель</TableHead><TableHead className="text-center">Категория</TableHead><TableHead className="text-right">Сумма</TableHead><TableHead>Контракт</TableHead><TableHead className="text-center">Статус</TableHead></TableRow></TableHeader>
          <TableBody>{filteredPayouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell>{formatDate(payout.date)}</TableCell>
              <TableCell className="font-semibold">{payout.recipient}</TableCell>
              <TableCell className="text-center"><Badge variant={payout.category === 'supplier' ? 'default' : payout.category === 'employee' ? 'secondary' : 'outline'}>{getCategoryLabel(payout.category)}</Badge></TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(payout.amount)}</TableCell>
              <TableCell>{payout.contract || '—'}</TableCell>
              <TableCell className="text-center"><Badge variant={payout.status === 'paid' ? 'default' : payout.status === 'pending' ? 'secondary' : 'outline'}>{getStatusLabel(payout.status)}</Badge></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-500"><CardHeader><CardTitle className="text-green-800">Аналитика</CardTitle></CardHeader><CardContent className="text-green-800 text-sm space-y-2">
        <p>Всего выплат: {formatCurrency(stats.total)} за период</p>
        <p>Выплачено {((stats.paid / stats.total) * 100).toFixed(1)}% от запланированного</p>
        <p>Основная категория расходов: Поставщики ({formatCurrency(stats.byCategory.supplier)})</p>
        <p>Ожидает выплаты: {formatCurrency(stats.pending)}</p>
        <p>Средняя выплата: {formatCurrency(stats.total / payouts.length)}</p>
      </CardContent></Card>
    </div>
  );
}
