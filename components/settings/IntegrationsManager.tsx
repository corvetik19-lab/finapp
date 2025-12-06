"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plug, Settings, Unplug, Plus, CheckCircle2, AlertTriangle, MessageCircle, Webhook, Mail, Send, Loader2 } from "lucide-react";

interface Integration {
  id: string;
  service: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface IntegrationsManagerProps {
  integrations: Integration[];
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: "telegram",
    name: "Telegram Bot",
    description: "Получайте уведомления и управляйте финансами через Telegram",
    icon: "telegram",
    color: "#0088cc",
    fields: [
      { key: "bot_token", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF..." },
      { key: "chat_id", label: "Chat ID", type: "text", placeholder: "123456789" },
    ],
  },
  {
    id: "n8n",
    name: "n8n Webhook",
    description: "Автоматизация через n8n workflows",
    icon: "webhook",
    color: "#ea4b71",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://n8n.example.com/webhook/..." },
      { key: "secret", label: "Secret Key", type: "password", placeholder: "your-secret-key" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Уведомления в Slack канал",
    icon: "chat_bubble",
    color: "#4A154B",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/..." },
    ],
  },
  {
    id: "email",
    name: "Email SMTP",
    description: "Отправка email уведомлений",
    icon: "email",
    color: "#6366f1",
    fields: [
      { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "smtp_user", label: "Username", type: "text", placeholder: "user@example.com" },
      { key: "smtp_password", label: "Password", type: "password", placeholder: "••••••••" },
    ],
  },
];

export default function IntegrationsManager({ integrations }: IntegrationsManagerProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleConnect = async (integrationId: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: integrationId,
          config: formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка подключения интеграции");
      }

      setMessage({ type: "success", text: "Интеграция успешно подключена" });
      setSelectedIntegration(null);
      setFormData({});
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Вы уверены, что хотите отключить эту интеграцию?")) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration_id: integrationId }),
      });

      if (!response.ok) {
        throw new Error("Ошибка отключения интеграции");
      }

      setMessage({ type: "success", text: "Интеграция успешно отключена" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  const getIntegrationStatus = (serviceId: string) => {
    return integrations.find((i) => i.service === serviceId && i.is_active);
  };

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'telegram': return <Send className="h-5 w-5 text-white" />;
      case 'webhook': return <Webhook className="h-5 w-5 text-white" />;
      case 'chat_bubble': return <MessageCircle className="h-5 w-5 text-white" />;
      case 'email': return <Mail className="h-5 w-5 text-white" />;
      default: return <Plug className="h-5 w-5 text-white" />;
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Plug className="h-6 w-6" />Интеграции</h1><p className="text-sm text-muted-foreground">Подключите внешние сервисы для автоматизации</p></div>

      {message && <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-destructive'}>{message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4" />}<AlertDescription>{message.text}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const isConnected = getIntegrationStatus(integration.id);
          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: integration.color }}>{getIcon(integration.icon)}</div><div className="flex-1"><CardTitle className="text-base flex items-center gap-2">{integration.name}{isConnected && <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Подключено</Badge>}</CardTitle><CardDescription>{integration.description}</CardDescription></div></div></CardHeader>
              <CardContent>
                {selectedIntegration === integration.id ? (
                  <div className="space-y-3">{integration.fields.map(f => <div key={f.key} className="space-y-1"><Label>{f.label}</Label><Input type={f.type} placeholder={f.placeholder} value={formData[f.key] || ''} onChange={e => setFormData({...formData, [f.key]: e.target.value})} /></div>)}<div className="flex gap-2"><Button onClick={() => handleConnect(integration.id)} disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Подключение...</> : 'Подключить'}</Button><Button variant="outline" onClick={() => {setSelectedIntegration(null);setFormData({});}}>Отмена</Button></div></div>
                ) : (
                  <div className="flex gap-2">{isConnected ? <><Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Настроить</Button><Button variant="destructive" size="sm" onClick={() => handleDisconnect(isConnected.id)} disabled={isLoading}><Unplug className="h-4 w-4 mr-1" />Отключить</Button></> : <Button onClick={() => setSelectedIntegration(integration.id)}><Plus className="h-4 w-4 mr-1" />Подключить</Button>}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
