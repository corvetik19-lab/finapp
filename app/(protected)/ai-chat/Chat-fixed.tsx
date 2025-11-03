"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./Chat.module.css";
import ChatSidebar from "./ChatSidebar";
import {
  getChatMessagesAction,
  createChatAction,
  saveMessageAction,
  updateChatTitleAction,
} from "./actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIModel {
  id: string;
  name: string;
  is_free: boolean;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [models, setModels] = useState<{ recommended: AIModel[]; free: AIModel[]; all: AIModel[] }>({ 
    recommended: [], 
    free: [],
    all: []
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Создание нового чата
  const handleNewChat = async () => {
    try {
      const chatId = await createChatAction(selectedModel);
      if (chatId) {
        setCurrentChatId(chatId);
        setMessages([]);
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Загружаем список моделей при загрузке
  useEffect(() => {
    async function initialize() {
      try {
        const res = await fetch("/api/ai/models");
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        }
        setConnectionStatus("connected");
      } catch (error) {
        console.error("Failed to initialize:", error);
        setConnectionStatus("error");
      }
    }
    initialize();
  }, []);

  // Переключение на другой чат
  const handleSelectChat = async (chatId: string | null) => {
    if (chatId === currentChatId) return;

    if (chatId === null) {
      setCurrentChatId(null);
      setMessages([]);
      return;
    }

    try {
      setCurrentChatId(chatId);
      const history = await getChatMessagesAction(chatId);
      const loadedMessages: ChatMessage[] = history.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработчик отправки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Создаем чат если нужно
    let chatId = currentChatId;
    if (!chatId) {
      try {
        chatId = await createChatAction(selectedModel);
        if (!chatId) return;
        setCurrentChatId(chatId);
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error("Failed to create chat:", error);
        return;
      }
    }

    const currentInput = input;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    await saveMessageAction(chatId, "user", currentInput);

    // Обновляем название чата
    if (messages.length === 0) {
      const title = currentInput.length > 50 
        ? currentInput.substring(0, 50) + "..." 
        : currentInput;
      await updateChatTitleAction(chatId, title);
      setRefreshKey(prev => prev + 1);
    }

    try {
      // Отправляем запрос к AI
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Создаем временное сообщение для AI
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      // Читаем потоковый ответ
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Парсим строки с данными (format: 0:"text"\n)
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              // Извлекаем текст из формата 0:"..."
              const match = line.match(/^0:"(.*)"/);
              if (match) {
                const text = match[1]
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                accumulatedText += text;
              }
            }
          }

          // Обновляем сообщение
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }

        // Сохраняем ответ AI в БД
        if (accumulatedText && chatId) {
          await saveMessageAction(chatId, "assistant", accumulatedText);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setConnectionStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Ошибка при отправке сообщения"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        refreshKey={refreshKey}
      />

      <div className={styles.chatArea}>
        {/* Header */}
        <div className={styles.header}>
          <h2>ChatGPT</h2>
          <button
            className={styles.modelButton}
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={isLoading}
          >
            {selectedModel.split("/")[1] || selectedModel}
          </button>
        </div>

        {/* Model Selector */}
        {showModelSelector && (
          <div className={styles.modelSelector}>
            <h3>Рекомендуемые модели</h3>
            {models.recommended.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                className={selectedModel === model.id ? styles.selected : ""}
              >
                {model.name} {model.is_free && "🆓"}
              </button>
            ))}
            <h3>Бесплатные модели</h3>
            {models.free.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                className={selectedModel === model.id ? styles.selected : ""}
              >
                {model.name}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcomeMessage}>
              <div className={styles.welcomeIcon}>💬</div>
              <h3>Привет! Я ваш финансовый помощник</h3>
              <p>
                Я могу помочь вам с анализом расходов, планированием бюджета и
                ответить на вопросы о ваших финансах.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                <div className={styles.messageIcon}>
                  {message.role === "user" ? "👤" : "🤖"}
                </div>
                <div className={styles.messageContent}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          {connectionStatus === "error" && errorMessage && (
            <div className={styles.errorMessage}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorContent}>
                <h3>Ошибка подключения к AI</h3>
                <p>&quot;{errorMessage}&quot;</p>
                <div className={styles.errorHelp}>
                  <p>
                    <strong>Возможные причины:</strong>
                  </p>
                  <ul>
                    <li>OpenAI API ключ не настроен</li>
                    <li>Проблемы с интернет-соединением</li>
                    <li>API ключ недействителен или исчерпан лимит</li>
                  </ul>
                  <p>
                    <strong>Как исправить:</strong>
                  </p>
                  <ul>
                    <li>
                      Проверьте переменную окружения{" "}
                      <code>OPENAI_API_KEY</code> в .env.local
                    </li>
                    <li>
                      Убедитесь что API ключ действителен на
                      https://platform.openai.com/api-keys
                    </li>
                    <li>Попробуйте перезагрузить страницу</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setConnectionStatus("checking");
                    setErrorMessage("");
                    window.location.reload();
                  }}
                  className={styles.retryButton}
                >
                  🔄 Попробовать снова
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className={styles.inputForm} onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Сообщение ChatGPT"
            disabled={isLoading}
            className={styles.input}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={styles.sendButton}
          >
            {isLoading ? "⏳" : "↑"}
          </button>
        </form>
      </div>
    </div>
  );
}
