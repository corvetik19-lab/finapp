"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  FileText,
  Percent,
  Shield,
  Save,
  Loader2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast/ToastContext";

interface InvestorSettings {
  notifications: {
    emailEnabled: boolean;
    telegramEnabled: boolean;
    daysBeforeDue: number;
    notifyOnReceived: boolean;
    notifyOnOverdue: boolean;
    notifyOnTenderWin: boolean;
    notifyOnTenderLoss: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
  defaults: {
    defaultInterestRate: number;
    defaultPeriodDays: number;
    defaultPenaltyRate: number;
    penaltyGraceDays: number;
    autoCalculatePenalty: boolean;
  };
  guarantees: {
    defaultCommissionRate: number;
    reminderDaysBeforeExpiry: number;
    autoRenewReminder: boolean;
  };
  display: {
    showCompletedInvestments: boolean;
    defaultCurrency: string;
    dateFormat: string;
  };
}

const defaultSettings: InvestorSettings = {
  notifications: {
    emailEnabled: true,
    telegramEnabled: false,
    daysBeforeDue: 7,
    notifyOnReceived: true,
    notifyOnOverdue: true,
    notifyOnTenderWin: true,
    notifyOnTenderLoss: false,
    weeklyReport: false,
    monthlyReport: true,
  },
  defaults: {
    defaultInterestRate: 24,
    defaultPeriodDays: 90,
    defaultPenaltyRate: 0.1,
    penaltyGraceDays: 3,
    autoCalculatePenalty: true,
  },
  guarantees: {
    defaultCommissionRate: 2.5,
    reminderDaysBeforeExpiry: 30,
    autoRenewReminder: true,
  },
  display: {
    showCompletedInvestments: false,
    defaultCurrency: "RUB",
    dateFormat: "dd.MM.yyyy",
  },
};

export function InvestorSettingsClient() {
  const { show } = useToast();
  const [settings, setSettings] = useState<InvestorSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/investors/settings");
      if (response.ok) {
        const { data } = await response.json();
        if (data) {
          setSettings({
            notifications: {
              emailEnabled: data.notifications?.emailPaymentReminders ?? true,
              telegramEnabled: data.notifications?.telegramEnabled ?? false,
              daysBeforeDue: data.notifications?.reminderDaysBefore ?? 7,
              notifyOnReceived: data.notifications?.emailStatusChanges ?? true,
              notifyOnOverdue: data.notifications?.emailOverdueAlerts ?? true,
              notifyOnTenderWin: data.notifications?.emailTenderEvents ?? true,
              notifyOnTenderLoss: data.notifications?.emailTenderEvents ?? false,
              weeklyReport: data.notifications?.weeklyReport ?? false,
              monthlyReport: data.notifications?.monthlyReport ?? true,
            },
            defaults: {
              defaultInterestRate: data.defaults?.defaultInterestRate ?? 24,
              defaultPeriodDays: data.defaults?.defaultPeriodDays ?? 90,
              defaultPenaltyRate: data.defaults?.defaultPenaltyRate ?? 0.1,
              penaltyGraceDays: data.defaults?.penaltyGraceDays ?? 3,
              autoCalculatePenalty: data.defaults?.autoCalculatePenalty ?? true,
            },
            guarantees: {
              defaultCommissionRate: data.defaults?.defaultCommissionRate ?? 2.5,
              reminderDaysBeforeExpiry: data.defaults?.guaranteeReminderDays ?? 30,
              autoRenewReminder: data.defaults?.autoRenewReminder ?? true,
            },
            display: {
              showCompletedInvestments: data.defaults?.showCompletedInvestments ?? false,
              defaultCurrency: data.defaults?.defaultCurrency ?? "RUB",
              dateFormat: data.defaults?.dateFormat ?? "dd.MM.yyyy",
            },
          });
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/investors/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            emailPaymentReminders: settings.notifications.emailEnabled,
            emailOverdueAlerts: settings.notifications.notifyOnOverdue,
            emailStatusChanges: settings.notifications.notifyOnReceived,
            emailTenderEvents: settings.notifications.notifyOnTenderWin,
            telegramEnabled: settings.notifications.telegramEnabled,
            telegramChatId: null,
            reminderDaysBefore: settings.notifications.daysBeforeDue,
            weeklyReport: settings.notifications.weeklyReport,
            monthlyReport: settings.notifications.monthlyReport,
          },
          defaults: {
            defaultInterestRate: settings.defaults.defaultInterestRate,
            defaultPeriodDays: settings.defaults.defaultPeriodDays,
            defaultPenaltyRate: settings.defaults.defaultPenaltyRate,
            penaltyGraceDays: settings.defaults.penaltyGraceDays,
            autoCalculatePenalty: settings.defaults.autoCalculatePenalty,
            defaultCommissionRate: settings.guarantees.defaultCommissionRate,
            guaranteeReminderDays: settings.guarantees.reminderDaysBeforeExpiry,
            autoRenewReminder: settings.guarantees.autoRenewReminder,
            showCompletedInvestments: settings.display.showCompletedInvestments,
            defaultCurrency: settings.display.defaultCurrency,
            dateFormat: settings.display.dateFormat,
          },
        }),
      });

      if (response.ok) {
        show("Настройки сохранены", { type: "success" });
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      show("Ошибка сохранения", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = <K extends keyof InvestorSettings["notifications"]>(
    key: K,
    value: InvestorSettings["notifications"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const updateDefaults = <K extends keyof InvestorSettings["defaults"]>(
    key: K,
    value: InvestorSettings["defaults"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      defaults: { ...prev.defaults, [key]: value },
    }));
  };

  const updateGuarantees = <K extends keyof InvestorSettings["guarantees"]>(
    key: K,
    value: InvestorSettings["guarantees"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      guarantees: { ...prev.guarantees, [key]: value },
    }));
  };

  const updateDisplay = <K extends keyof InvestorSettings["display"]>(
    key: K,
    value: InvestorSettings["display"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки модуля инвесторов</h1>
          <p className="text-muted-foreground">
            Управление уведомлениями, значениями по умолчанию и отображением
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </>
          )}
        </Button>
      </div>

      {/* Уведомления */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
          <CardDescription>
            Настройки уведомлений о платежах, возвратах и событиях тендеров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email уведомления</p>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления на email
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications.emailEnabled}
                onCheckedChange={(v) => updateNotification("emailEnabled", v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Telegram уведомления</p>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления в Telegram
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.notifications.telegramEnabled}
                onCheckedChange={(v) => updateNotification("telegramEnabled", v)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Триггеры уведомлений</h4>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>За сколько дней до срока возврата напоминать</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.notifications.daysBeforeDue}
                    onChange={(e) =>
                      updateNotification("daysBeforeDue", parseInt(e.target.value) || 7)
                    }
                    className="w-20"
                    min={1}
                    max={30}
                  />
                  <span className="text-sm text-muted-foreground">дней</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>При получении средств от инвестора</Label>
                <Switch
                  checked={settings.notifications.notifyOnReceived}
                  onCheckedChange={(v) => updateNotification("notifyOnReceived", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>При просрочке платежа</Label>
                <Switch
                  checked={settings.notifications.notifyOnOverdue}
                  onCheckedChange={(v) => updateNotification("notifyOnOverdue", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>При победе в тендере (связанном с инвестицией)</Label>
                <Switch
                  checked={settings.notifications.notifyOnTenderWin}
                  onCheckedChange={(v) => updateNotification("notifyOnTenderWin", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>При проигрыше в тендере</Label>
                <Switch
                  checked={settings.notifications.notifyOnTenderLoss}
                  onCheckedChange={(v) => updateNotification("notifyOnTenderLoss", v)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Регулярные отчёты</h4>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Еженедельный отчёт о состоянии инвестиций</Label>
                <Switch
                  checked={settings.notifications.weeklyReport}
                  onCheckedChange={(v) => updateNotification("weeklyReport", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ежемесячный сводный отчёт</Label>
                <Switch
                  checked={settings.notifications.monthlyReport}
                  onCheckedChange={(v) => updateNotification("monthlyReport", v)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Значения по умолчанию */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Значения по умолчанию
          </CardTitle>
          <CardDescription>
            Стандартные параметры для новых инвестиций
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Процентная ставка по умолчанию (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.defaults.defaultInterestRate]}
                  onValueChange={([v]) => updateDefaults("defaultInterestRate", v)}
                  min={5}
                  max={50}
                  step={0.5}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">
                  {settings.defaults.defaultInterestRate}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Срок инвестиции по умолчанию (дней)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.defaults.defaultPeriodDays]}
                  onValueChange={([v]) => updateDefaults("defaultPeriodDays", v)}
                  min={30}
                  max={365}
                  step={1}
                  className="flex-1"
                />
                <span className="w-16 text-right font-medium">
                  {settings.defaults.defaultPeriodDays} дн.
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="font-medium">Настройки пени</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ставка пени (% в день)</Label>
                <Input
                  type="number"
                  value={settings.defaults.defaultPenaltyRate}
                  onChange={(e) =>
                    updateDefaults("defaultPenaltyRate", parseFloat(e.target.value) || 0.1)
                  }
                  step="0.01"
                  min="0"
                  max="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Льготный период (дней)</Label>
                <Input
                  type="number"
                  value={settings.defaults.penaltyGraceDays}
                  onChange={(e) =>
                    updateDefaults("penaltyGraceDays", parseInt(e.target.value) || 0)
                  }
                  min="0"
                  max="30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Автоматически начислять пеню при просрочке</Label>
              <Switch
                checked={settings.defaults.autoCalculatePenalty}
                onCheckedChange={(v) => updateDefaults("autoCalculatePenalty", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Банковские гарантии */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Банковские гарантии
          </CardTitle>
          <CardDescription>
            Настройки для работы с банковскими гарантиями
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Комиссия по умолчанию (%)</Label>
              <Input
                type="number"
                value={settings.guarantees.defaultCommissionRate}
                onChange={(e) =>
                  updateGuarantees("defaultCommissionRate", parseFloat(e.target.value) || 2.5)
                }
                step="0.1"
                min="0"
                max="10"
              />
            </div>

            <div className="space-y-2">
              <Label>Напоминать за N дней до окончания</Label>
              <Input
                type="number"
                value={settings.guarantees.reminderDaysBeforeExpiry}
                onChange={(e) =>
                  updateGuarantees(
                    "reminderDaysBeforeExpiry",
                    parseInt(e.target.value) || 30
                  )
                }
                min="7"
                max="90"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Напоминать о продлении гарантии</Label>
            <Switch
              checked={settings.guarantees.autoRenewReminder}
              onCheckedChange={(v) => updateGuarantees("autoRenewReminder", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Отображение */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Отображение
          </CardTitle>
          <CardDescription>
            Настройки интерфейса модуля инвесторов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Показывать завершённые инвестиции в списках</Label>
            <Switch
              checked={settings.display.showCompletedInvestments}
              onCheckedChange={(v) => updateDisplay("showCompletedInvestments", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Валюта по умолчанию</Label>
              <Select
                value={settings.display.defaultCurrency}
                onValueChange={(v) => updateDisplay("defaultCurrency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUB">Рубль (₽)</SelectItem>
                  <SelectItem value="USD">Доллар ($)</SelectItem>
                  <SelectItem value="EUR">Евро (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Формат даты</Label>
              <Select
                value={settings.display.dateFormat}
                onValueChange={(v) => updateDisplay("dateFormat", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd.MM.yyyy">21.12.2025</SelectItem>
                  <SelectItem value="yyyy-MM-dd">2025-12-21</SelectItem>
                  <SelectItem value="dd/MM/yyyy">21/12/2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Шаблоны документов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Шаблоны документов
          </CardTitle>
          <CardDescription>
            Шаблоны договоров и соглашений с инвесторами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Договор займа</p>
                  <p className="text-sm text-muted-foreground">
                    Стандартный шаблон договора займа
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Редактировать
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Акт сверки</p>
                  <p className="text-sm text-muted-foreground">
                    Шаблон акта сверки взаиморасчётов
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Редактировать
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Отчёт инвестору</p>
                  <p className="text-sm text-muted-foreground">
                    Шаблон периодического отчёта для инвестора
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Редактировать
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              Добавить шаблон
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
