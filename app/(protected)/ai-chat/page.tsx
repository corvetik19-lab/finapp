/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useChat, type Message } from "ai/react";
import styles from "./AiChat.module.css";
import { useState, useRef, useEffect } from "react";

export default function AiChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/ai/chat",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions] = useState([
    "Покажи мой баланс за месяц",
    "Создай расход 1500₽ на продукты",
    "Какие у меня последние транзакции?",
    "Создай категорию 'Спорт' для расходов",
    "Покажи мои финансовые планы",
  ]);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.icon}>🤖</span>
          AI Финансовый Ассистент
        </h1>
        <p className={styles.subtitle}>
          Задавайте вопросы о ваших финансах или попросите выполнить действия
        </p>
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
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className={styles.inputForm}>
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
