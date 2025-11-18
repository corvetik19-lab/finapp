"use client";

import { useState } from "react";
import styles from "./IntegrationsManager.module.css";

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Интеграции</h1>
          <p className={styles.subtitle}>Подключите внешние сервисы для автоматизации и уведомлений</p>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          <span className="material-icons">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          {message.text}
        </div>
      )}

      <div className={styles.grid}>
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const isConnected = getIntegrationStatus(integration.id);

          return (
            <div key={integration.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ background: integration.color }}>
                  <span className="material-icons">{integration.icon}</span>
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{integration.name}</h3>
                  <p className={styles.cardDesc}>{integration.description}</p>
                </div>
                {isConnected && (
                  <span className={styles.badge}>
                    <span className="material-icons">check_circle</span>
                    Подключено
                  </span>
                )}
              </div>

              {selectedIntegration === integration.id ? (
                <div className={styles.form}>
                  {integration.fields.map((field) => (
                    <div key={field.key} className={styles.formGroup}>
                      <label className={styles.label}>{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.key]: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>
                  ))}
                  <div className={styles.formActions}>
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className={styles.buttonPrimary}
                      disabled={isLoading}
                    >
                      {isLoading ? "Подключение..." : "Подключить"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIntegration(null);
                        setFormData({});
                      }}
                      className={styles.buttonSecondary}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  {isConnected ? (
                    <>
                      <button className={styles.buttonSecondary}>
                        <span className="material-icons">settings</span>
                        Настроить
                      </button>
                      <button
                        onClick={() => handleDisconnect(isConnected.id)}
                        className={styles.buttonDanger}
                        disabled={isLoading}
                      >
                        <span className="material-icons">link_off</span>
                        Отключить
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedIntegration(integration.id)}
                      className={styles.buttonPrimary}
                    >
                      <span className="material-icons">add</span>
                      Подключить
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
