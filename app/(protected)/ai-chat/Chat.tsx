"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Chat.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = "";

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: assistantContent }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Извините, произошла ошибка. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
