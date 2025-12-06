"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Debt, CLAIM_STAGE_LABELS } from "@/types/debt";
import { debtFormSchema, DebtFormSchema } from "@/lib/validation/debt";
import { useEffect, useState } from "react";
import { getTenders } from "@/lib/debts/service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DebtFormSchema) => Promise<void>;
  initialData?: Debt | null;
}

export function ClaimFormModal({ isOpen, onClose, onSubmit, initialData }: ClaimFormModalProps) {
  const [tenders, setTenders] = useState<Array<{ id: string; number: string; title: string }>>([]);
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      type: 'owed' as const, // По умолчанию "Мне должны" для претензий
      currency: 'RUB', // Всегда RUB по умолчанию
      stage: 'new' as const,
    }
  });

  const type = watch('type');

  useEffect(() => {
    if (isOpen) {
      // Загружаем список тендеров
      getTenders().then(setTenders).catch(console.error);
      
      if (initialData) {
        setValue('type', initialData.type);
        setValue('creditor_debtor_name', initialData.creditor_debtor_name);
        setValue('amount', initialData.amount / 100);
        setValue('currency', initialData.currency);
        setValue('date_created', initialData.date_created.split('T')[0]);
        setValue('date_due', initialData.date_due ? initialData.date_due.split('T')[0] : undefined);
        setValue('description', initialData.description || undefined);
        setValue('tender_id', initialData.tender_id || undefined);
        setValue('application_number', initialData.application_number || undefined);
        setValue('contract_number', initialData.contract_number || undefined);
        setValue('stage', initialData.stage);
        setValue('plaintiff', initialData.plaintiff || undefined);
        setValue('defendant', initialData.defendant || undefined);
        setValue('comments', initialData.comments || undefined);
      } else {
        reset({
          type: 'owed',
          currency: 'RUB', // Всегда RUB
          stage: 'new',
          amount: undefined,
          date_created: new Date().toISOString().split('T')[0],
          creditor_debtor_name: '',
          description: '',
          tender_id: undefined,
          application_number: undefined,
          contract_number: undefined,
          plaintiff: undefined,
          defendant: undefined,
          comments: undefined,
        });
      }
    }
  }, [initialData, reset, setValue, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initialData ? 'Редактировать претензию' : 'Добавить претензию'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <RadioGroup value={type} onValueChange={(v) => setValue('type', v as 'owe' | 'owed')} className="flex gap-4"><div className="flex items-center gap-2"><RadioGroupItem value="owe" id="owe" /><Label htmlFor="owe">Мы должны</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="owed" id="owed" /><Label htmlFor="owed">Нам должны</Label></div></RadioGroup>
          </div>

          <div className="space-y-2"><Label>Тендер</Label><Select onValueChange={(v) => setValue('tender_id', v || undefined)}><SelectTrigger><SelectValue placeholder="Выберите тендер" /></SelectTrigger><SelectContent>{tenders.map(t => (<SelectItem key={t.id} value={t.id}>{t.number} - {t.title}</SelectItem>))}</SelectContent></Select></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>№ Заявки</Label><Input {...register('application_number')} placeholder="Номер заявки" /></div>
            <div className="space-y-2"><Label>№ Договора</Label><Input {...register('contract_number')} placeholder="Номер договора" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Истец</Label><Input {...register('plaintiff')} placeholder={type === 'owed' ? 'Наша организация' : 'Заказчик'} />{type === 'owed' && <p className="text-xs text-muted-foreground">Истец наша организация</p>}</div>
            <div className="space-y-2"><Label>Ответчик</Label><Input {...register('defendant')} placeholder={type === 'owed' ? 'Заказчик (должник)' : 'Наша организация'} />{type === 'owe' && <p className="text-xs text-muted-foreground">Ответчик наша организация</p>}</div>
          </div>

          <div className="space-y-2"><Label>{type === 'owe' ? 'Кому мы должны' : 'Кто нам должен'}</Label><Input {...register('creditor_debtor_name')} placeholder="Название организации" />{errors.creditor_debtor_name && <p className="text-xs text-destructive">{errors.creditor_debtor_name.message}</p>}</div>

          <div className="space-y-2"><Label>Основной долг (₽)</Label><Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} placeholder="0.00" />{errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}<input type="hidden" {...register('currency')} value="RUB" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Дата возникновения</Label><Input type="date" {...register('date_created')} />{errors.date_created && <p className="text-xs text-destructive">{errors.date_created.message}</p>}</div>
            <div className="space-y-2"><Label>Срок возврата</Label><Input type="date" {...register('date_due')} /></div>
          </div>

          <div className="space-y-2"><Label>Этап взыскания</Label><Select defaultValue="new" onValueChange={(v) => setValue('stage', v as 'new' | 'claim' | 'court' | 'writ' | 'bailiff' | 'paid')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CLAIM_STAGE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent></Select></div>

          <div className="space-y-2"><Label>Описание</Label><Textarea {...register('description')} rows={2} placeholder="Детали долга..." /></div>

          <div className="space-y-2"><Label>Комментарии</Label><Textarea {...register('comments')} rows={3} placeholder="Комментарии по претензии..." /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{isSubmitting ? 'Сохранение...' : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
