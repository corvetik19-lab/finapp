"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Database, FileText, Globe, ArrowRight, CheckCircle, XCircle } from "lucide-react";

const integrations = [
  {
    id: "dadata",
    name: "DaData",
    description: "Автоматическое обогащение данных поставщиков по ИНН/ОГРН",
    icon: Database,
    status: "active",
    href: "/tenders/suppliers/integrations/dadata",
    features: ["Реквизиты по ИНН", "Адреса", "Руководители", "Финансы"],
  },
  {
    id: "1c",
    name: "1С: Предприятие",
    description: "Синхронизация контрагентов с 1С через OData/HTTP",
    icon: Link2,
    status: "inactive",
    href: "/tenders/suppliers/integrations/1c",
    features: ["Импорт контрагентов", "Экспорт поставщиков", "Синхронизация"],
  },
  {
    id: "edo",
    name: "ЭДО провайдеры",
    description: "Интеграция с Диадок, СБИС, Контур для обмена документами",
    icon: FileText,
    status: "inactive",
    href: "/tenders/suppliers/integrations/edo",
    features: ["Приглашения в ЭДО", "Обмен УПД", "Акты сверки"],
  },
  {
    id: "zakupki",
    name: "Zakupki.gov.ru",
    description: "Поиск и анализ закупок с портала госзакупок",
    icon: Globe,
    status: "active",
    href: "/tenders/suppliers/integrations/zakupki",
    features: ["Поиск по 44-ФЗ/223-ФЗ", "История участия", "Аналитика"],
  },
];

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Интеграции</h1>
        <p className="text-muted-foreground">
          Подключение внешних сервисов для расширения возможностей
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <integration.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={integration.status === "active" ? "default" : "secondary"}
                  className={integration.status === "active" ? "bg-green-100 text-green-800" : ""}
                >
                  {integration.status === "active" ? (
                    <><CheckCircle className="h-3 w-3 mr-1" />Активна</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" />Не настроена</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {integration.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
              <Button asChild className="w-full">
                <Link href={integration.href}>
                  Настроить
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
