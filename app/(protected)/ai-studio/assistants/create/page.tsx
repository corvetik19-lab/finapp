"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import styles from "./page.module.css";

const MODELS = [
  { id: "gemini-3-pro", name: "Gemini 3 Pro", description: "Самая мощная модель" },
];

const COLORS = [
  "#ff6b35", "#f59e0b", "#10b981", "#3b82f6", 
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
];

const EMOJIS = [
  "🤖", "💼", "📊", "✍️", "🎨", "💻", "📚", "🔬",
  "⚖️", "🎯", "🧠", "💡", "🚀", "🌍", "🔮", "⭐",
];

export default function CreateAssistantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_prompt: "",
    model: "gemini-3-pro",
    color: "#ff6b35",
    emoji: "🤖",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.system_prompt.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-studio/assistants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create assistant");
      }

      const assistant = await response.json();
      router.push(`/ai-studio/assistants/${assistant.id}`);
    } catch (error) {
      console.error("Error creating assistant:", error);
      alert("Ошибка при создании ассистента");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/assistants" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className={styles.title}>Создать ассистента</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Preview */}
        <div className={styles.preview}>
          <div 
            className={styles.previewAvatar} 
            style={{ background: formData.color }}
          >
            <span>{formData.emoji}</span>
          </div>
          <h2 className={styles.previewName}>
            {formData.name || "Название ассистента"}
          </h2>
          <p className={styles.previewDescription}>
            {formData.description || "Описание ассистента"}
          </p>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>Название *</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Например: Помощник по маркетингу"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={50}
            required
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.label}>Описание</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Краткое описание возможностей"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={100}
          />
        </div>

        {/* System Prompt */}
        <div className={styles.field}>
          <label className={styles.label}>Системный промпт *</label>
          <textarea
            className={styles.textarea}
            placeholder="Опишите роль, поведение и специализацию ассистента..."
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            rows={6}
            required
          />
          <p className={styles.hint}>
            Определяет характер и специализацию ассистента. Чем детальнее промпт, тем лучше результат.
          </p>
        </div>

        {/* Model */}
        <div className={styles.field}>
          <label className={styles.label}>Модель</label>
          <div className={styles.models}>
            {MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`${styles.modelOption} ${formData.model === model.id ? styles.selected : ""}`}
                onClick={() => setFormData({ ...formData, model: model.id })}
              >
                <span className={styles.modelName}>{model.name}</span>
                <span className={styles.modelDesc}>{model.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className={styles.field}>
          <label className={styles.label}>Цвет</label>
          <div className={styles.colors}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorOption} ${formData.color === color ? styles.selected : ""}`}
                style={{ background: color }}
                onClick={() => setFormData({ ...formData, color })}
              />
            ))}
          </div>
        </div>

        {/* Emoji */}
        <div className={styles.field}>
          <label className={styles.label}>Иконка</label>
          <div className={styles.emojis}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`${styles.emojiOption} ${formData.emoji === emoji ? styles.selected : ""}`}
                onClick={() => setFormData({ ...formData, emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || !formData.name.trim() || !formData.system_prompt.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Создать ассистента
            </>
          )}
        </button>
      </form>
    </div>
  );
}
