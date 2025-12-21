"use client";

import { useState } from "react";
import { SupplierDaDataEnrich } from "@/components/suppliers/SupplierDaDataEnrich";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Key, CheckCircle, AlertCircle, Search } from "lucide-react";

export default function DaDataIntegrationPage() {
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [testInn, setTestInn] = useState("");

  const handleSaveConfig = () => {
    if (apiKey.length > 10) {
      setIsConfigured(true);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DaData интеграция</h1>
          <p className="text-muted-foreground">
            Автоматическое обогащение данных поставщиков по ИНН/ОГРН
          </p>
        </div>
        <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-100 text-green-800" : ""}>
          {isConfigured ? <><CheckCircle className="h-3 w-3 mr-1" />Настроено</> : <><AlertCircle className="h-3 w-3 mr-1" />Требуется настройка</>}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Настройки API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API ключ DaData
            </CardTitle>
            <CardDescription>
              Получите ключ на{" "}
              <a href="https://dadata.ru/api/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                dadata.ru
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Token</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Введите API ключ DaData..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveConfig} disabled={apiKey.length < 10}>
              Сохранить
            </Button>
          </CardContent>
        </Card>

        {/* Возможности */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Возможности
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Реквизиты организации</div>
                  <div className="text-sm text-muted-foreground">Название, адрес, ОГРН, КПП, ОКПО</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Руководители</div>
                  <div className="text-sm text-muted-foreground">ФИО, должность генерального директора</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Финансовые показатели</div>
                  <div className="text-sm text-muted-foreground">Уставный капитал, количество сотрудников</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Статус организации</div>
                  <div className="text-sm text-muted-foreground">Действующая, ликвидирована, в процессе</div>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Тестирование */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Тестирование
            </CardTitle>
            <CardDescription>
              Проверьте работу интеграции, введя ИНН организации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Введите ИНН для теста (например: 7707083893)"
                  value={testInn}
                  onChange={(e) => setTestInn(e.target.value)}
                />
              </div>
              <SupplierDaDataEnrich
                supplierId="test"
                currentInn={testInn}
                onEnrich={async () => null}
                onApplyData={async () => {}}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
