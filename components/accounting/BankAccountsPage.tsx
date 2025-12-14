"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Landmark, 
  Plus, 
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Link2,
  Star,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import { formatMoney } from "@/lib/accounting/types";
import {
  BankAccount,
  BankIntegration,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  formatAccountNumber,
  AccountStatus,
  AccountType,
} from "@/lib/accounting/bank-types";
import { BankAccountForm, BankAccountFormInput } from "./BankAccountForm";
import { createBankAccountAction, updateBankAccountAction, deleteBankAccountAction } from "@/app/(protected)/tenders/accounting/bank-accounts/actions";

interface BankAccountsPageProps {
  accounts: BankAccount[];
  integrations: BankIntegration[];
  stats: {
    totalBalance: number;
    accountsCount: number;
    activeCount: number;
    integrationsCount: number;
    lastSyncAt: string | null;
  };
}

export function BankAccountsPage({ accounts, integrations, stats }: BankAccountsPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const handleCreateAccount = async (data: BankAccountFormInput) => {
    const result = await createBankAccountAction(data);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleEditAccount = async (data: BankAccountFormInput) => {
    if (!editingAccount) return;
    const result = await updateBankAccountAction(editingAccount.id, data);
    if (!result.success) {
      throw new Error(result.error);
    }
    setEditingAccount(null);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот счёт?")) return;
    await deleteBankAccountAction(id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Landmark className="h-7 w-7 text-primary" />
              Расчётные счета
            </h1>
            <p className="text-muted-foreground">
              Управление банковскими счетами организации
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/tenders/accounting/bank-integrations">
              <Link2 className="h-4 w-4 mr-2" />
              Интеграции ({stats.integrationsCount})
            </Link>
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить счёт
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий баланс</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(stats.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              На всех счетах
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных счетов</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.activeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Из {stats.accountsCount} всего
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Подключено банков</CardTitle>
            <Link2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.integrationsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              API интеграций
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Последняя синхронизация</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {stats.lastSyncAt 
                ? new Date(stats.lastSyncAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Никогда'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Обновление данных
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Список счетов */}
      <Card>
        <CardHeader>
          <CardTitle>Счета организации</CardTitle>
          <CardDescription>
            Расчётные и другие банковские счета
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Нет расчётных счетов</h3>
              <p className="text-muted-foreground mb-4">
                Добавьте первый расчётный счёт организации
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить счёт
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Номер счёта</TableHead>
                  <TableHead>Банк</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Баланс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const statusInfo = ACCOUNT_STATUSES[account.status as AccountStatus];
                  const linkedIntegration = integrations.find(
                    i => i.linked_account_ids.includes(account.id)
                  );
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {account.is_primary && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <div>
                            <div className="font-medium">{account.name}</div>
                            {linkedIntegration && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                {linkedIntegration.bank_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {formatAccountNumber(account.account_number)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.bank_name}</div>
                          <div className="text-xs text-muted-foreground">
                            БИК: {account.bank_bik}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ACCOUNT_TYPES[account.account_type as AccountType]}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMoney(account.balance)}
                        </div>
                        {account.balance_updated_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(account.balance_updated_at).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${statusInfo?.color}20`,
                            color: statusInfo?.color 
                          }}
                        >
                          {statusInfo?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/tenders/accounting/bank-accounts/${account.id}/transactions`}>
                                <TrendingDown className="h-4 w-4 mr-2" />
                                Выписка
                              </Link>
                            </DropdownMenuItem>
                            {linkedIntegration && (
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Синхронизировать
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteAccount(account.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Быстрые действия */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/tenders/accounting/bank-integrations" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-primary" />
                Подключить банк
              </CardTitle>
              <CardDescription>
                Настройте API интеграцию с вашим банком для автоматической синхронизации
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Платёжное поручение
            </CardTitle>
            <CardDescription>
              Создать и отправить платёжное поручение в банк
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
              Синхронизация
            </CardTitle>
            <CardDescription>
              Обновить данные по всем подключённым счетам
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Форма добавления/редактирования счёта */}
      <BankAccountForm
        open={isFormOpen || !!editingAccount}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={editingAccount ? handleEditAccount : handleCreateAccount}
      />
    </div>
  );
}
