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
import { Switch } from "@/components/ui/switch";
import { Loader2, Link2, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BankIntegration,
  BANKS,
  BankCode,
} from "@/lib/accounting/bank-types";

const integrationSchema = z.object({
  bank_code: z.string().min(1, "Выберите банк"),
  integration_type: z.string().optional(),
  api_client_id: z.string().optional(),
  api_client_secret: z.string().optional(),
  is_sandbox: z.boolean().optional(),
  sync_enabled: z.boolean().optional(),
  sync_transactions: z.boolean().optional(),
  sync_statements: z.boolean().optional(),
  sync_interval_minutes: z.number().min(15).max(1440).optional(),
});

type IntegrationFormInput = z.input<typeof integrationSchema>;

interface BankIntegrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: BankIntegration | null;
  onSubmit: (data: IntegrationFormInput) => Promise<void>;
}

export function BankIntegrationForm({
  open,
  onOpenChange,
  integration,
  onSubmit,
}: BankIntegrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"select" | "configure">(integration ? "configure" : "select");
  const router = useRouter();

  const form: UseFormReturn<IntegrationFormInput> = useForm<IntegrationFormInput>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      bank_code: integration?.bank_code ?? "",
      integration_type: integration?.integration_type ?? "api",
      api_client_id: integration?.api_client_id ?? "",
      api_client_secret: "",
      is_sandbox: integration?.is_sandbox ?? true,
      sync_enabled: integration?.sync_enabled ?? true,
      sync_transactions: integration?.sync_transactions ?? true,
      sync_statements: integration?.sync_statements ?? true,
      sync_interval_minutes: integration?.sync_interval_minutes ?? 60,
    },
  });

  const selectedBankCode = form.watch("bank_code") as BankCode;
  const selectedBank = selectedBankCode ? BANKS[selectedBankCode] : null;
  const isSandbox = form.watch("is_sandbox");

  const handleSubmit = async (data: IntegrationFormInput) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving bank integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankSelect = (bankCode: string) => {
    form.setValue("bank_code", bankCode);
    setStep("configure");
  };

  // Банки с поддержкой API
  const availableBanks = Object.entries(BANKS)
    .filter(([, info]) => info.hasApi)
    .map(([code, info]) => ({ code: code as BankCode, ...info }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {integration ? "Настройки интеграции" : "Подключить банк"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Выберите банк для подключения по API"
              : `Настройка интеграции с ${selectedBank?.name || "банком"}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "select" && !integration ? (
          <div className="grid gap-3 max-h-[400px] overflow-y-auto">
            {availableBanks.map(bank => (
              <button
                key={bank.code}
                type="button"
                onClick={() => handleBankSelect(bank.code)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{bank.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {bank.oauthSupported ? "OAuth авторизация" : "API ключи"}
                    </div>
                  </div>
                </div>
                {bank.apiDocsUrl && (
                  <a 
                    href={bank.apiDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </button>
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {!integration && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">{selectedBank?.name}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setStep("select")}
                  >
                    Изменить
                  </Button>
                </div>
              )}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  API ключи хранятся в зашифрованном виде и используются только 
                  для синхронизации данных вашей организации.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="is_sandbox"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Тестовый режим (Sandbox)
                      </FormLabel>
                      <FormDescription>
                        Используйте для тестирования перед подключением к реальному счёту
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isSandbox && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Боевой режим. Убедитесь, что используете корректные API ключи.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="api_client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Введите Client ID" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={integration ? "••••••••" : "Введите Secret"} 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {integration && "Оставьте пустым, чтобы не менять"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Настройки синхронизации</h4>

                <FormField
                  control={form.control}
                  name="sync_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Автосинхронизация</FormLabel>
                        <FormDescription>
                          Автоматически обновлять данные
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sync_transactions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel>Транзакции</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sync_statements"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel>Выписки</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sync_interval_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Интервал синхронизации</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(parseInt(v))} 
                        defaultValue={(field.value ?? 60).toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите интервал" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15">Каждые 15 минут</SelectItem>
                          <SelectItem value="30">Каждые 30 минут</SelectItem>
                          <SelectItem value="60">Каждый час</SelectItem>
                          <SelectItem value="180">Каждые 3 часа</SelectItem>
                          <SelectItem value="360">Каждые 6 часов</SelectItem>
                          <SelectItem value="720">Каждые 12 часов</SelectItem>
                          <SelectItem value="1440">Раз в сутки</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === "configure" && !integration) {
                      setStep("select");
                    } else {
                      onOpenChange(false);
                    }
                  }}
                >
                  {step === "configure" && !integration ? "Назад" : "Отмена"}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {integration ? "Сохранить" : "Подключить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
