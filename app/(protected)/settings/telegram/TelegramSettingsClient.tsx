"use client";

import { useState, useEffect } from "react";
import styles from "./TelegramSettings.module.css";

interface TelegramSettings {
  telegram_user_id: string | null;
  telegram_username: string | null;
  telegram_linked_at: string | null;
  telegram_chat_id: number | null;
}

export default function TelegramSettingsClient() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/telegram");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateLinkCode() {
    setGeneratingCode(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/telegram/link-code", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate code");

      const data = await res.json();
      setLinkCode(data.code);
      setMessage({
        type: "success",
        text: "Код сгенерирован! Отправьте его боту в течение 10 минут.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Ошибка генерации кода",
      });
    } finally {
      setGeneratingCode(false);
    }
  }

  async function unlinkTelegram() {
    if (!confirm("Отвязать Telegram аккаунт?")) {
      return;
    }

    try {
      const res = await fetch("/api/settings/telegram", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to unlink");

      setMessage({
        type: "success",
        text: "Telegram аккаунт отвязан",
      });
      loadSettings();
      setLinkCode(null);
    } catch {
      setMessage({
        type: "error",
        text: "Ошибка при отвязке",
      });
    }
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  const isLinked = settings?.telegram_user_id !== null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>💬 Telegram Бот</h1>
        <p className={styles.subtitle}>
          Управляйте финансами прямо из Telegram
        </p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {isLinked && settings ? (
        <div className={styles.linkedCard}>
          <div className={styles.linkedHeader}>
            <div className={styles.linkedIcon}>✅</div>
            <div>
              <div className={styles.linkedTitle}>Telegram подключен</div>
              <div className={styles.linkedUsername}>
                @{settings.telegram_username || "без username"}
              </div>
            </div>
          </div>

          <div className={styles.linkedInfo}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>User ID:</div>
              <div className={styles.infoValue}>{settings.telegram_user_id}</div>
            </div>
            {settings.telegram_linked_at && (
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Подключено:</div>
                <div className={styles.infoValue}>
                  {new Date(settings.telegram_linked_at).toLocaleDateString("ru-RU")}
                </div>
              </div>
            )}
          </div>

          <button className={styles.unlinkBtn} onClick={unlinkTelegram}>
            Отвязать аккаунт
          </button>

          <div className={styles.commands}>
            <h3>📱 Доступные команды:</h3>
            <div className={styles.commandsList}>
              <div className={styles.command}>
                <code>/balance</code>
                <span>Показать баланс</span>
              </div>
              <div className={styles.command}>
                <code>/stats</code>
                <span>Статистика за месяц</span>
              </div>
              <div className={styles.command}>
                <code>/budgets</code>
                <span>Состояние бюджетов</span>
              </div>
              <div className={styles.command}>
                <code>/add 500 кофе</code>
                <span>Добавить расход</span>
              </div>
            </div>
            <p className={styles.commandsNote}>
              Также поддерживаются естественные команды: &quot;Покажи баланс&quot;, &quot;Добавь 1000р на продукты&quot;
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.unlinkCard}>
          <div className={styles.steps}>
            <h3>🚀 Как подключить:</h3>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>Найдите бота</div>
                <div className={styles.stepDesc}>
                  Откройте Telegram и найдите нашего бота:
                  <br />
                  <strong>@finapp_tracker_bot</strong>
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>Сгенерируйте код</div>
                <div className={styles.stepDesc}>
                  Нажмите кнопку ниже, чтобы получить одноразовый код привязки
                </div>
              </div>
            </div>

            {linkCode ? (
              <div className={styles.codeCard}>
                <div className={styles.codeLabel}>Ваш код привязки:</div>
                <div className={styles.code}>{linkCode}</div>
                <div className={styles.codeHint}>
                  ⏱️ Код действителен 10 минут
                </div>
              </div>
            ) : (
              <button
                className={styles.generateBtn}
                onClick={generateLinkCode}
                disabled={generatingCode}
              >
                {generatingCode ? "Генерируем..." : "🔗 Сгенерировать код"}
              </button>
            )}

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>Отправьте код боту</div>
                <div className={styles.stepDesc}>
                  Напишите боту:
                  <br />
                  <code>/start {linkCode || "ВАШ_КОД"}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.info}>
        <h3>ℹ️ Информация</h3>
        <ul>
          <li>Бот работает через Telegram API</li>
          <li>Все команды выполняются от вашего имени</li>
          <li>Данные передаются по защищённому соединению</li>
          <li>Вы можете отвязать бота в любой момент</li>
        </ul>
      </div>
    </div>
  );
}
