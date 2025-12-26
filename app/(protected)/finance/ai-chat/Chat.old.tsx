"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu, Search, ChevronDown, ChevronUp, Check, RefreshCw, Send, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
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
  embeddings: AIModel[];
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
    embeddings: [],
    gpt4: [],
    other: [],
    all: [],
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // Монтирование компонента и загрузка состояния из localStorage
  useEffect(() => {
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
            embeddings: data.embeddings ?? [],
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
    badge?: string;
  }> = [
    { key: "recommended", title: "🌟 Рекомендуемые", badge: "TOP" },
    { key: "gpt5", title: "🚀 GPT-5 серия", badge: "NEW" },
    { key: "gpt41", title: "🎯 GPT-4.1 серия" },
    { key: "gpt4o", title: "⚡ GPT-4o серия" },
    { key: "reasoning", title: "🧠 Reasoning модели", badge: "PRO" },
    { key: "realtime", title: "🎙️ Realtime модели", badge: "VOICE" },
    { key: "audio", title: "🔊 Audio модели" },
    { key: "specialized", title: "🛠️ Специализированные" },
    { key: "embeddings", title: "🔍 Embeddings модели", badge: "VECTOR" },
    { key: "gpt4", title: "📚 GPT-4 классика" },
    { key: "other", title: "💼 Другие модели" },
    { key: "free", title: "🆓 Бесплатные" },
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
      <div className="space-y-3">
        {paragraphs.map((text, index) => (
          <p key={`paragraph-${index}`}>{text}</p>
        ))}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div className="flex items-start gap-3" key={`item-${index}`}>
                <div className="text-xl">{item.icon}</div>
                <div>
                  <div className="font-medium">{item.title}</div>
                  {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
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
    <div className="flex h-full">
      <ChatSidebar currentChatId={currentChatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} refreshKey={refreshKey} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(false)}><Menu className="h-5 w-5" /></Button>}
            <h2 className="font-semibold">ChatGPT</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowModelSelector(!showModelSelector)} disabled={isLoading}>
            {selectedModel.split("/")[1] || selectedModel} <Badge variant="secondary" className="ml-2">{models.all.length}</Badge> {showModelSelector ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        <Sheet open={showModelSelector} onOpenChange={setShowModelSelector}>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="p-4 border-b"><SheetTitle>Выбор модели</SheetTitle></SheetHeader>
            <div className="p-4"><div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск моделей..." value={modelSearchQuery} onChange={(e) => setModelSearchQuery(e.target.value)} className="pl-8" /></div></div>
            <div className="overflow-y-auto max-h-[calc(100vh-180px)] px-4 pb-4">
              {filteredModelGroups.map((group) => group.models.length === 0 ? null : (
                <div key={group.key} className="mb-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">{group.title} <Badge variant="outline">{group.models.length}</Badge></h3>
                  {group.models.map((model) => (
                    <button key={model.id} onClick={() => { setSelectedModel(model.id); setShowModelSelector(false); }} className={cn("w-full text-left p-2 rounded-md hover:bg-muted flex items-center justify-between", selectedModel === model.id && "bg-muted")}>
                      <div><div className="font-medium text-sm">{model.name} {model.is_free && <Badge variant="secondary" className="ml-1">FREE</Badge>} {group.badge && <Badge className="ml-1">{group.badge}</Badge>}</div>{model.description && <div className="text-xs text-muted-foreground">{model.description}</div>}</div>
                      {selectedModel === model.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              ))}
              {modelSearchQuery && !hasFilteredResults && <div className="text-center py-8 text-muted-foreground"><Search className="h-8 w-8 mx-auto" /><p className="mt-2">Модели не найдены</p></div>}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold mt-4">Привет! Я ваш финансовый помощник</h3>
              <p className="text-muted-foreground mt-2">Я могу помочь вам управлять финансами прямо через чат. Просто напишите что хотите сделать!</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[{t:"📁 Категории",e:"Создай категорию расходов"},{t:"💰 Транзакции",e:"Потратил 500р на Еду"},{t:"💳 Счета",e:"Добавь счёт Сбербанк"},{t:"📊 Бюджеты",e:"Поставь бюджет 10000"},{t:"📝 Заметки",e:"Запомни что надо..."},{t:"🎯 Планы",e:"Создай план накопить..."},{t:"🔖 Закладки",e:"Сохрани закладку"},{t:"💪 Фитнес",e:"Бегал 30 минут"}].map((c,i) => (
                  <Card key={i} className="text-left"><CardContent className="pt-4"><div className="text-sm font-medium">{c.t}</div><div className="text-xs text-muted-foreground mt-1">&quot;{c.e}&quot;</div></CardContent></Card>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-6">💡 Пишите естественным языком - я пойму!</p>
              <div className="mt-6"><p className="text-sm font-medium mb-3">⚡ Быстрые команды:</p><div className="flex flex-wrap gap-2 justify-center">{getQuickCommands().map((cmd, idx) => (<Button key={idx} variant="outline" size="sm" onClick={() => setInput(cmd.command)}>{cmd.icon} {cmd.label}</Button>))}</div></div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={cn("flex gap-3 mb-4", message.role === "user" && "flex-row-reverse")}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">{message.role === "user" ? "👤" : "🤖"}</div>
                <div className={cn("max-w-[80%] p-3 rounded-lg", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>{message.role === "assistant" ? renderAssistantMessage(message.content) : message.content}</div>
              </div>
            ))
          )}
          {connectionStatus === "error" && errorMessage && (
            <Card className="border-destructive"><CardContent className="pt-6"><div className="flex items-start gap-4"><AlertTriangle className="h-6 w-6 text-destructive shrink-0" /><div><h3 className="font-semibold">Ошибка подключения к AI</h3><p className="text-sm text-muted-foreground mt-1">{errorMessage}</p><div className="mt-4 text-sm"><p className="font-medium">Возможные причины:</p><ul className="list-disc pl-4 mt-1 text-muted-foreground"><li>OpenAI API ключ не настроен</li><li>Проблемы с интернет-соединением</li><li>API ключ недействителен</li></ul></div><Button className="mt-4" onClick={() => { setConnectionStatus("checking"); setErrorMessage(""); window.location.reload(); }}><RefreshCw className="h-4 w-4 mr-2" />Попробовать снова</Button></div></div></CardContent></Card>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="p-4 border-t flex gap-2" onSubmit={handleSubmit}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Сообщение ChatGPT" disabled={isLoading} className="flex-1" />
          <Button type="submit" disabled={isLoading || !input.trim()}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
      </div>
    </div>
  );
}
