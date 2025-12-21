"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Users, Plus, Eye, BarChart3 } from "lucide-react";

export default function EmailCampaignsPage() {
  // Демо данные для кампаний
  const demoCampaigns = [
    {
      id: "c1",
      name: "Приглашение на тендер #123",
      subject: "Приглашение к участию в тендере Поставка оргтехники",
      status: "sent",
      recipientCount: 25,
      sentCount: 25,
      openedCount: 18,
      clickedCount: 12,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "c2",
      name: "Запрос КП на мебель",
      subject: "Запрос коммерческого предложения",
      status: "draft",
      recipientCount: 15,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-800">Отправлено</Badge>;
      case "draft":
        return <Badge variant="outline">Черновик</Badge>;
      case "sending":
        return <Badge className="bg-blue-100 text-blue-800">Отправка...</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email кампании</h1>
          <p className="text-muted-foreground">
            Массовые рассылки поставщикам с шаблонами и аналитикой
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Новая кампания
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{demoCampaigns.length}</div>
            </div>
            <div className="text-sm text-muted-foreground">Всего кампаний</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">
                {demoCampaigns.reduce((sum, c) => sum + c.sentCount, 0)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Отправлено писем</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">
                {demoCampaigns.reduce((sum, c) => sum + c.openedCount, 0)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Открыто</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div className="text-2xl font-bold">72%</div>
            </div>
            <div className="text-sm text-muted-foreground">Open rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Список кампаний */}
      <Card>
        <CardHeader>
          <CardTitle>Кампании</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.recipientCount} получателей
                      </span>
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString("ru")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(campaign.status)}
                  <Button variant="outline" size="sm">
                    Подробнее
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
