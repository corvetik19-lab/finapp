"use client";

import { useState, useRef, useEffect } from "react";
import QuickCommands from "@/components/chat/QuickCommands";
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
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Устанавливаем статус подключения при загрузке
  useEffect(() => {
    // По умолчанию считаем что соединение есть
    // Ошибку покажем только если реальный запрос не удастся
    setConnectionStatus("connected");
  }, []);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    console.log("Отправка сообщения:", input);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Сначала проверяем, является ли это командой
      const commandCheck = await fetch("/api/chat/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInput, execute: true }),
      });

      if (commandCheck.ok) {
        const commandData = await commandCheck.json();
        
        // Если команда распознана с хорошей уверенностью и выполнена
        if (
          commandData.executed &&
          commandData.parsed.confidence >= 70 &&
          commandData.result.success
        ) {
          // Добавляем результат команды как ответ ассистента
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: commandData.result.message,
            },
          ]);
          setIsLoading(false);
          return;
        }
      }

      // Если команда не распознана или не выполнена, отправляем в обычный AI чат
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
      setConnectionStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ошибка при отправке сообщения"
      );
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "❌ Извините, произошла ошибка. Проверьте подключение и попробуйте ещё раз.",
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

  const getStatusBadge = () => {
    if (connectionStatus === "checking") {
      return <span className={styles.statusChecking}>🔄 Подключение...</span>;
    }
    if (connectionStatus === "error") {
      return <span className={styles.statusError}>❌ Ошибка соединения</span>;
    }
    if (isLoading) {
      return <span className={styles.statusLoading}>💬 Печатает...</span>;
    }
    return <span className={styles.statusConnected}>✅ Подключено</span>;
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>🤖</div>
          <div>
            <h2 className={styles.headerTitle}>Финансовый помощник</h2>
            <p className={styles.headerSubtitle}>{getStatusBadge()}</p>
          </div>
        </div>
      </div>

      <div className={styles.chatMessages}>
        {messages.length === 0 && (
          <>
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
            
            <QuickCommands onCommandSelect={setInput} />
          </>
        )}
        
        {messages.length > 0 && (
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

        {connectionStatus === "error" && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorContent}>
              <h3 className={styles.errorTitle}>Ошибка подключения к AI</h3>
              <p className={styles.errorText}>{errorMessage}</p>
              <div className={styles.errorHelp}>
                <p><strong>Возможные причины:</strong></p>
                <ul>
                  <li>OpenAI API ключ не настроен в Vercel</li>
                  <li>Проблемы с интернет-соединением</li>
                  <li>API ключ недействителен или исчерпан лимит</li>
                </ul>
                <p><strong>Как исправить:</strong></p>
                <ol>
                  <li>Проверьте переменную окружения <code>OPENAI_API_KEY</code> в Vercel</li>
                  <li>Убедитесь что у API ключа есть баланс</li>
                  <li>Попробуйте перезагрузить страницу</li>
                </ol>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className={styles.retryButton}
              >
                🔄 Попробовать снова
              </button>
            </div>
          </div>
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
