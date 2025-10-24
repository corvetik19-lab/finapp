"use client";

import { useState, useEffect } from "react";
import baseStyles from "@/components/settings/Settings.module.css";
import styles from "@/components/settings/N8nManager.module.css";

type Workflow = {
  id: string;
  name: string;
  active: boolean;
  description: string;
  lastRun?: string;
  tags?: string[];
};

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
};

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "telegram-receipt-parser",
    name: "Парсинг чеков из Telegram",
    description: "Автоматически извлекает данные о покупках из сообщений в Telegram боте",
    category: "Telegram",
    icon: "🧾",
  },
  {
    id: "expense-categorization",
    name: "Автокатегоризация расходов",
    description: "Использует AI для автоматической категоризации транзакций",
    category: "AI",
    icon: "🤖",
  },
  {
    id: "budget-alerts",
    name: "Уведомления о бюджете",
    description: "Отправляет предупреждения при превышении лимитов бюджета",
    category: "Уведомления",
    icon: "💰",
  },
  {
    id: "recurring-transactions",
    name: "Повторяющиеся транзакции",
    description: "Автоматически создает регулярные платежи по расписанию",
    category: "Автоматизация",
    icon: "🔄",
  },
  {
    id: "report-generator",
    name: "Генератор отчетов",
    description: "Автоматически создает и отправляет финансовые отчеты",
    category: "Отчеты",
    icon: "📊",
  },
];

export default function N8nManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [n8nUrl, setN8nUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadN8nSettings();
  }, []);

  const loadN8nSettings = async () => {
    try {
      const response = await fetch("/api/settings/n8n");
      if (response.ok) {
        const data = await response.json();
        setN8nUrl(data.url || "");
        setApiKey(data.apiKey || "");
        setWorkflows(data.workflows || []);
        setConnectionStatus(data.connected ? "connected" : "disconnected");
      }
    } catch (error) {
      console.error("Error loading n8n settings:", error);
      setConnectionStatus("disconnected");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: n8nUrl,
          apiKey: apiKey,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setMessage({ type: "success", text: "Настройки успешно сохранены" });
      await loadN8nSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setConnectionStatus("checking");
    setMessage(null);

    try {
      const response = await fetch("/api/settings/n8n/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: n8nUrl, apiKey }),
      });

      if (response.ok) {
        setConnectionStatus("connected");
        setMessage({ type: "success", text: "Подключение успешно!" });
        await loadN8nSettings();
      } else {
        setConnectionStatus("disconnected");
        setMessage({ type: "error", text: "Не удалось подключиться к n8n" });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus("disconnected");
      setMessage({ type: "error", text: "Ошибка подключения" });
    }
  };

  const toggleWorkflow = async (workflowId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/settings/n8n/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflowId ? { ...w, active } : w))
        );
        setMessage({
          type: "success",
          text: `Воркфлоу ${active ? "активирован" : "деактивирован"}`,
        });
      }
    } catch (error) {
      console.error("Error toggling workflow:", error);
      setMessage({ type: "error", text: "Не удалось изменить статус воркфлоу" });
    }
  };

  const installTemplate = async (templateId: string) => {
    try {
      const response = await fetch("/api/settings/n8n/templates/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Шаблон успешно установлен" });
        await loadN8nSettings();
      } else {
        setMessage({ type: "error", text: "Не удалось установить шаблон" });
      }
    } catch (error) {
      console.error("Error installing template:", error);
      setMessage({ type: "error", text: "Ошибка установки шаблона" });
    }
  };

  if (isLoading) {
    return (
      <div className={baseStyles.settingsCard}>
        <div className={baseStyles.cardContent}>
          <div className={styles.loadingState}>Загрузка настроек n8n...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Статус подключения */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Подключение к n8n</div>
          <div className={styles.cardDescription}>
            Настройте подключение к вашему экземпляру n8n для автоматизации
          </div>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.statusRow}>
            <div className={styles.statusInfo}>
              <span
                className={`${styles.statusDot} ${
                  connectionStatus === "connected"
                    ? styles.statusDotConnected
                    : connectionStatus === "checking"
                    ? styles.statusDotChecking
                    : styles.statusDotDisconnected
                }`}
              />
              <span className={styles.statusLabel}>
                {connectionStatus === "connected"
                  ? "Подключено"
                  : connectionStatus === "checking"
                  ? "Проверка..."
                  : "Не подключено"}
              </span>
            </div>
            <span className={styles.statusNote}>
              {connectionStatus === "connected"
                ? "Все готово к запуску автоматизации"
                : "Укажите адрес и ключ API, затем проверьте подключение"}
            </span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>URL адрес n8n</label>
              <input
                type="url"
                className={styles.textField}
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://n8n.yourdomain.com"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>API Key</label>
              <div className={styles.secretFieldWrapper}>
                <input
                  type={showApiKey ? "text" : "password"}
                  className={styles.textField}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="n8n_api_key_..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={styles.secretToggle}
                >
                  <span className="material-icons" style={{ fontSize: "20px" }}>
                    {showApiKey ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className={styles.buttonRow}>
              <button onClick={testConnection} className={`${styles.button} ${styles.secondaryButton}`}>
                <span className="material-icons" style={{ fontSize: "18px" }}>wifi_tethering</span>
                Проверить подключение
              </button>
              <button
                onClick={saveSettings}
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={isSaving}
              >
                <span className="material-icons" style={{ fontSize: "18px" }}>save</span>
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`${baseStyles.message} ${
                message.type === "success" ? baseStyles.messageSuccess : baseStyles.messageError
              } ${styles.feedbackMessage}`}
            >
              {message.text}
            </div>
          )}
        </div>
      </section>

      {/* Активные воркфлоу */}
      {connectionStatus === "connected" && workflows.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Подключенные воркфлоу</div>
            <div className={styles.cardDescription}>
              Управляйте активными воркфлоу автоматизации
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.workflowList}>
              {workflows.map((workflow) => (
                <div className={styles.workflowItem} key={workflow.id}>
                  <div className={styles.workflowTopRow}>
                    <div className={styles.workflowMain}>
                      <div className={styles.workflowName}>{workflow.name}</div>
                      <div className={styles.workflowDescription}>{workflow.description}</div>
                    </div>
                    <label className={styles.workflowToggle}>
                      <input
                        type="checkbox"
                        checked={workflow.active}
                        onChange={(e) => toggleWorkflow(workflow.id, e.target.checked)}
                      />
                      {workflow.active ? "Активен" : "Выключен"}
                    </label>
                  </div>
                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className={styles.workflowTags}>
                      {workflow.tags.map((tag) => (
                        <span className={styles.workflowTag} key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Шаблоны */}
      {connectionStatus === "connected" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Шаблоны автоматизации</div>
            <div className={styles.cardDescription}>
              Готовые воркфлоу для быстрого старта
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.templateGrid}>
              {WORKFLOW_TEMPLATES.map((template) => (
                <article className={styles.templateCard} key={template.id}>
                  <div className={styles.templateIcon}>{template.icon}</div>
                  <div className={styles.templateTitle}>{template.name}</div>
                  <div className={styles.templateDescription}>{template.description}</div>
                  <div className={styles.templateMeta}>
                    <span className={styles.templateCategory}>{template.category}</span>
                    <button
                      onClick={() => installTemplate(template.id)}
                      className={styles.templateInstallButton}
                    >
                      <span className="material-icons" style={{ fontSize: "16px" }}>download</span>
                      Установить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Помощь */}
      <section className={styles.helpCard}>
        <p>
          <strong>n8n</strong> — визуальная платформа автоматизации. Соединяйте приложения, стройте цепочки действий и
          запускайте сценарии по расписанию или событиям.
        </p>
        <p>Для подключения автоматизации:</p>
        <ol className={styles.helpList}>
          <li>Разверните свой экземпляр n8n (облако или self-hosted)</li>
          <li>Сгенерируйте API ключ в настройках n8n</li>
          <li>Укажите URL и API ключ выше, проверьте подключение</li>
          <li>Установите шаблоны или создайте собственные воркфлоу</li>
        </ol>
        <p>
          📚 <a className={styles.helpLink} href="https://docs.n8n.io" target="_blank" rel="noopener noreferrer">
            Документация n8n
          </a>
        </p>
      </section>
    </div>
  );
}
