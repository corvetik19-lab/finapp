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

  // Загружаем список моделей при загрузке (БЕЗ автосоздания чата)
  useEffect(() => {
    async function initialize() {
      try {
        // Загружаем модели
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

    // Если null - сбрасываем выбор (все чаты удалены)
    if (chatId === null) {
      setCurrentChatId(null);
      setMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      setCurrentChatId(chatId);
      
      // Загружаем историю сообщений
      const history = await getChatMessagesAction(chatId);
      const loadedMessages: ChatMessage[] = history.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработчик отправки с проверкой команд и стримингом
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    // Если нет активного чата, создаем новый
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

    // Сохраняем сообщение пользователя в БД
    await saveMessageAction(chatId, "user", currentInput);

    // Обновляем название чата из первого сообщения
    if (messages.length === 0) {
      const title = currentInput.length > 50 
        ? currentInput.substring(0, 50) + "..." 
        : currentInput;
      await updateChatTitleAction(chatId, title);
      // Обновляем список чатов в боковой панели
      setRefreshKey(prev => prev + 1);
    }

    try {
      // Проверяем, является ли это командой
      const commandCheck = await fetch("/api/chat/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInput, execute: true }),
      });

      if (commandCheck.ok) {
        const commandData = await commandCheck.json();
        
        // Если команда выполнена успешно
        if (
          commandData.executed &&
          commandData.parsed.confidence >= 70 &&
          commandData.result.success
        ) {
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

      // Если не команда, используем обычный AI чат со стримингом
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
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
          accumulatedText += chunk;

          // Обновляем сообщение по мере получения данных
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }

        // Сохраняем ответ AI в БД после завершения стрима
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "❌ Извините, произошла ошибка. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatLayout}>
      {/* Боковая панель со списком чатов */}
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        refreshKey={refreshKey}
      />

      {/* Основная область чата */}
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.headerTitle}>ChatGPT</h2>
          </div>
          <div className={styles.modelSelector}>
          <button 
            className={styles.modelButton}
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={isLoading}
          >
            {models.all.find(m => m.id === selectedModel)?.name || 
                models.recommended.find(m => m.id === selectedModel)?.name || 
                models.free.find(m => m.id === selectedModel)?.name || 
                "GPT-4o-mini"}
          </button>
          {showModelSelector && (
            <div className={styles.modelDropdown}>
              <div className={styles.modelGroup}>
                <div className={styles.modelGroupTitle}>⭐ Рекомендованные</div>
                {models.recommended.map((model) => (
                  <button
                    key={model.id}
                    className={`${styles.modelOption} ${selectedModel === model.id ? styles.modelOptionActive : ''}`}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelSelector(false);
                    }}
                  >
                    <div className={styles.modelName}>
                      {model.name}
                      {model.is_free && <span className={styles.freeBadge}>FREE</span>}
                    </div>
                  </button>
                ))}
              </div>
              {models.free.length > 0 && (
                <div className={styles.modelGroup}>
                  <div className={styles.modelGroupTitle}>🆓 Бесплатные</div>
                  {models.free.map((model) => (
                    <button
                      key={model.id}
                      className={`${styles.modelOption} ${selectedModel === model.id ? styles.modelOptionActive : ''}`}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                    >
                      <div className={styles.modelName}>{model.name}</div>
                    </button>
                  ))}
                </div>
              )}
              {models.all.length > 0 && (
                <div className={styles.modelGroup}>
                  <div className={styles.modelGroupTitle}>📋 Все модели ({models.all.length})</div>
                  {models.all.map((model) => (
                    <button
                      key={model.id}
                      className={`${styles.modelOption} ${selectedModel === model.id ? styles.modelOptionActive : ''}`}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                    >
                      <div className={styles.modelName}>
                        {model.name}
                        {model.is_free && <span className={styles.freeBadge}>FREE</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Конец modelSelector */}
      </div>
      {/* Конец chatHeader */}

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
            </div>
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
                  <li>OpenRouter API ключ не настроен</li>
                  <li>Проблемы с интернет-соединением</li>
                  <li>API ключ недействителен или исчерпан лимит</li>
                </ul>
                <p><strong>Как исправить:</strong></p>
                <ol>
                  <li>Проверьте переменную окружения <code>OPENROUTER_API_KEY</code> в .env.local</li>
                  <li>Убедитесь что у API ключа есть баланс на https://openrouter.ai/</li>
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
        <div className={styles.inputWrapper}>
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Сообщение ChatGPT"
              className={styles.chatInput}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={styles.sendButton}
              aria-label="Отправить сообщение"
            >
              {isLoading ? "⏳" : "↑"}
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
