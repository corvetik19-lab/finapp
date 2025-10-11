"use client";

// @ts-expect-error - useChat from ai package
import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import styles from "./Chat.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const { messages, input, setInput, handleSubmit, isLoading, stop } = useChat({
    api: "/api/chat",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickQuestions = [
    "💰 Какой у меня баланс?",
    "📊 На что я больше трачу?",
    "💸 Сколько я потратил в этом месяце?",
    "💡 Как мне сэкономить?",
  ];

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>🤖</div>
          <div>
            <h2 className={styles.headerTitle}>Финансовый помощник</h2>
            <p className={styles.headerSubtitle}>
              {isLoading ? "Печатает..." : "Онлайн"}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.chatMessages}>
        {messages.length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeIcon}>💬</div>
            <h3 className={styles.welcomeTitle}>
              Привет! Я ваш финансовый помощник
            </h3>
            <p className={styles.welcomeText}>
              Я могу помочь вам с анализом расходов, планированием бюджета и
              ответить на вопросы о ваших финансах.
            </p>

            <div className={styles.quickQuestions}>
              <p className={styles.quickQuestionsTitle}>
                Попробуйте спросить:
              </p>
              {quickQuestions.map((question, idx) => (
                <button
                  key={idx}
                  className={styles.quickQuestionBtn}
                  onClick={() => setInput(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage
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
          ))
        )}

        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageAvatar}>🤖</div>
            <div className={styles.messageContent}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.chatInputContainer}>
        {isLoading && (
          <button className={styles.stopButton} onClick={() => stop()}>
            ⏹️ Остановить
          </button>
        )}

        <form onSubmit={handleSubmit} className={styles.chatForm}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Напишите сообщение..."
            className={styles.chatInput}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={styles.sendButton}
          >
            {isLoading ? "⏳" : "📤"}
          </button>
        </form>
      </div>
    </div>
  );
}
