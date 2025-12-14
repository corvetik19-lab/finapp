"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
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
  FormDescription,
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
import { Loader2, CreditCard, Building2, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/accounting/types";
import {
  PaymentOrder,
  BankAccount,
  PAYMENT_ORDER_PRIORITIES,
} from "@/lib/accounting/bank-types";
import { AccountingCounterparty } from "@/lib/accounting/types";

const paymentOrderSchema = z.object({
  from_account_id: z.string().min(1, "Выберите счёт списания"),
  recipient_name: z.string().min(1, "Введите наименование получателя"),
  recipient_inn: z.string().min(10, "Введите ИНН получателя (10-12 цифр)").max(12),
  recipient_kpp: z.string().optional(),
  recipient_account: z.string().length(20, "Номер счёта должен содержать 20 цифр"),
  recipient_bank_name: z.string().min(1, "Введите название банка получателя"),
  recipient_bank_bik: z.string().length(9, "БИК должен содержать 9 цифр"),
  recipient_bank_corr_account: z.string().optional(),
  amount: z.number().min(0.01, "Укажите сумму"),
  purpose: z.string().min(1, "Укажите назначение платежа"),
  priority: z.string().optional(),
  payment_date: z.string().optional(),
  vat_type: z.string().optional(),
  vat_amount: z.number().optional(),
});

type PaymentOrderFormInput = z.input<typeof paymentOrderSchema>;

interface PaymentOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentOrder?: PaymentOrder | null;
  accounts: BankAccount[];
  counterparties: AccountingCounterparty[];
  onSubmit: (data: PaymentOrderFormInput) => Promise<void>;
}

export function PaymentOrderForm({
  open,
  onOpenChange,
  paymentOrder,
  accounts,
  counterparties,
  onSubmit,
}: PaymentOrderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form: UseFormReturn<PaymentOrderFormInput> = useForm<PaymentOrderFormInput>({
    resolver: zodResolver(paymentOrderSchema),
    defaultValues: {
      from_account_id: "",
      recipient_name: paymentOrder?.recipient_name ?? "",
      recipient_inn: paymentOrder?.recipient_inn ?? "",
      recipient_kpp: paymentOrder?.recipient_kpp ?? "",
      recipient_account: paymentOrder?.recipient_account ?? "",
      recipient_bank_name: paymentOrder?.recipient_bank_name ?? "",
      recipient_bank_bik: paymentOrder?.recipient_bank_bik ?? "",
      recipient_bank_corr_account: paymentOrder?.recipient_bank_corr_account ?? "",
      amount: paymentOrder?.amount ?? 0,
      purpose: paymentOrder?.purpose ?? "",
      priority: "5",
      payment_date: new Date().toISOString().split('T')[0],
      vat_type: paymentOrder?.vat_type ?? "no_vat",
      vat_amount: paymentOrder?.vat_amount ?? 0,
    },
  });

  const handleSubmit = async (data: PaymentOrderFormInput) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving payment order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fillFromCounterparty = (counterpartyId: string) => {
    const cp = counterparties.find(c => c.id === counterpartyId);
    if (cp) {
      form.setValue("recipient_name", cp.name);
      form.setValue("recipient_inn", cp.inn || "");
      form.setValue("recipient_kpp", cp.kpp || "");
      if (cp.bank_account) form.setValue("recipient_account", cp.bank_account);
      if (cp.bank_name) form.setValue("recipient_bank_name", cp.bank_name);
      if (cp.bank_bik) form.setValue("recipient_bank_bik", cp.bank_bik);
      if (cp.bank_corr_account) form.setValue("recipient_bank_corr_account", cp.bank_corr_account);
    }
  };

  const selectedAccountId = form.watch("from_account_id");
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const amount = form.watch("amount");
  const vatType = form.watch("vat_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {paymentOrder ? "Редактировать платёжное поручение" : "Создать платёжное поручение"}
          </DialogTitle>
          <DialogDescription>
            Заполните реквизиты для создания платёжного поручения
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Счёт списания */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Счёт списания
              </h4>
              
              <FormField
                control={form.control}
                name="from_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Расчётный счёт</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите счёт" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.filter(a => a.status === 'active').map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{account.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {account.account_number}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedAccount && (
                <div className="text-sm text-muted-foreground">
                  <div>Банк: {selectedAccount.bank_name}</div>
                  <div>Баланс: <span className="font-medium text-foreground">{formatMoney(selectedAccount.balance)}</span></div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* Получатель */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Получатель
                </h4>
                <Select onValueChange={fillFromCounterparty}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Из контрагентов..." />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipient_name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Наименование</FormLabel>
                      <FormControl>
                        <Input placeholder="ООО «Компания»" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_inn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ИНН</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" maxLength={12} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_kpp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>КПП</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789" maxLength={9} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Расчётный счёт</FormLabel>
                      <FormControl>
                        <Input placeholder="40702810XXXXXXXXXXXX" maxLength={20} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_bank_bik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>БИК банка</FormLabel>
                      <FormControl>
                        <Input placeholder="044525225" maxLength={9} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient_bank_name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Банк получателя</FormLabel>
                      <FormControl>
                        <Input placeholder="ПАО Сбербанк" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Сумма и назначение */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vat_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>НДС</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no_vat">Без НДС</SelectItem>
                        <SelectItem value="vat_included">В т.ч. НДС 20%</SelectItem>
                        <SelectItem value="vat_10_included">В т.ч. НДС 10%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {vatType !== "no_vat" && amount > 0 && (
              <div className="text-sm text-muted-foreground">
                В т.ч. НДС: {formatMoney(vatType === "vat_included" ? amount * 20 / 120 : amount * 10 / 110)}
              </div>
            )}

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Назначение платежа</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Оплата по счёту № ... от ... за ..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Укажите основание платежа, номер и дату документа
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата платежа</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Очерёдность</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_ORDER_PRIORITIES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {value} - {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Итого */}
            {amount > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">К оплате:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatMoney(amount)}
                  </span>
                </div>
              </div>
            )}

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
                {paymentOrder ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
