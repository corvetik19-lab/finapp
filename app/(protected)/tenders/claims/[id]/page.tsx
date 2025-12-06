import { notFound } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/server";
import { Debt, CLAIM_STAGE_LABELS } from "@/types/debt";
import { formatMoney } from "@/lib/utils/format";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ClaimDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getClaim(id: string): Promise<Debt | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('debts')
    .select(`
      *,
      tender:tenders(purchase_number, customer)
    `)
    .eq('id', id)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data;
}

export default async function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const { id } = await params;
  const claim = await getClaim(id);
  
  if (!claim) {
    notFound();
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <Link href="/tenders/claims"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" />Назад к претензиям</Button></Link>
        <div className="flex items-center gap-4"><h1 className="text-2xl font-bold">Детали претензии</h1><Badge>{CLAIM_STAGE_LABELS[claim.stage]}</Badge></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardHeader><CardTitle>📋 Основная информация</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Тип</p><p className="font-medium">{claim.type === 'owe' ? 'Мы должны' : 'Нам должны'}</p></div>
            <div><p className="text-sm text-muted-foreground">Должник/Кредитор</p><p className="font-medium">{claim.creditor_debtor_name}</p></div>
            <div><p className="text-sm text-muted-foreground">Сумма долга</p><p className="font-medium text-lg">{formatMoney(claim.amount, claim.currency)}</p></div>
            <div><p className="text-sm text-muted-foreground">Валюта</p><p className="font-medium">{claim.currency}</p></div>
          </div></CardContent></Card>

          <Card><CardHeader><CardTitle>📅 Даты</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Дата возникновения</p><p className="font-medium">{new Date(claim.date_created).toLocaleDateString('ru-RU')}</p></div>
            <div><p className="text-sm text-muted-foreground">Срок возврата</p><p className="font-medium">{claim.date_due ? new Date(claim.date_due).toLocaleDateString('ru-RU') : 'Не указан'}</p></div>
            <div><p className="text-sm text-muted-foreground">Создано</p><p className="font-medium">{new Date(claim.created_at).toLocaleString('ru-RU')}</p></div>
            <div><p className="text-sm text-muted-foreground">Обновлено</p><p className="font-medium">{new Date(claim.updated_at).toLocaleString('ru-RU')}</p></div>
          </div></CardContent></Card>

          {(claim.tender_id || claim.application_number || claim.contract_number) && <Card><CardHeader><CardTitle>🏢 Данные тендера</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">
            {claim.tender_id && claim.tender && <><div><p className="text-sm text-muted-foreground">Номер тендера</p><p className="font-medium">{claim.tender.purchase_number}</p></div><div><p className="text-sm text-muted-foreground">Заказчик</p><p className="font-medium">{claim.tender.customer}</p></div></>}
            {claim.application_number && <div><p className="text-sm text-muted-foreground">№ Заявки</p><p className="font-medium">{claim.application_number}</p></div>}
            {claim.contract_number && <div><p className="text-sm text-muted-foreground">№ Договора</p><p className="font-medium">{claim.contract_number}</p></div>}
          </div></CardContent></Card>}

          {(claim.plaintiff || claim.defendant) && <Card><CardHeader><CardTitle>⚖️ Участники</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4">
            {claim.plaintiff && <div><p className="text-sm text-muted-foreground">Истец</p><p className="font-medium">{claim.plaintiff}</p></div>}
            {claim.defendant && <div><p className="text-sm text-muted-foreground">Ответчик</p><p className="font-medium">{claim.defendant}</p></div>}
          </div></CardContent></Card>}
        </div>

        <div className="space-y-4">
          <Card><CardHeader><CardTitle>💰 Статус платежей</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Сумма долга:</span><span className="font-semibold">{formatMoney(claim.amount, claim.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Оплачено:</span><span className="font-semibold text-green-600">{formatMoney(claim.amount_paid || 0, claim.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Остаток:</span><span className="font-semibold text-red-600">{formatMoney((claim.amount || 0) - (claim.amount_paid || 0), claim.currency)}</span></div>
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min(100, ((claim.amount_paid || 0) / (claim.amount || 1)) * 100)}%` }} /></div>
          </CardContent></Card>
          {claim.description && <Card><CardHeader><CardTitle>📝 Описание</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{claim.description}</p></CardContent></Card>}
          {claim.comments && <Card><CardHeader><CardTitle>💬 Комментарии</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{claim.comments}</p></CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
