"use client";

import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 py-4 px-4 bg-muted/30">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <Bot className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">AI Ассистент</span>
        </div>

        {/* Typing dots */}
        <div className="flex items-center gap-1 py-2">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "1s" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "150ms", animationDuration: "1s" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "300ms", animationDuration: "1s" }}
            />
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Думаю...
          </span>
        </div>
      </div>
    </div>
  );
}
