"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Paperclip,
  RotateCcw,
  Copy,
  Check,
  Star,
  X,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import styles from "./page.module.css";

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  createdAt: Date;
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  emoji: string;
  model: string;
  color: string;
  system_prompt: string;
}

// Готовые ассистенты (хардкод для демо)
const defaultAssistants: Record<string, Assistant> = {
  lawyer: {
    id: "lawyer",
    name: "Юрист",
    description: "Консультации по правовым вопросам",
    emoji: "⚖️",
    model: "gemini-3-pro",
    color: "#6366f1",
    system_prompt: "Ты опытный юрист. Отвечай на вопросы о законодательстве, помогай анализировать договоры и документы.",
  },
  copywriter: {
    id: "copywriter",
    name: "Копирайтер",
    description: "Написание текстов, SEO-оптимизация",
    emoji: "✍️",
    model: "gemini-3-pro",
    color: "#f59e0b",
    system_prompt: "Ты профессиональный копирайтер. Пиши убедительные тексты, помогай с заголовками и структурой.",
  },
  marketer: {
    id: "marketer",
    name: "Маркетолог",
    description: "Маркетинговые стратегии, анализ рынка",
    emoji: "📈",
    model: "gemini-3-pro",
    color: "#10b981",
    system_prompt: "Ты эксперт в маркетинге. Помогай разрабатывать стратегии продвижения и анализировать рынок.",
  },
  translator: {
    id: "translator",
    name: "Переводчик",
    description: "Перевод текстов на 50+ языков",
    emoji: "🌍",
    model: "gemini-3-pro",
    color: "#3b82f6",
    system_prompt: "Ты профессиональный переводчик. Переводи тексты с сохранением смысла и стиля.",
  },
  analyst: {
    id: "analyst",
    name: "Аналитик",
    description: "Анализ данных, отчёты",
    emoji: "📊",
    model: "gemini-3-pro",
    color: "#8b5cf6",
    system_prompt: "Ты аналитик данных. Помогай интерпретировать данные и делать выводы.",
  },
  programmer: {
    id: "programmer",
    name: "Программист",
    description: "Код, отладка, архитектура",
    emoji: "💻",
    model: "gemini-3-pro",
    color: "#ec4899",
    system_prompt: "Ты опытный программист. Пиши чистый код, помогай с отладкой и архитектурными решениями.",
  },
};

export default function AssistantChatPage() {
  const params = useParams();
  const assistantId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assistant = defaultAssistants[assistantId] || {
    id: assistantId,
    name: "Ассистент",
    description: "",
    emoji: "🤖",
    model: "gemini-3-pro",
    color: "#ff6b35",
    system_prompt: "",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработка файлов
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: Attachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          url: reader.result as string,
          size: file.size,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Streaming отправка сообщения
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setIsStreaming(true);

    // Создаём placeholder для ответа ассистента
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/ai-studio/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: assistant.model,
          systemPrompt: assistant.system_prompt,
          config: {
            enableSearch: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }

              if (data.text) {
                fullContent += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }

              if (data.done) {
                break;
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Произошла ошибка при получении ответа. Попробуйте ещё раз." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className={styles.container} style={{ "--assistant-color": assistant.color } as React.CSSProperties}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/ai-studio/assistants" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className={styles.assistantInfo}>
          <div className={styles.avatar} style={{ background: assistant.color }}>
            <span>{assistant.emoji}</span>
          </div>
          <div>
            <h1 className={styles.title}>{assistant.name}</h1>
            <p className={styles.model}>{assistant.model}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton} onClick={clearChat} title="Очистить чат">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button className={styles.iconButton} title="В избранное">
            <Star className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyAvatar} style={{ background: assistant.color }}>
              <span>{assistant.emoji}</span>
            </div>
            <h2>Чат с {assistant.name}</h2>
            <p>{assistant.description}</p>
            <div className={styles.suggestions}>
              <button onClick={() => setInput("Привет! Расскажи, чем ты можешь помочь?")}>
                👋 Начать диалог
              </button>
              <button onClick={() => setInput("Какие задачи ты решаешь лучше всего?")}>
                🎯 Узнать возможности
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${styles[message.role]}`}
              >
                {message.role === "assistant" && (
                  <div className={styles.messageAvatar} style={{ background: assistant.color }}>
                    <span>{assistant.emoji}</span>
                  </div>
                )}
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>{message.content}</div>
                  {message.role === "assistant" && (
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageAvatar} style={{ background: assistant.color }}>
                  <span>{assistant.emoji}</span>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.typing}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form className={styles.inputContainer} onSubmit={handleSubmit}>
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className={styles.attachmentsPreview}>
            {attachments.map((att) => (
              <div key={att.id} className={styles.attachmentItem}>
                {att.type.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className={styles.attachmentName}>{att.name}</span>
                <button
                  type="button"
                  className={styles.removeAttachment}
                  onClick={() => removeAttachment(att.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.inputWrapper}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
          <button 
            type="button" 
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            className={styles.input}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
