/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useChat, type Message } from "ai/react";
import styles from "./AiChat.module.css";
import { useState, useRef, useEffect } from "react";

export default function AiChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/ai/chat",
    onError: (error) => {
      console.error("AI Chat Error:", error);
      setConnectionStatus("error");
    },
    onResponse: () => {
      setConnectionStatus("connected");
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions] = useState([
    "Покажи мой баланс за месяц",
    "Создай расход 1500₽ на продукты",
    "Какие у меня последние транзакции?",
    "Создай категорию 'Спорт' для расходов",
    "Покажи мои финансовые планы",
  ]);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");

  // Проверка API при загрузке
  useEffect(() => {
    async function checkAPI() {
      try {
        const res = await fetch("/api/ai/test");
        const data = await res.json();
        
        if (!data.hasOpenAIKey) {
          setConnectionStatus("error");
          console.error("OpenAI API key не настроен!");
        } else {
          console.log("✅ API проверен:", data.message);
        }
      } catch (err) {
        console.error("Ошибка проверки API:", err);
        setConnectionStatus("error");
      }
    }
    
    checkAPI();
  }, []);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus("connecting");
    try {
      await handleSubmit(e);
    } catch (err) {
      setConnectionStatus("error");
      console.error("Submit error:", err);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connecting":
        return <span className={styles.statusConnecting}>🔄 Подключение...</span>;
      case "connected":
        return <span className={styles.statusConnected}>✅ Подключено</span>;
      case "error":
        return <span className={styles.statusError}>❌ Ошибка соединения</span>;
      default:
        return <span className={styles.statusIdle}>⚪ Готов</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            <span className={styles.icon}>🤖</span>
            AI Финансовый Ассистент
          </h1>
          <p className={styles.subtitle}>
            Задавайте вопросы о ваших финансах или попросите выполнить действия
          </p>
        </div>
        <div className={styles.statusBadge}>
          {getStatusBadge()}
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messagesArea}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>💬</div>
              <h2>Привет! Я ваш финансовый ассистент</h2>
              <p>Я могу помочь вам:</p>
              <ul className={styles.features}>
                <li>📊 Анализировать доходы и расходы</li>
                <li>💰 Создавать транзакции и категории</li>
                <li>📈 Отслеживать бюджеты и планы</li>
                <li>💡 Давать советы по управлению финансами</li>
              </ul>
              <p className={styles.tryExamples}>Попробуйте задать вопрос:</p>
              <div className={styles.suggestions}>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={styles.suggestionBtn}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === "user" ? styles.userMessage : styles.aiMessage
              }`}
            >
              <div className={styles.messageAvatar}>
                {message.role === "user" ? "👤" : "🤖"}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.messageText}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <div className={styles.messageAvatar}>🤖</div>
              <div className={styles.messageContent}>
                <div className={styles.typing}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className={styles.typingText}>AI думает...</p>
              </div>
            </div>
          )}

          {(error || connectionStatus === "error") && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <div className={styles.errorContent}>
                <strong>Ошибка соединения с AI</strong>
                <p>{error?.message || "Не удалось подключиться к OpenAI API."}</p>
                
                <div className={styles.errorHelp}>
                  <p><strong>Возможные причины:</strong></p>
                  <ul>
                    <li>OpenAI API ключ не настроен</li>
                    <li>Проблемы с интернет-соединением</li>
                    <li>API ключ недействителен или исчерпан лимит</li>
                  </ul>
                  
                  <p><strong>Как исправить:</strong></p>
                  <ol>
                    <li>Создайте файл <code>.env.local</code> в корне проекта</li>
                    <li>Добавьте строку: <code>OPENAI_API_KEY=ваш_ключ</code></li>
                    <li>Перезапустите сервер: <code>npm run dev</code></li>
                  </ol>
                  
                  <p className={styles.helpLink}>
                    Получить API ключ: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a>
                  </p>
                </div>
                
                <button 
                  onClick={() => window.location.reload()} 
                  className={styles.retryBtn}
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Напишите ваш вопрос или команду..."
            className={styles.input}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={isLoading || !input.trim()}
          >
            <span className={styles.sendIcon}>📤</span>
          </button>
        </form>
      </div>
    </div>
  );
}
