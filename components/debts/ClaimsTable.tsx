"use client";

import { Debt, CLAIM_STAGE_LABELS, ClaimStage } from "@/types/debt";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDebt, deleteDebt } from "@/lib/debts/service";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, X, Eye, Trash2, Gavel, User } from "lucide-react";

interface ClaimsTableProps {
  initialDebts: Debt[];
}

export function ClaimsTable({ initialDebts }: ClaimsTableProps) {
  const router = useRouter();
  const [debts, setDebts] = useState(initialDebts);
  const [filter, setFilter] = useState<ClaimStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [plaintiffFilter, setPlaintiffFilter] = useState('');
  const [defendantFilter, setDefendantFilter] = useState('');

  useEffect(() => {
    setDebts(initialDebts);
  }, [initialDebts]);

  const filteredDebts = debts.filter(debt => {
    // Фильтр по этапу
    if (filter !== 'all' && debt.stage !== filter) return false;
    
    // Фильтр по истцу
    if (plaintiffFilter && !debt.plaintiff?.toLowerCase().includes(plaintiffFilter.toLowerCase())) {
      return false;
    }
    
    // Фильтр по ответчику
    if (defendantFilter && !debt.defendant?.toLowerCase().includes(defendantFilter.toLowerCase())) {
      return false;
    }
    
    // Поиск по всем текстовым полям
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        debt.creditor_debtor_name?.toLowerCase().includes(query) ||
        debt.application_number?.toLowerCase().includes(query) ||
        debt.contract_number?.toLowerCase().includes(query) ||
        debt.plaintiff?.toLowerCase().includes(query) ||
        debt.defendant?.toLowerCase().includes(query) ||
        debt.comments?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту претензию?')) return;
    try {
      await deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handleStageChange = async (debt: Debt, newStage: ClaimStage) => {
    try {
      const updated = await updateDebt(debt.id, { stage: newStage });
      setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при изменении этапа');
    }
  };

  // Подсчёт количества претензий по этапам
  const stageCounts = debts.reduce((acc, debt) => {
    acc[debt.stage] = (acc[debt.stage] || 0) + 1;
    return acc;
  }, {} as Record<ClaimStage, number>);

  const stages: (ClaimStage | 'all')[] = ['all', 'new', 'claim', 'court', 'writ', 'bailiff', 'paid'];
  const stageLabelsMap: Record<ClaimStage | 'all', string> = { all: 'Все', ...CLAIM_STAGE_LABELS };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (<Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>{stageLabelsMap[s]}{s === 'all' ? (debts.length > 0 && <Badge variant="secondary" className="ml-2">{debts.length}</Badge>) : (stageCounts[s] > 0 && <Badge variant="secondary" className="ml-2">{stageCounts[s]}</Badge>)}</Button>))}
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />{showFilters ? 'Скрыть' : 'Фильтры'}</Button>
        </div>

        {showFilters && (
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-2"><div className="flex items-center gap-2 text-sm"><Gavel className="h-4 w-4" />Истец</div><Input placeholder="Фильтр по истцу..." value={plaintiffFilter} onChange={(e) => setPlaintiffFilter(e.target.value)} /></div>
            <div className="flex-1 space-y-2"><div className="flex items-center gap-2 text-sm"><User className="h-4 w-4" />Ответчик</div><Input placeholder="Фильтр по ответчику..." value={defendantFilter} onChange={(e) => setDefendantFilter(e.target.value)} /></div>
            {(plaintiffFilter || defendantFilter) && <Button variant="ghost" size="sm" onClick={() => { setPlaintiffFilter(''); setDefendantFilter(''); }}><X className="h-4 w-4 mr-1" />Очистить</Button>}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>№ Тендера</TableHead><TableHead>№ Заявки</TableHead><TableHead>Истец</TableHead><TableHead>Ответчик</TableHead><TableHead>Долг</TableHead><TableHead>№ Договора</TableHead><TableHead>Этап</TableHead><TableHead>Комментарии</TableHead><TableHead>Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredDebts.length === 0 ? (<TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{searchQuery ? 'Ничего не найдено' : 'Нет претензий'}</TableCell></TableRow>) : (
                filteredDebts.map((debt, index) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{debt.tender?.purchase_number || '—'}</TableCell>
                    <TableCell>{debt.application_number || '—'}</TableCell>
                    <TableCell>{debt.plaintiff || '—'}</TableCell>
                    <TableCell className="font-medium">{debt.defendant || debt.creditor_debtor_name}</TableCell>
                    <TableCell className="font-bold">{formatMoney(debt.amount, debt.currency)}</TableCell>
                    <TableCell>{debt.contract_number || '—'}</TableCell>
                    <TableCell><Select value={debt.stage} onValueChange={(v) => handleStageChange(debt, v as ClaimStage)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CLAIM_STAGE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent></Select></TableCell>
                    <TableCell className="max-w-[150px] truncate" title={debt.comments || ''}>{debt.comments || '—'}</TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => router.push(`/tenders/claims/${debt.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(debt.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
          <span>Показано: {filteredDebts.length} из {debts.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}
