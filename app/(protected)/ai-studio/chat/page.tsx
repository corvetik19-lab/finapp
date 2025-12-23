"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Plus, ThumbsUp, ThumbsDown, Copy, Share2, Check, Sparkles, Square, Brain, ChevronDown, ChevronRight, History, Trash2, Pencil, X, MessageCircle } from "lucide-react";
import Link from "next/link";
import ModelSelector from "../components/ModelSelector";
import ChatInput from "../components/ChatInput";
import styles from "./page.module.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: Array<{ title: string; url: string }>;
  imageUrl?: string;
  isStreaming?: boolean;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gemini-2.0-flash");
  const [thinkingLevel] = useState<"minimal" | "low" | "medium" | "high">("medium");
  const [enableSearch, setEnableSearch] = useState(true);
  const [enableUrlContext, setEnableUrlContext] = useState(true);
  const [enableCodeExecution, setEnableCodeExecution] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentThinking, setCurrentThinking] = useState("");
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({});
  
  // История чатов
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThinking]);

  // Загрузка истории чатов
  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch("/api/ai-studio/chats");
        if (response.ok) {
          const chats = await response.json();
          setChatHistory(
            chats.map((chat: { id: string; title: string | null; updated_at: string }) => ({
              id: chat.id,
              title: chat.title || "Новый чат",
              date: new Date(chat.updated_at).toLocaleDateString("ru-RU"),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
      }
    };
    loadChats();
  }, []);

  // Удаление чата
  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/ai-studio/chats/${chatId}`, { method: "DELETE" });
      if (response.ok) {
        setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  // Массовое удаление чатов
  const deleteSelectedChats = async () => {
    const chatIds = Array.from(selectedChats);
    try {
      await Promise.all(
        chatIds.map((id) => fetch(`/api/ai-studio/chats/${id}`, { method: "DELETE" }))
      );
      setChatHistory((prev) => prev.filter((c) => !selectedChats.has(c.id)));
      setSelectedChats(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error("Failed to delete chats:", error);
    }
  };

  // Выбор/снятие выбора чата
  const toggleChatSelection = (chatId: string) => {
    setSelectedChats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  // Выбрать все / снять все
  const toggleSelectAll = () => {
    if (selectedChats.size === chatHistory.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(chatHistory.map((c) => c.id)));
    }
  };

  // Переименование чата
  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/ai-studio/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (response.ok) {
        setChatHistory((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
    setEditingChatId(null);
    setEditingTitle("");
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setCurrentThinking("");
      
      // Помечаем последнее сообщение как завершённое
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.isStreaming) {
          updated[updated.length - 1] = { ...lastMsg, isStreaming: false };
        }
        return updated;
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentThinking("");

    // Создаём чат если это первое сообщение
    let chatId = currentChatId;
    if (!chatId) {
      try {
        const chatRes = await fetch("/api/ai-studio/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: userMessage.content.slice(0, 50),
            model 
          }),
        });
        if (chatRes.ok) {
          const newChat = await chatRes.json();
          chatId = newChat.id;
          setCurrentChatId(chatId);
          // Добавляем в историю
          setChatHistory((prev) => [{
            id: newChat.id,
            title: newChat.title || userMessage.content.slice(0, 50),
            date: new Date().toLocaleDateString("ru-RU"),
          }, ...prev]);
        }
      } catch (e) {
        console.error("Failed to create chat:", e);
      }
    }

    // Создаём новый AbortController для этого запроса
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai-studio/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model,
          config: {
            thinkingLevel,
            enableSearch,
            enableCodeExecution,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error("Ошибка API");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let content = "";
      let thinking = "";
      let sources: Array<{ title: string; url: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "thinking") {
                thinking += data.text;
                setCurrentThinking(thinking);
              } else if (data.type === "text") {
                content += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = updated.findIndex((m) => m.id === assistantMessageId);
                  if (idx !== -1) {
                    updated[idx] = { ...updated[idx], content };
                  }
                  return updated;
                });
              } else if (data.type === "sources") {
                sources = data.sources;
              } else if (data.type === "done") {
                // Финализируем сообщение
                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = updated.findIndex((m) => m.id === assistantMessageId);
                  if (idx !== -1) {
                    updated[idx] = {
                      ...updated[idx],
                      content,
                      thinking: thinking || undefined,
                      sources: sources.length > 0 ? sources : undefined,
                      isStreaming: false,
                    };
                  }
                  return updated;
                });
                setCurrentThinking("");
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // Игнорируем ошибки парсинга отдельных чанков
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Пользователь остановил генерацию
        return;
      }
      console.error("Chat error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === assistantMessageId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            content: "Произошла ошибка при обработке запроса. Попробуйте ещё раз.",
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setCurrentThinking("");
      abortControllerRef.current = null;
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setCurrentChatId(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getModelName = (modelId: string) => {
    const names: Record<string, string> = {
      "gemini-3-flash-preview": "Gemini 3 Flash",
      "gemini-3-pro-preview": "Gemini 3 Pro",
      "gemini-2.5-pro": "Gemini 2.5 Pro",
      "gemini-2.5-flash": "Gemini 2.5 Flash",
      "gemini-2.5-flash-lite-preview": "Gemini 2.5 Flash-Lite",
    };
    return names[modelId] || modelId;
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^[*-]\s+/gm, "• ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim();
      })
      .split("\n")
      .map((line, i) => (
        <span key={i}>
          {line}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      ));
  };

  return (
    <div className={styles.container}>
      {/* History Panel */}
      {showHistory && (
        <div className={styles.historyOverlay} onClick={() => { setShowHistory(false); setSelectMode(false); setSelectedChats(new Set()); }}>
          <div className={styles.historyPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyHeader}>
              <h3><History size={18} /> История чатов</h3>
              <div className={styles.historyHeaderActions}>
                {chatHistory.length > 0 && (
                  <button 
                    onClick={() => { setSelectMode(!selectMode); setSelectedChats(new Set()); }} 
                    className={selectMode ? styles.selectModeActive : ""}
                    title={selectMode ? "Отменить выбор" : "Выбрать несколько"}
                  >
                    {selectMode ? <X size={16} /> : <Check size={16} />}
                  </button>
                )}
                <button onClick={() => { setShowHistory(false); setSelectMode(false); setSelectedChats(new Set()); }}><X size={18} /></button>
              </div>
            </div>
            
            {/* Панель массовых действий */}
            {selectMode && (
              <div className={styles.bulkActions}>
                <label className={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    checked={selectedChats.size === chatHistory.length && chatHistory.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span>Выбрать все ({selectedChats.size}/{chatHistory.length})</span>
                </label>
                {selectedChats.size > 0 && (
                  <button className={styles.bulkDeleteBtn} onClick={deleteSelectedChats}>
                    <Trash2 size={14} />
                    <span>Удалить ({selectedChats.size})</span>
                  </button>
                )}
              </div>
            )}

            <div className={styles.historyList}>
              {chatHistory.length === 0 ? (
                <div className={styles.historyEmpty}>
                  <MessageCircle size={24} />
                  <p>Нет сохранённых чатов</p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div key={chat.id} className={`${styles.historyItem} ${selectedChats.has(chat.id) ? styles.selected : ""}`}>
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedChats.has(chat.id)}
                        onChange={() => toggleChatSelection(chat.id)}
                        className={styles.chatCheckbox}
                      />
                    )}
                    {editingChatId === chat.id ? (
                      <div className={styles.historyEditRow}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameChat(chat.id, editingTitle);
                            if (e.key === "Escape") { setEditingChatId(null); setEditingTitle(""); }
                          }}
                          autoFocus
                        />
                        <button onClick={() => renameChat(chat.id, editingTitle)}><Check size={14} /></button>
                        <button onClick={() => { setEditingChatId(null); setEditingTitle(""); }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        {selectMode ? (
                          <div className={styles.historyLink} onClick={() => toggleChatSelection(chat.id)}>
                            <span className={styles.historyTitle}>{chat.title}</span>
                            <span className={styles.historyDate}>{chat.date}</span>
                          </div>
                        ) : (
                          <Link href={`/ai-studio/chat/${chat.id}`} className={styles.historyLink} onClick={() => setShowHistory(false)}>
                            <span className={styles.historyTitle}>{chat.title}</span>
                            <span className={styles.historyDate}>{chat.date}</span>
                          </Link>
                        )}
                        {!selectMode && (
                          <div className={styles.historyActions}>
                            <button onClick={() => { setEditingChatId(chat.id); setEditingTitle(chat.title); }} title="Переименовать">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteChat(chat.id)} title="Удалить" className={styles.deleteBtn}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.newChatBtn} onClick={handleNewChat} title="Новый чат">
          <Plus size={18} />
        </button>
        <ModelSelector value={model} onChange={setModel} />
        <button className={styles.historyBtn} onClick={() => setShowHistory(true)} title="История чатов">
          <History size={18} />
          {chatHistory.length > 0 && <span className={styles.historyBadge}>{chatHistory.length}</span>}
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Sparkles size={48} />
            </div>
            <h2>Gemini AI Чат</h2>
            <p>Начните диалог с ИИ. Задайте любой вопрос или попросите помощь.</p>
            <div className={styles.suggestions}>
              <button onClick={() => setInput("Объясни квантовую запутанность простыми словами")}>
                Объясни квантовую запутанность
              </button>
              <button onClick={() => setInput("Напиши Python код для сортировки списка")}>
                Напиши Python код
              </button>
              <button onClick={() => setInput("Какие последние новости о SpaceX?")}>
                Новости SpaceX
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message) => (
              <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
                <div className={styles.avatar}>
                  {message.role === "user" ? (
                    <span className={styles.userInitial}>В</span>
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <div className={styles.messageContent}>
                  {/* Thinking section */}
                  {message.thinking && (
                    <div className={styles.thinkingSection}>
                      <button 
                        className={styles.thinkingToggle}
                        onClick={() => setShowThinking(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                      >
                        <Brain size={14} />
                        <span>Процесс мышления</span>
                        {showThinking[message.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {showThinking[message.id] && (
                        <div className={styles.thinkingContent}>
                          {message.thinking}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live thinking while streaming */}
                  {message.isStreaming && currentThinking && (
                    <div className={styles.thinkingSection}>
                      <div className={styles.thinkingToggle}>
                        <Brain size={14} className={styles.thinkingPulse} />
                        <span>Думаю...</span>
                      </div>
                      <div className={styles.thinkingContent}>
                        {currentThinking}
                      </div>
                    </div>
                  )}

                  {message.imageUrl && (
                    <div className={styles.imageContainer}>
                      <Image src={message.imageUrl} alt="Сгенерированное изображение" className={styles.generatedImage} width={512} height={512} unoptimized />
                    </div>
                  )}
                  
                  <div className={styles.messageText}>
                    {message.role === "assistant" ? (
                      <>
                        {formatMessage(message.content)}
                        {message.isStreaming && <span className={styles.cursor}>▌</span>}
                      </>
                    ) : message.content}
                  </div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className={styles.sources}>
                      <span className={styles.sourcesLabel}>Источники:</span>
                      {message.sources.map((source, i) => (
                        <a key={i} href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.title}
                        </a>
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" && !message.isStreaming && (
                    <div className={styles.messageActions}>
                      <button title="Нравится">
                        <ThumbsUp size={14} />
                      </button>
                      <button title="Не нравится">
                        <ThumbsDown size={14} />
                      </button>
                      <button 
                        title="Копировать" 
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Stop generation button */}
            {isLoading && (
              <div className={styles.stopContainer}>
                <button className={styles.stopBtn} onClick={stopGeneration}>
                  <Square size={14} />
                  <span>Остановить генерацию</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {messages.length > 0 && (
          <button className={styles.shareBtn}>
            <span>Поделиться</span>
            <Share2 size={14} />
          </button>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        enableSearch={enableSearch}
        enableUrlContext={enableUrlContext}
        enableCodeExecution={enableCodeExecution}
        onToggleSearch={() => setEnableSearch(!enableSearch)}
        onToggleUrlContext={() => setEnableUrlContext(!enableUrlContext)}
        onToggleCodeExecution={() => setEnableCodeExecution(!enableCodeExecution)}
        onVoiceInput={() => {}}
      />

      {/* Footer info */}
      <div className={styles.footer}>
        <span>Context = бесплатно, Output = по тарифу</span>
      </div>
    </div>
  );
}
