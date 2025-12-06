"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Loader2, RefreshCw } from "lucide-react";
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
    <div className="flex h-full">
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        refreshKey={refreshKey}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">ChatGPT</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
            disabled={isLoading}
          >
            {selectedModel.split("/")[1] || selectedModel}
          </Button>
        </div>

        {/* Model Selector */}
        {showModelSelector && (
          <div className="absolute right-4 top-16 z-50 bg-card border rounded-lg shadow-lg p-4 w-64">
            <h3 className="font-medium mb-2">Рекомендуемые модели</h3>
            {models.recommended.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm hover:bg-muted",
                  selectedModel === model.id && "bg-primary text-primary-foreground"
                )}
              >
                {model.name} {model.is_free && "🆓"}
              </button>
            ))}
            <h3 className="font-medium mb-2 mt-4">Бесплатные модели</h3>
            {models.free.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm hover:bg-muted",
                  selectedModel === model.id && "bg-primary text-primary-foreground"
                )}
              >
                {model.name}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold">Привет! Я ваш финансовый помощник</h3>
              <p className="text-muted-foreground max-w-md">
                Я могу помочь вам с анализом расходов, планированием бюджета и
                ответить на вопросы о ваших финансах.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  message.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className="text-2xl">
                  {message.role === "user" ? "👤" : "🤖"}
                </div>
                <div className={cn(
                  "rounded-lg p-3",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))
          )}
          {connectionStatus === "error" && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-red-800">Ошибка подключения к AI</h3>
                  <p className="text-red-700">&quot;{errorMessage}&quot;</p>
                  <div className="text-sm text-red-700 space-y-2">
                    <p><strong>Возможные причины:</strong></p>
                    <ul className="list-disc list-inside">
                      <li>OpenAI API ключ не настроен</li>
                      <li>Проблемы с интернет-соединением</li>
                      <li>API ключ недействителен или исчерпан лимит</li>
                    </ul>
                    <p><strong>Как исправить:</strong></p>
                    <ul className="list-disc list-inside">
                      <li>Проверьте переменную окружения <code className="bg-red-100 px-1 rounded">OPENAI_API_KEY</code> в .env.local</li>
                      <li>Убедитесь что API ключ действителен на https://platform.openai.com/api-keys</li>
                      <li>Попробуйте перезагрузить страницу</li>
                    </ul>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConnectionStatus("checking");
                      setErrorMessage("");
                      window.location.reload();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Попробовать снова
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="p-4 border-t flex gap-2" onSubmit={handleSubmit}>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Сообщение ChatGPT"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
