"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Link2, 
  Plus, 
  ArrowLeft,
  MoreHorizontal,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Zap
} from "lucide-react";
import {
  BankAccount,
  BankIntegration,
  BANKS,
  INTEGRATION_STATUSES,
  BankCode,
  IntegrationStatus,
} from "@/lib/accounting/bank-types";

interface BankIntegrationsPageProps {
  integrations: BankIntegration[];
  accounts: BankAccount[];
}

export function BankIntegrationsPage({ integrations, accounts }: BankIntegrationsPageProps) {
  // Банки с поддержкой API
  const availableBanks = Object.entries(BANKS)
    .filter(([, info]) => info.hasApi)
    .map(([code, info]) => ({ code: code as BankCode, ...info }));

  // Уже подключённые банки
  const connectedBankCodes = integrations.map(i => i.bank_code);

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting/bank-accounts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-7 w-7 text-primary" />
              Банковские интеграции
            </h1>
            <p className="text-muted-foreground">
              Подключение банков по API для автоматической синхронизации
            </p>
          </div>
        </div>
      </div>

      {/* Информация */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Shield className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Безопасное подключение</h3>
              <p className="text-sm text-muted-foreground">
                Все API ключи и токены хранятся в зашифрованном виде. 
                Каждая организация настраивает интеграцию со своим банком самостоятельно.
                Мы не имеем доступа к вашим банковским данным.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Подключённые интеграции */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Подключённые банки</CardTitle>
            <CardDescription>
              Активные интеграции с банковскими API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map(integration => {
                const bankInfo = BANKS[integration.bank_code as BankCode];
                const statusInfo = INTEGRATION_STATUSES[integration.status as IntegrationStatus];
                const linkedAccounts = accounts.filter(
                  a => integration.linked_account_ids.includes(a.id)
                );
                
                return (
                  <div 
                    key={integration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Link2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {bankInfo?.name || integration.bank_name}
                          {integration.is_sandbox && (
                            <Badge variant="outline" className="text-xs">
                              Sandbox
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {linkedAccounts.length > 0 
                            ? `${linkedAccounts.length} счёт(ов) привязано`
                            : 'Нет привязанных счетов'
                          }
                        </div>
                        {integration.last_sync_at && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Последняя синхронизация: {new Date(integration.last_sync_at).toLocaleString('ru-RU')}
                          </div>
                        )}
                        {integration.last_error && (
                          <div className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {integration.last_error}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: `${statusInfo?.color}20`,
                          color: statusInfo?.color 
                        }}
                      >
                        {integration.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {integration.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {statusInfo?.name}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Синхронизировать
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Настройки
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Отключить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Доступные банки для подключения */}
      <Card>
        <CardHeader>
          <CardTitle>Подключить банк</CardTitle>
          <CardDescription>
            Выберите банк для настройки API интеграции
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableBanks.map(bank => {
              const isConnected = connectedBankCodes.includes(bank.code);
              
              return (
                <Card 
                  key={bank.code}
                  className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                    isConnected ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        {bank.name}
                      </span>
                      {isConnected && (
                        <Badge variant="secondary" className="text-xs">
                          Подключён
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {bank.oauthSupported ? (
                          <>
                            <Zap className="h-4 w-4 text-green-500" />
                            OAuth авторизация
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4" />
                            API ключи
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!isConnected && (
                          <Button size="sm" className="flex-1">
                            <Plus className="h-4 w-4 mr-1" />
                            Подключить
                          </Button>
                        )}
                        {bank.apiDocsUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a 
                              href={bank.apiDocsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Инструкции */}
      <Card>
        <CardHeader>
          <CardTitle>Как подключить банк?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Получите API ключи</h4>
                <p className="text-sm text-muted-foreground">
                  Зарегистрируйтесь в личном кабинете банка для разработчиков 
                  и получите Client ID и Secret
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Настройте интеграцию</h4>
                <p className="text-sm text-muted-foreground">
                  Укажите полученные ключи в настройках интеграции 
                  и пройдите OAuth авторизацию
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Синхронизируйте данные</h4>
                <p className="text-sm text-muted-foreground">
                  Привяжите расчётные счета и настройте автоматическую 
                  синхронизацию выписки
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
