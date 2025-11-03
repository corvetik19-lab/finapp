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
import { getQuickCommands } from "@/lib/ai/commands";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIModel {
  id: string;
  name: string;
  is_free: boolean;
  description?: string;
}

type ModelGroups = {
  recommended: AIModel[];
  free: AIModel[];
  gpt5: AIModel[];
  gpt41: AIModel[];
  gpt4o: AIModel[];
  reasoning: AIModel[];
  realtime: AIModel[];
  audio: AIModel[];
  specialized: AIModel[];
  gpt4: AIModel[];
  other: AIModel[];
  all: AIModel[];
};

type ModelGroupKey = Exclude<keyof ModelGroups, "all">;

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [models, setModels] = useState<ModelGroups>({
    recommended: [],
    free: [],
    gpt5: [],
    gpt41: [],
    gpt4o: [],
    reasoning: [],
    realtime: [],
    audio: [],
    specialized: [],
    gpt4: [],
    other: [],
    all: [],
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

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

  // Монтирование компонента и загрузка состояния из localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('aiChatSidebarCollapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Загружаем список моделей при загрузке
  useEffect(() => {
    async function initialize() {
      try {
        const res = await fetch("/api/ai/models");
        if (res.ok) {
          const data = (await res.json()) as Partial<ModelGroups>;
          setModels({
            recommended: data.recommended ?? [],
            free: data.free ?? [],
            gpt5: data.gpt5 ?? [],
            gpt41: data.gpt41 ?? [],
            gpt4o: data.gpt4o ?? [],
            reasoning: data.reasoning ?? [],
            realtime: data.realtime ?? [],
            audio: data.audio ?? [],
            specialized: data.specialized ?? [],
            gpt4: data.gpt4 ?? [],
            other: data.other ?? [],
            all: data.all ?? [],
          });
        }
        setConnectionStatus("connected");
      } catch (error) {
        console.error("Failed to initialize:", error);
        setConnectionStatus("error");
      }
    }
    initialize();
  }, []);

  // Сохраняем состояние сворачивания в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiChatSidebarCollapsed', String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed]);

  // Закрываем селектор моделей при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    }

    if (showModelSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showModelSelector]);

  // Фильтрация моделей по поисковому запросу
  const filterModels = (modelList: AIModel[]) => {
    if (!modelSearchQuery.trim()) return modelList;

    const query = modelSearchQuery.toLowerCase();
    return modelList.filter(model => 
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    );
  };

  const modelGroupConfig: Array<{
    key: ModelGroupKey;
    title: string;
    badge?: { text: string; className: string };
  }> = [
    {
      key: "recommended",
      title: "🌟 Рекомендуемые",
      badge: { text: "TOP", className: styles.badgeRecommended },
    },
    {
      key: "gpt5",
      title: "🚀 GPT-5 серия",
      badge: { text: "NEW", className: styles.badgeRecommended },
    },
    {
      key: "gpt41",
      title: "🎯 GPT-4.1 серия",
    },
    {
      key: "gpt4o",
      title: "⚡ GPT-4o серия",
    },
    {
      key: "reasoning",
      title: "🧠 Reasoning модели",
      badge: { text: "PRO", className: styles.badgePremium },
    },
    {
      key: "realtime",
      title: "🎙️ Realtime модели",
      badge: { text: "VOICE", className: styles.badgePremium },
    },
    {
      key: "audio",
      title: "🔊 Audio модели",
    },
    {
      key: "specialized",
      title: "🛠️ Специализированные",
    },
    {
      key: "gpt4",
      title: "📚 GPT-4 классика",
    },
    {
      key: "other",
      title: "💼 Другие модели",
    },
    {
      key: "free",
      title: "🆓 Бесплатные",
    },
  ];

  const filteredModelGroups = modelGroupConfig.map((group) => ({
    ...group,
    models: filterModels(models[group.key]),
  }));

  const hasFilteredResults = filteredModelGroups.some((group) => group.models.length > 0);

  // Форматирование ответа ассистента без markdown-звёздочек
  const parseAssistantMessage = (content: string) => {
    const cleaned = content
      .replace(/\*\*/g, "")
      .replace(/^[-•]\s*/gm, "")
      .trim();

    const lines = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const items: { icon: string; title: string; description: string }[] = [];
    const paragraphs: string[] = [];

    const isIcon = (value: string) => {
      if (!value) return false;
      const icon = Array.from(value)[0];
      if (!icon) return false;
      const codePoint = icon.codePointAt(0);
      if (!codePoint) return false;
      return (
        (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) ||
        (codePoint >= 0x1fa70 && codePoint <= 0x1faff) ||
        (codePoint >= 0x2600 && codePoint <= 0x26ff) ||
        (codePoint >= 0x2700 && codePoint <= 0x27bf) ||
        icon === "•"
      );
    };

    lines.forEach((line) => {
      const structuredMatch = line.match(/^(\S+)\s+([^:]+):\s*(.+)$/);
      if (structuredMatch) {
        const iconCandidate = Array.from(structuredMatch[1])[0] || "";
        if (isIcon(iconCandidate)) {
          items.push({
            icon: iconCandidate,
            title: structuredMatch[2].trim(),
            description: structuredMatch[3].trim(),
          });
          return;
        }
      }

      const iconMatch = line.match(/^(\S+)\s+(.+)$/);
      if (iconMatch) {
        const iconCandidate = Array.from(iconMatch[1])[0] || "";
        if (isIcon(iconCandidate)) {
          items.push({
            icon: iconCandidate,
            title: iconMatch[2].trim(),
            description: "",
          });
          return;
        }
      }

      paragraphs.push(line);
    });

    return { items, paragraphs };
  };

  const renderAssistantMessage = (content: string) => {
    const { items, paragraphs } = parseAssistantMessage(content);

    if (!items.length && !paragraphs.length) {
      return <p>{content}</p>;
    }

    return (
      <div className={styles.assistantMessageWrapper}>
        {paragraphs.map((text, index) => (
          <p key={`paragraph-${index}`}>{text}</p>
        ))}
        {items.length > 0 && (
          <div className={styles.assistantList}>
            {items.map((item, index) => (
              <div className={styles.assistantListItem} key={`item-${index}`}>
                <div className={styles.assistantListIcon}>{item.icon}</div>
                <div className={styles.assistantListContent}>
                  <div className={styles.assistantListTitle}>{item.title}</div>
                  {item.description && (
                    <div className={styles.assistantListDescription}>{item.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
      // НОВОЕ: Проверяем, является ли это командой
      const commandResponse = await fetch("/api/chat/execute-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: currentInput }),
      });

      if (commandResponse.ok) {
        const commandResult = await commandResponse.json();
        
        // Если команда успешно выполнена
        if (commandResult.success) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: commandResult.message,
          };
          
          setMessages((prev) => [...prev, assistantMessage]);
          await saveMessageAction(chatId, "assistant", commandResult.message);
          setIsLoading(false);
          return; // Завершаем, не отправляя в AI
        }
        
        // Если команда не распознана (isUnknown), продолжаем в AI
        if (!commandResult.isUnknown) {
          // Команда распознана но произошла ошибка
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: commandResult.message || "Ошибка при выполнении команды",
          };
          
          setMessages((prev) => [...prev, assistantMessage]);
          await saveMessageAction(chatId, "assistant", assistantMessage.content);
          setIsLoading(false);
          return;
        }
      }

      // Если команда не распознана или произошла ошибка - отправляем запрос к AI
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
          accumulatedText += chunk;

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
      {isMounted && (
        <ChatSidebar
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          refreshKey={refreshKey}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      <div className={styles.chatArea}>
        {/* Header */}
        <div className={styles.header}>
          <h2>ChatGPT</h2>
          <button
            className={styles.modelButton}
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={isLoading}
          >
            <span>{selectedModel.split("/")[1] || selectedModel}</span>
            <span className={styles.totalModelsCount}>
              {models.all.length}
            </span>
            <span style={{ marginLeft: '6px', fontSize: '12px' }}>
              {showModelSelector ? '▲' : '▼'}
            </span>
          </button>
        </div>

        {/* Model Selector */}
        {showModelSelector && (
          <div className={styles.modelSelector} ref={modelSelectorRef}>
            {/* Поиск */}
            <div className={styles.modelSearch}>
              <input
                type="text"
                placeholder="🔍 Поиск моделей..."
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                className={styles.modelSearchInput}
              />
              {modelSearchQuery && (
                <button
                  className={styles.clearSearchBtn}
                  onClick={() => setModelSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {filteredModelGroups.map((group) => {
              if (group.models.length === 0) {
                return null;
              }

              return (
                <section key={group.key}>
                  <h3>
                    {group.title}
                    <span className={styles.modelCount}>{group.models.length}</span>
                  </h3>
                  {group.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                      className={selectedModel === model.id ? styles.selected : ""}
                    >
                      <div className={styles.modelInfo}>
                        <div className={styles.modelName}>
                          {model.name}
                          {model.is_free && (
                            <span className={`${styles.modelBadge} ${styles.badgeFree}`}>
                              FREE
                            </span>
                          )}
                          {group.badge && (
                            <span className={`${styles.modelBadge} ${group.badge.className}`}>
                              {group.badge.text}
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <div className={styles.modelDescription}>{model.description}</div>
                        )}
                      </div>
                      {selectedModel === model.id && <span>✓</span>}
                    </button>
                  ))}
                </section>
              );
            })}

            {/* Сообщение если ничего не найдено */}
            {modelSearchQuery && !hasFilteredResults && (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <div className={styles.noResultsText}>
                  Модели не найдены
                </div>
                <div className={styles.noResultsHint}>
                  Попробуйте изменить запрос
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcomeMessage}>
              <div className={styles.welcomeIcon}>💬</div>
              <h3>Привет! Я ваш финансовый помощник</h3>
              <p>
                Я могу помочь вам управлять финансами прямо через чат. Просто напишите что хотите сделать!
              </p>
              
              <div className={styles.commandsGrid}>
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>📁 Категории</div>
                  <div className={styles.commandExample}>
                    &quot;Создай категорию расходов Транспорт&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>💰 Транзакции</div>
                  <div className={styles.commandExample}>
                    &quot;Потратил 500 рублей на Еду&quot;
                  </div>
                  <div className={styles.commandExample}>
                    &quot;Покажи мои траты&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>💳 Счета</div>
                  <div className={styles.commandExample}>
                    &quot;Добавь счёт Сбербанк&quot;
                  </div>
                  <div className={styles.commandExample}>
                    &quot;Сколько денег на счетах?&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>📊 Бюджеты</div>
                  <div className={styles.commandExample}>
                    &quot;Поставь бюджет 10000 на Еду&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>📝 Заметки</div>
                  <div className={styles.commandExample}>
                    &quot;Запомни что надо купить молоко&quot;
                  </div>
                  <div className={styles.commandExample}>
                    &quot;Покажи мои заметки&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>🎯 Планы</div>
                  <div className={styles.commandExample}>
                    &quot;Создай план накопить 100000 на отпуск&quot;
                  </div>
                  <div className={styles.commandExample}>
                    &quot;Покажи мои планы&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>🔖 Закладки</div>
                  <div className={styles.commandExample}>
                    &quot;Сохрани закладку на GitHub&quot;
                  </div>
                </div>
                
                <div className={styles.commandGroup}>
                  <div className={styles.commandGroupTitle}>💪 Фитнес</div>
                  <div className={styles.commandExample}>
                    &quot;Бегал 30 минут&quot;
                  </div>
                  <div className={styles.commandExample}>
                    &quot;Тренировка в зале 60 минут&quot;
                  </div>
                </div>
              </div>
              
              <p className={styles.helpText}>
                💡 Пишите естественным языком - я пойму!
              </p>
              
              {/* Быстрые команды */}
              <div className={styles.quickCommands}>
                <div className={styles.quickCommandsTitle}>⚡ Быстрые команды:</div>
                <div className={styles.quickCommandsGrid}>
                  {getQuickCommands().map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(cmd.command)}
                      className={styles.quickCommandButton}
                      type="button"
                    >
                      <span className={styles.quickCommandIcon}>{cmd.icon}</span>
                      <span className={styles.quickCommandLabel}>{cmd.label}</span>
                    </button>
                  ))}
                </div>
              </div>
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
                  {message.role === "assistant"
                    ? renderAssistantMessage(message.content)
                    : message.content}
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
