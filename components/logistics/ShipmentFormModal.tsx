"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shipmentFormSchema, type ShipmentFormInput } from "@/lib/logistics/validation";
import { SHIPMENT_TYPE_LABELS, Driver } from "@/types/logistics";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Package } from "lucide-react";

interface ShipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShipmentFormInput) => Promise<void>;
  isSubmitting: boolean;
}

export function ShipmentFormModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting 
}: ShipmentFormModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShipmentFormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(shipmentFormSchema) as any,
    defaultValues: {
      type: 'standard',
      currency: 'RUB',
      sender_country: 'Россия',
      recipient_country: 'Россия',
      cost_amount: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Загружаем список водителей через API
      fetch('/api/logistics/drivers')
        .then(res => res.json())
        .then(setDrivers)
        .catch(console.error);
      reset();
    }
  }, [isOpen, reset]);

  const handleFormSubmit: SubmitHandler<ShipmentFormInput> = async (data) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ошибка при создании отправки');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Новая отправка</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Тип отправки */}
          <div className="space-y-2"><h4 className="font-medium text-sm">Тип доставки</h4>
            <RadioGroup defaultValue="standard" onValueChange={(v) => register('type').onChange({ target: { value: v } })} className="flex flex-wrap gap-3">
              {Object.entries(SHIPMENT_TYPE_LABELS).map(([type, label]) => <label key={type} className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value={type} {...register('type')} /><span className="text-sm">{label}</span></label>)}
            </RadioGroup>
          </div>

          {/* Отправитель */}
          <div className="space-y-3 border-t pt-3"><h4 className="font-medium text-sm">📤 Отправитель</h4>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Имя / Организация *</Label><Input {...register('sender_name')} />{errors.sender_name && <span className="text-xs text-destructive">{errors.sender_name.message}</span>}</div><div className="space-y-1"><Label>Компания</Label><Input {...register('sender_company')} placeholder="ООО 'Компания'" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Телефон</Label><Input {...register('sender_phone')} type="tel" placeholder="+7 (999) 123-45-67" /></div><div className="space-y-1"><Label>Email</Label><Input {...register('sender_email')} type="email" /></div></div>
            <div className="space-y-1"><Label>Улица, дом *</Label><Input {...register('sender_street')} placeholder="ул. Ленина, д. 1" />{errors.sender_street && <span className="text-xs text-destructive">{errors.sender_street.message}</span>}</div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-1"><Label>Город *</Label><Input {...register('sender_city')} placeholder="Москва" />{errors.sender_city && <span className="text-xs text-destructive">{errors.sender_city.message}</span>}</div><div className="space-y-1"><Label>Регион</Label><Input {...register('sender_region')} /></div><div className="space-y-1"><Label>Индекс</Label><Input {...register('sender_postal_code')} /></div></div>
          </div>

          {/* Получатель */}
          <div className="space-y-3 border-t pt-3"><h4 className="font-medium text-sm">📥 Получатель</h4>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Имя / Организация *</Label><Input {...register('recipient_name')} />{errors.recipient_name && <span className="text-xs text-destructive">{errors.recipient_name.message}</span>}</div><div className="space-y-1"><Label>Компания</Label><Input {...register('recipient_company')} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Телефон</Label><Input {...register('recipient_phone')} type="tel" /></div><div className="space-y-1"><Label>Email</Label><Input {...register('recipient_email')} type="email" /></div></div>
            <div className="space-y-1"><Label>Улица, дом *</Label><Input {...register('recipient_street')} />{errors.recipient_street && <span className="text-xs text-destructive">{errors.recipient_street.message}</span>}</div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-1"><Label>Город *</Label><Input {...register('recipient_city')} />{errors.recipient_city && <span className="text-xs text-destructive">{errors.recipient_city.message}</span>}</div><div className="space-y-1"><Label>Регион</Label><Input {...register('recipient_region')} /></div><div className="space-y-1"><Label>Индекс</Label><Input {...register('recipient_postal_code')} /></div></div>
          </div>

          {/* Груз */}
          <div className="space-y-3 border-t pt-3"><h4 className="font-medium text-sm">📦 Груз</h4>
            <div className="space-y-1"><Label>Описание *</Label><Textarea {...register('description')} rows={2} placeholder="Документы, оборудование..." />{errors.description && <span className="text-xs text-destructive">{errors.description.message}</span>}</div>
            <div className="grid grid-cols-4 gap-3"><div className="space-y-1"><Label>Вес (кг)</Label><Input {...register('weight_kg', { valueAsNumber: true })} type="number" step="0.1" /></div><div className="space-y-1"><Label>Длина (см)</Label><Input {...register('length_cm', { valueAsNumber: true })} type="number" /></div><div className="space-y-1"><Label>Ширина (см)</Label><Input {...register('width_cm', { valueAsNumber: true })} type="number" /></div><div className="space-y-1"><Label>Высота (см)</Label><Input {...register('height_cm', { valueAsNumber: true })} type="number" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Объявл. стоимость (₽)</Label><Input {...register('value_amount', { valueAsNumber: true })} type="number" step="0.01" /></div><div className="space-y-1"><Label>Стоимость доставки (₽) *</Label><Input {...register('cost_amount', { valueAsNumber: true })} type="number" step="0.01" />{errors.cost_amount && <span className="text-xs text-destructive">{errors.cost_amount.message}</span>}</div></div>
          </div>

          {/* Даты */}
          <div className="space-y-3 border-t pt-3"><h4 className="font-medium text-sm">📅 Сроки</h4>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Дата забора</Label><Input {...register('pickup_date')} type="date" /></div><div className="space-y-1"><Label>Доставка до</Label><Input {...register('estimated_delivery')} type="date" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Водитель</Label><Select onValueChange={(v) => register('driver_id').onChange({ target: { value: v } })}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Курьерская служба</Label><Input {...register('courier_company')} placeholder="СДЭК, Почта России..." /></div></div>
          </div>

          {/* Дополнительно */}
          <div className="space-y-3 border-t pt-3"><h4 className="font-medium text-sm">📝 Дополнительно</h4>
            <div className="space-y-1"><Label>Особые указания</Label><Textarea {...register('special_instructions')} rows={2} placeholder="Хрупкое, осторожно..." /></div>
            <div className="space-y-1"><Label>Заметки</Label><Textarea {...register('notes')} rows={2} /></div>
          </div>

          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создаём...</> : 'Создать отправку'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
