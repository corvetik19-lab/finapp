"use client";

import { useRef, useEffect } from "react";
import { Send, Paperclip, Mic, Globe, Link, Code, MessageSquare } from "lucide-react";
import styles from "./ChatInput.module.css";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  showFeatures?: boolean;
  enableSearch?: boolean;
  enableUrlContext?: boolean;
  enableCodeExecution?: boolean;
  onToggleSearch?: () => void;
  onToggleUrlContext?: () => void;
  onToggleCodeExecution?: () => void;
  onAttachFile?: () => void;
  onVoiceInput?: () => void;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Отправить сообщение",
  showFeatures = true,
  enableSearch = false,
  enableUrlContext = false,
  enableCodeExecution = false,
  onToggleSearch,
  onToggleUrlContext,
  onToggleCodeExecution,
  onAttachFile,
  onVoiceInput,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        {showFeatures && (
          <div className={styles.features}>
            {onAttachFile && (
              <button
                className={styles.featureBtn}
                onClick={onAttachFile}
                title="Прикрепить файл"
              >
                <Paperclip size={18} />
              </button>
            )}
            {onToggleSearch && (
              <button
                className={`${styles.featureBtn} ${enableSearch ? styles.active : ""}`}
                onClick={onToggleSearch}
                title="Поиск в интернете"
              >
                <Globe size={18} />
              </button>
            )}
            {onToggleUrlContext && (
              <button
                className={`${styles.featureBtn} ${enableUrlContext ? styles.active : ""}`}
                onClick={onToggleUrlContext}
                title="Анализ URL"
              >
                <Link size={18} />
              </button>
            )}
            {onToggleCodeExecution && (
              <button
                className={`${styles.featureBtn} ${enableCodeExecution ? styles.active : ""}`}
                onClick={onToggleCodeExecution}
                title="Выполнение кода"
              >
                <Code size={18} />
              </button>
            )}
          </div>
        )}

        <div className={styles.textareaWrapper}>
          <MessageSquare className={styles.geminiIcon} />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={styles.textarea}
            rows={1}
            disabled={isLoading}
          />
        </div>

        <div className={styles.actions}>
          {onVoiceInput && (
            <button
              className={styles.voiceBtn}
              onClick={onVoiceInput}
              title="Голосовой ввод"
            >
              <Mic size={18} />
            </button>
          )}
          <button
            className={styles.sendBtn}
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
