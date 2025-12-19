"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  Check,
  Send,
  Square,
  Sparkles,
  Settings2,
  History,
  Plus,
  MessageCircle,
  Trash2,
  MoreVertical,
  CheckSquare,
  X,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatMessage from "./components/ChatMessage";
import TypingIndicator from "./components/TypingIndicator";
import EmptyState from "./components/EmptyState";
import {
  getChatMessagesAction,
  createChatAction,
  saveMessageAction,
  updateChatTitleAction,
} from "./actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  is_free: boolean;
  description?: string;
}

type ModelGroups = {
  recommended: AIModel[];
  all: AIModel[];
};

type ModelGroupKey = Exclude<keyof ModelGroups, "all">;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [models, setModels] = useState<ModelGroups>({
    recommended: [],
    all: [],
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [chats, setChats] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Загрузка истории чатов
  useEffect(() => {
    async function loadChats() {
      try {
        const { getChatsAction } = await import("./actions");
        const data = await getChatsAction();
        setChats(data);
      } catch {
        // Ignore
      }
    }
    loadChats();
  }, [refreshKey]);

  // Загрузка моделей
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/ai/models");
        if (res.ok) {
          const data = await res.json();
          const allModels: AIModel[] = data.models || [];
          
          // Все модели - только Gemini 3 Pro и 2.5 Flash
          setModels({
            recommended: allModels,
            all: allModels,
          });
        }
      } catch {
        // Ignore errors
      }
    }
    loadModels();
  }, []);

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Автореsize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Создание нового чата
  const handleNewChat = async () => {
    try {
      const chatId = await createChatAction(selectedModel);
      if (chatId) {
        setCurrentChatId(chatId);
        setMessages([]);
        setRefreshKey((prev) => prev + 1);
      }
    } catch {
      // Ignore
    }
  };

  // Выбор чата
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
      const loadedMessages: Message[] = history.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
      setMessages(loadedMessages);
    } catch {
      // Ignore
    }
  };

  // Остановка генерации
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  // Отправка сообщения
  const handleSubmit = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    // Создаем чат если нужно
    let chatId = currentChatId;
    if (!chatId) {
      try {
        chatId = await createChatAction(selectedModel);
        if (!chatId) return;
        setCurrentChatId(chatId);
        setRefreshKey((prev) => prev + 1);
      } catch {
        setIsLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Сохраняем сообщение пользователя
    await saveMessageAction(chatId, "user", text);

    // Обновляем название чата
    if (messages.length === 0) {
      const title = text.length > 50 ? text.substring(0, 50) + "..." : text;
      await updateChatTitleAction(chatId, title);
      setRefreshKey((prev) => prev + 1);
    }

    try {
      // Проверяем команду
      const commandResponse = await fetch("/api/chat/execute-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text }),
      });

      if (commandResponse.ok) {
        const commandResult = await commandResponse.json();

        if (commandResult.success) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: commandResult.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          await saveMessageAction(chatId, "assistant", commandResult.message);
          setIsLoading(false);
          return;
        }

        if (!commandResult.isUnknown) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: commandResult.message || "Ошибка при выполнении команды",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          await saveMessageAction(chatId, "assistant", assistantMessage.content);
          setIsLoading(false);
          return;
        }
      }

      // AI запрос
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Создаем сообщение AI
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      setIsStreaming(true);

      // Читаем поток
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedText }
                  : msg
              )
            );
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // User stopped generation
          } else {
            throw error;
          }
        }

        // Сохраняем ответ
        if (accumulatedText && chatId) {
          await saveMessageAction(chatId, "assistant", accumulatedText);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Произошла ошибка при обработке запроса. Попробуйте еще раз.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Обработка Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Регенерация последнего ответа
  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    
    // Находим последнее сообщение пользователя
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) return;

    // Удаляем последний ответ AI
    setMessages((prev) => prev.slice(0, -1));
    
    // Повторяем запрос
    await handleSubmit(lastUserMessage.content);
  };

  // Фильтрация моделей
  const filterModels = (modelList: AIModel[]) => {
    if (!modelSearchQuery.trim()) return modelList;
    const query = modelSearchQuery.toLowerCase();
    return modelList.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query)
    );
  };

  const modelGroupConfig: Array<{
    key: ModelGroupKey;
    title: string;
    badge?: string;
  }> = [
    { key: "recommended", title: "🌟 Доступные модели" },
  ];

  const filteredModelGroups = modelGroupConfig.map((group) => ({
    ...group,
    models: filterModels(models[group.key]),
  }));

  const currentModelName = models.all.find((m) => m.id === selectedModel)?.name || selectedModel;

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-zinc-950 relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 border-b flex items-center justify-between px-4 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">AI Ассистент</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Новый</span>
            </Button>
            <Button
              variant={showHistory ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1.5"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">История</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModelSelector(true)}
              disabled={isLoading}
              className="gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden md:inline">{currentModelName}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState onSendMessage={handleSubmit} />
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
                  onRegenerate={
                    index === messages.length - 1 && message.role === "assistant"
                      ? handleRegenerate
                      : undefined
                  }
                />
              ))}
              {isLoading && !isStreaming && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-white dark:bg-zinc-950 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение... (Shift+Enter для новой строки)"
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-3"
                rows={1}
              />
              
              {isLoading ? (
                <Button
                  onClick={handleStop}
                  size="icon"
                  variant="destructive"
                  className="shrink-0 rounded-xl h-10 w-10"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit()}
                  size="icon"
                  disabled={!input.trim()}
                  className="shrink-0 rounded-xl h-10 w-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-2">
              AI может ошибаться. Проверяйте важную информацию.
            </p>
          </div>
        </div>
      </div>

      {/* History Panel - Sheet */}
      <Sheet open={showHistory} onOpenChange={(open) => {
        setShowHistory(open);
        if (!open) {
          setSelectionMode(false);
          setSelectedChats(new Set());
        }
      }}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col !bg-white dark:!bg-zinc-950" hideCloseButton>
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className="text-base">
                    {selectionMode ? `Выбрано: ${selectedChats.size}` : "История чатов"}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">{chats.length} чатов</p>
                </div>
              </div>
              {chats.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectionMode) {
                      setSelectionMode(false);
                      setSelectedChats(new Set());
                    } else {
                      setSelectionMode(true);
                    }
                  }}
                  className="h-8 px-2"
                >
                  {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </SheetHeader>
          
          {/* Action buttons */}
          <div className="p-3 border-b flex gap-2">
            {selectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedChats.size === chats.length) {
                      setSelectedChats(new Set());
                    } else {
                      setSelectedChats(new Set(chats.map(c => c.id)));
                    }
                  }}
                  className="flex-1"
                >
                  {selectedChats.size === chats.length ? "Снять всё" : "Выбрать всё"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedChats.size === 0}
                  onClick={async () => {
                    if (selectedChats.size === 0) return;
                    if (!confirm(`Удалить ${selectedChats.size} чат(ов)?`)) return;
                    
                    const { deleteChatAction } = await import("./actions");
                    for (const chatId of selectedChats) {
                      await deleteChatAction(chatId);
                      if (chatId === currentChatId) {
                        setCurrentChatId(null);
                        setMessages([]);
                      }
                    }
                    setSelectedChats(new Set());
                    setSelectionMode(false);
                    setRefreshKey(prev => prev + 1);
                  }}
                  className="flex-1 gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить ({selectedChats.size})
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => { handleNewChat(); setShowHistory(false); }} 
                className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Plus className="h-4 w-4" />
                Новый чат
              </Button>
            )}
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">Нет чатов</p>
                <p className="text-xs mt-1">Начните новый разговор</p>
              </div>
            ) : (
              <div className="p-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted mb-1",
                      chat.id === currentChatId && !selectionMode && "bg-muted ring-1 ring-emerald-500/20",
                      selectionMode && selectedChats.has(chat.id) && "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30"
                    )}
                    onClick={() => {
                      if (selectionMode) {
                        const newSelected = new Set(selectedChats);
                        if (newSelected.has(chat.id)) {
                          newSelected.delete(chat.id);
                        } else {
                          newSelected.add(chat.id);
                        }
                        setSelectedChats(newSelected);
                      } else {
                        handleSelectChat(chat.id);
                        setShowHistory(false);
                      }
                    }}
                  >
                    {selectionMode ? (
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2 transition-colors",
                        selectedChats.has(chat.id)
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-muted-foreground/30 text-transparent"
                      )}>
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        chat.id === currentChatId 
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white" 
                          : "bg-muted-foreground/10 text-muted-foreground"
                      )}>
                        <MessageCircle className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (editingTitle.trim()) {
                                const { updateChatTitleAction } = await import("./actions");
                                await updateChatTitleAction(chat.id, editingTitle.trim());
                                setRefreshKey(prev => prev + 1);
                              }
                              setEditingChatId(null);
                            } else if (e.key === "Escape") {
                              setEditingChatId(null);
                            }
                          }}
                          onBlur={async () => {
                            if (editingTitle.trim() && editingTitle !== chat.title) {
                              const { updateChatTitleAction } = await import("./actions");
                              await updateChatTitleAction(chat.id, editingTitle.trim());
                              setRefreshKey(prev => prev + 1);
                            }
                            setEditingChatId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full text-sm font-medium bg-transparent border-b border-emerald-500 outline-none py-0.5"
                        />
                      ) : (
                        <div className="text-sm font-medium truncate">{chat.title}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{formatDate(chat.updated_at)}</div>
                    </div>
                    {!selectionMode && editingChatId !== chat.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditingTitle(chat.title);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Переименовать
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm("Удалить этот чат?")) {
                                const { deleteChatAction } = await import("./actions");
                                await deleteChatAction(chat.id);
                                if (chat.id === currentChatId) {
                                  setCurrentChatId(null);
                                  setMessages([]);
                                }
                                setRefreshKey(prev => prev + 1);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Model Selector Sheet */}
      <Sheet open={showModelSelector} onOpenChange={setShowModelSelector}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col !bg-white dark:!bg-zinc-950">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <Settings2 className="w-4 h-4" />
              </div>
              <SheetTitle>Выбор модели Gemini</SheetTitle>
            </div>
          </SheetHeader>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск моделей..."
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-180px)] px-4 pb-4">
            {filteredModelGroups.map(
              (group) =>
                group.models.length > 0 && (
                  <div key={group.key} className="mb-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      {group.title}
                      <Badge variant="outline">{group.models.length}</Badge>
                    </h3>
                    {group.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelSelector(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-md hover:bg-muted flex items-center justify-between transition-colors",
                          selectedModel === model.id && "bg-muted"
                        )}
                      >
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {model.name}
                            {model.is_free && (
                              <Badge variant="secondary" className="text-xs">
                                FREE
                              </Badge>
                            )}
                          </div>
                          {model.description && (
                            <div className="text-xs text-muted-foreground">
                              {model.description}
                            </div>
                          )}
                        </div>
                        {selectedModel === model.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
