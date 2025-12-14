"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  FileText, 
  Plus, 
  Trash2,
} from "lucide-react";
import { formatMoney } from "@/lib/accounting/types";
import {
  AccountingDocument,
  AccountingDocumentItem,
  DOCUMENT_TYPES,
  DocumentType,
  AccountingCounterparty,
} from "@/lib/accounting/types";

const documentItemSchema = z.object({
  name: z.string().min(1, "Введите наименование"),
  quantity: z.number().min(0.001, "Укажите количество"),
  unit: z.string().optional(),
  price: z.number().min(0, "Укажите цену"),
  vat_rate: z.number().optional(),
});

const documentSchema = z.object({
  document_type: z.string().min(1, "Выберите тип документа"),
  document_number: z.string().min(1, "Введите номер документа"),
  document_date: z.string().min(1, "Укажите дату"),
  counterparty_id: z.string().min(1, "Выберите контрагента"),
  description: z.string().optional(),
  items: z.array(documentItemSchema).min(1, "Добавьте хотя бы одну позицию"),
});

type DocumentFormInput = z.input<typeof documentSchema>;

interface DocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: AccountingDocument | null;
  documentItems?: AccountingDocumentItem[];
  counterparties: AccountingCounterparty[];
  onSubmit: (data: DocumentFormInput) => Promise<void>;
}

export function DocumentForm({
  open,
  onOpenChange,
  document,
  documentItems,
  counterparties,
  onSubmit,
}: DocumentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form: UseFormReturn<DocumentFormInput> = useForm<DocumentFormInput>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      document_type: document?.document_type ?? "invoice",
      document_number: document?.document_number ?? "",
      document_date: document?.document_date ?? new Date().toISOString().split('T')[0],
      counterparty_id: document?.counterparty_id ?? "",
      description: "",
      items: documentItems?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit ?? "шт",
        price: 0,
        vat_rate: item.vat_rate ?? 0,
      })) ?? [{ name: "", quantity: 1, unit: "шт", price: 0, vat_rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");

  // Расчёт итогов
  const calculateTotals = () => {
    let subtotal = 0;
    let vatTotal = 0;

    watchItems?.forEach(item => {
      const amount = (item.quantity || 0) * (item.price || 0);
      const vat = amount * (item.vat_rate || 0) / 100;
      subtotal += amount;
      vatTotal += vat;
    });

    return {
      subtotal,
      vatTotal,
      total: subtotal + vatTotal,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (data: DocumentFormInput) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving document:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {document ? "Редактировать документ" : "Создать документ"}
          </DialogTitle>
          <DialogDescription>
            {document 
              ? `Редактирование ${DOCUMENT_TYPES[document.document_type as DocumentType]}`
              : "Заполните данные нового документа"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Основные данные */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип документа</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="counterparty_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Контрагент</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите контрагента" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {counterparties.map((cp) => (
                          <SelectItem key={cp.id} value={cp.id}>
                            {cp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер документа</FormLabel>
                    <FormControl>
                      <Input placeholder="№ 001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительная информация..." 
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Позиции документа */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Позиции документа</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", quantity: 1, unit: "шт", price: 0, vat_rate: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Наименование</th>
                      <th className="text-center p-2 font-medium w-20">Кол-во</th>
                      <th className="text-center p-2 font-medium w-20">Ед.</th>
                      <th className="text-right p-2 font-medium w-28">Цена</th>
                      <th className="text-center p-2 font-medium w-20">НДС %</th>
                      <th className="text-right p-2 font-medium w-28">Сумма</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const item = watchItems?.[index];
                      const amount = (item?.quantity || 0) * (item?.price || 0);
                      const vat = amount * (item?.vat_rate || 0) / 100;
                      
                      return (
                        <tr key={field.id} className="border-t">
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input 
                                      placeholder="Товар/услуга" 
                                      className="h-8"
                                      {...field} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      step="0.001"
                                      className="h-8 text-center"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input 
                                      className="h-8 text-center"
                                      {...field} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      className="h-8 text-right"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.vat_rate`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select 
                                    onValueChange={(v) => field.onChange(parseFloat(v))} 
                                    defaultValue={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="0">Без НДС</SelectItem>
                                      <SelectItem value="10">10%</SelectItem>
                                      <SelectItem value="20">20%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatMoney(amount + vat)}
                          </td>
                          <td className="p-2">
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Итоги */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Сумма без НДС:</span>
                    <span>{formatMoney(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">НДС:</span>
                    <span>{formatMoney(totals.vatTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Итого:</span>
                    <span className="text-primary">{formatMoney(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {document ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
