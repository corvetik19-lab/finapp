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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Landmark } from "lucide-react";
import {
  BankAccount,
  ACCOUNT_TYPES,
  validateAccountNumber,
  validateBik,
} from "@/lib/accounting/bank-types";

const bankAccountSchema = z.object({
  name: z.string().min(1, "Введите название счёта"),
  account_number: z
    .string()
    .min(20, "Номер счёта должен содержать 20 цифр")
    .max(20, "Номер счёта должен содержать 20 цифр")
    .refine(validateAccountNumber, "Некорректный номер счёта"),
  bank_name: z.string().min(1, "Введите название банка"),
  bank_bik: z
    .string()
    .min(9, "БИК должен содержать 9 цифр")
    .max(9, "БИК должен содержать 9 цифр")
    .refine(validateBik, "Некорректный БИК"),
  bank_corr_account: z.string().optional(),
  bank_swift: z.string().optional(),
  account_type: z.string().optional(),
  currency: z.string().optional(),
  is_primary: z.boolean().optional(),
  opened_at: z.string().optional(),
});

export type BankAccountFormInput = z.input<typeof bankAccountSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
  onSubmit: (data: BankAccountFormInput) => Promise<void>;
}

export function BankAccountForm({
  open,
  onOpenChange,
  account,
  onSubmit,
}: BankAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingBank, setIsSearchingBank] = useState(false);
  const router = useRouter();

  const form: UseFormReturn<BankAccountFormInput> = useForm<BankAccountFormInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: account?.name ?? "",
      account_number: account?.account_number ?? "",
      bank_name: account?.bank_name ?? "",
      bank_bik: account?.bank_bik ?? "",
      bank_corr_account: account?.bank_corr_account ?? "",
      bank_swift: account?.bank_swift ?? "",
      account_type: account?.account_type ?? "checking",
      currency: account?.currency ?? "RUB",
      is_primary: account?.is_primary ?? false,
      opened_at: account?.opened_at ?? "",
    },
  });

  const handleSubmit = async (data: BankAccountFormInput) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving bank account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchBankByBik = async (bik: string) => {
    if (bik.length !== 9) return;
    
    setIsSearchingBank(true);
    try {
      // Здесь можно добавить интеграцию с DaData или другим сервисом
      // Пока используем базовые данные
      const bankData = getBankByBik(bik);
      if (bankData) {
        form.setValue("bank_name", bankData.name);
        form.setValue("bank_corr_account", bankData.corrAccount);
      }
    } finally {
      setIsSearchingBank(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            {account ? "Редактировать счёт" : "Добавить расчётный счёт"}
          </DialogTitle>
          <DialogDescription>
            Укажите реквизиты банковского счёта организации
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название счёта</FormLabel>
                  <FormControl>
                    <Input placeholder="Основной расчётный счёт" {...field} />
                  </FormControl>
                  <FormDescription>
                    Внутреннее название для удобства
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер счёта</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="40702810XXXXXXXXXXXX" 
                        maxLength={20}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип счёта</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="bank_bik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>БИК банка</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="044525225" 
                          maxLength={9}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (e.target.value.length === 9) {
                              searchBankByBik(e.target.value);
                            }
                          }}
                        />
                        {isSearchingBank && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Банк определится автоматически
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название банка</FormLabel>
                    <FormControl>
                      <Input placeholder="ПАО Сбербанк" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank_corr_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Корр. счёт</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="30101810400000000225" 
                        maxLength={20}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_swift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT (опционально)</FormLabel>
                    <FormControl>
                      <Input placeholder="SABRRUMM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите валюту" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RUB">₽ Рубль (RUB)</SelectItem>
                        <SelectItem value="USD">$ Доллар (USD)</SelectItem>
                        <SelectItem value="EUR">€ Евро (EUR)</SelectItem>
                        <SelectItem value="CNY">¥ Юань (CNY)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opened_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата открытия</FormLabel>
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
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Основной счёт
                    </FormLabel>
                    <FormDescription>
                      Использовать по умолчанию для платежей
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

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
                {account ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Базовые данные о банках по БИК (можно расширить или использовать API)
function getBankByBik(bik: string): { name: string; corrAccount: string } | null {
  const banks: Record<string, { name: string; corrAccount: string }> = {
    "044525225": { name: "ПАО Сбербанк", corrAccount: "30101810400000000225" },
    "044525974": { name: "АО «Тинькофф Банк»", corrAccount: "30101810145250000974" },
    "044525593": { name: "АО «АЛЬФА-БАНК»", corrAccount: "30101810200000000593" },
    "044525187": { name: "Банк ВТБ (ПАО)", corrAccount: "30101810700000000187" },
    "044525700": { name: "АО «Райффайзенбанк»", corrAccount: "30101810200000000700" },
    "044525092": { name: "ПАО «Промсвязьбанк»", corrAccount: "30101810400000000092" },
    "044525999": { name: "АО «Точка»", corrAccount: "30101810845250000999" },
    "044525848": { name: "АО КБ «Модульбанк»", corrAccount: "30101810645250000848" },
  };
  
  return banks[bik] || null;
}
