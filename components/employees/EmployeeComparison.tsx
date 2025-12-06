'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";

interface EmployeeStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  total_tenders: number;
  won_tenders: number;
  success_rate: number;
  total_nmck: number;
}

interface EmployeeComparisonProps {
  employeeId: string;
  companyId: string;
}

export function EmployeeComparison({ employeeId, companyId }: EmployeeComparisonProps) {
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComparison = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/comparison?companyId=${companyId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        console.error('Error loading comparison:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [companyId]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка сравнения...</div>;
  if (error) return <div className="text-center py-8 text-destructive"><span>❌</span> {error}</div>;
  if (employees.length === 0) return <div className="text-center py-8"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Нет данных</p></div>;

  const maxTenders = Math.max(...employees.map(e => e.total_tenders), 1);

  return (
    <div className="border rounded-lg overflow-hidden"><Table><TableHeader><TableRow><TableHead>Сотрудник</TableHead><TableHead>Тендеров</TableHead><TableHead>Выиграно</TableHead><TableHead>Успешность</TableHead><TableHead>НМЦК</TableHead></TableRow></TableHeader>
      <TableBody>{employees.map((emp, idx) => <TableRow key={emp.id} className={emp.id === employeeId ? 'bg-blue-50' : ''}><TableCell><div className="flex items-center gap-2"><span className="text-muted-foreground">#{idx + 1}</span><div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">{emp.avatar_url ? <Image src={emp.avatar_url} alt="" fill className="rounded-full object-cover" /> : getInitials(emp.full_name)}</div><span className="font-medium">{emp.full_name}</span>{emp.id === employeeId && <Badge variant="secondary">Вы</Badge>}</div></TableCell><TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(emp.total_tenders / maxTenders) * 100}%` }} /></div><span className="text-sm">{emp.total_tenders}</span></div></TableCell><TableCell className="text-green-600 font-medium">{emp.won_tenders}</TableCell><TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full" style={{ width: `${emp.success_rate}%`, background: emp.success_rate >= 50 ? '#22c55e' : emp.success_rate >= 30 ? '#f59e0b' : '#ef4444' }} /></div><span className="text-sm">{emp.success_rate.toFixed(0)}%</span></div></TableCell><TableCell className="text-sm">{formatMoney(emp.total_nmck)}</TableCell></TableRow>)}</TableBody>
    </Table></div>
  );
}
