"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Check, RotateCcw, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  isStreaming = false,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "group flex gap-3 py-4 px-4 transition-colors",
        role === "user" ? "bg-transparent" : "bg-muted/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
          role === "user"
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        )}
      >
        {role === "user" ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {role === "user" ? "Вы" : "AI Ассистент"}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTime(timestamp)}
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {role === "assistant" ? (
            <div className="ai-message">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className={cn(
                          "block p-3 rounded-lg bg-zinc-900 text-zinc-100 text-sm font-mono overflow-x-auto",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="my-2 overflow-x-auto">
                      <table className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 bg-muted font-medium text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2">{children}</td>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          ) : (
            <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>

        {/* Actions */}
        {role === "assistant" && content && !isStreaming && (
          <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Копировать
                </>
              )}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onRegenerate}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Повторить
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
