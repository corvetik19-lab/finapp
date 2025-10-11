"use client";

import { useState } from "react";
import styles from "./Prompts.module.css";

type Prompt = {
  id: string;
  title: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  tags: string[];
  ai_model: string;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  last_used_at: string | null;
};

type Props = {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopy: (text: string, id: string) => void;
};

export default function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: Props) {
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(prompt.prompt_text, prompt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAiModelIcon = (model: string) => {
    switch (model) {
      case "ChatGPT":
        return "🤖";
      case "Claude":
        return "🧠";
      case "Gemini":
        return "✨";
      case "Midjourney":
        return "🎨";
      default:
        return "🌐";
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <h3>{prompt.title}</h3>
          <button
            onClick={() => onToggleFavorite(prompt.id, prompt.is_favorite)}
            className={styles.favoriteBtn}
            title={prompt.is_favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <span className="material-icons">
              {prompt.is_favorite ? "star" : "star_border"}
            </span>
          </button>
        </div>

        {prompt.description && (
          <p className={styles.cardDescription}>{prompt.description}</p>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={`${styles.promptText} ${showFullText ? styles.expanded : ""}`}>
          {prompt.prompt_text}
        </div>
        {prompt.prompt_text.length > 200 && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className={styles.toggleBtn}
          >
            {showFullText ? "Свернуть" : "Показать полностью"}
          </button>
        )}
      </div>

      <div className={styles.cardMeta}>
        <div className={styles.metaRow}>
          <span className={styles.badge}>
            {getAiModelIcon(prompt.ai_model)} {prompt.ai_model}
          </span>
          {prompt.category && (
            <span className={styles.badge}>{prompt.category}</span>
          )}
        </div>

        {prompt.tags.length > 0 && (
          <div className={styles.tags}>
            {prompt.tags.map((tag, i) => (
              <span key={i} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className={styles.stats}>
          <span className={styles.statItem}>
            <span className="material-icons">content_copy</span>
            {prompt.usage_count}
          </span>
          <span className={styles.statItem}>
            <span className="material-icons">schedule</span>
            {new Date(prompt.created_at).toLocaleDateString("ru-RU")}
          </span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button
          onClick={handleCopy}
          className={`${styles.actionBtn} ${styles.copyBtn}`}
          title="Скопировать промпт"
        >
          <span className="material-icons">
            {copied ? "check" : "content_copy"}
          </span>
          {copied ? "Скопировано!" : "Копировать"}
        </button>
        <button
          onClick={() => onEdit(prompt)}
          className={styles.actionBtn}
          title="Редактировать"
        >
          <span className="material-icons">edit</span>
        </button>
        <button
          onClick={() => onDelete(prompt.id)}
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          title="Удалить"
        >
          <span className="material-icons">delete</span>
        </button>
      </div>
    </div>
  );
}
