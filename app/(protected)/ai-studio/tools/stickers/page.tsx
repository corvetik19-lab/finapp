"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Download, AlertCircle } from "lucide-react";
import { IMAGE_MODELS, KieModel } from "@/lib/kie";
import styles from "../live-photos/page.module.css";

// Модели text-to-image для стикеров
const STICKER_MODELS = IMAGE_MODELS.filter(m => m.type === "text-to-image").slice(0, 5);

interface TaskStatus {
  taskId: string;
  state: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

export default function StickersPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<KieModel>(STICKER_MODELS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kie/task-status?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Ошибка получения статуса");

      setTaskStatus(data);

      if (data.isProcessing) {
        setTimeout(() => pollTaskStatus(taskId), 3000);
      } else if (data.isSuccess && data.resultUrls?.length > 0) {
        setResult(data.resultUrls[0]);
        setIsGenerating(false);
      } else if (data.isFailed) {
        setError(data.errorMessage || "Ошибка генерации");
        setIsGenerating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsGenerating(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setTaskStatus(null);

    try {
      // Добавляем "стикер" в промпт для лучшего результата
      const stickerPrompt = `Sticker design, cartoon style, transparent background: ${prompt.trim()}`;
      
      const response = await fetch("/api/kie/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel.id,
          input: {
            prompt: stickerPrompt,
            aspect_ratio: "1:1",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка создания задачи");
      
      pollTaskStatus(data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `sticker-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>Стикеры</h1>
          <p className={styles.subtitle}>Kie.ai • Генерация стикеров и иллюстраций</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Создать</button>
        <button className={styles.tab}>История</button>
      </div>

      <div className={styles.content}>
        {/* Model Selection */}
        <div className={styles.modelSection}>
          <label className={styles.label}>Модель</label>
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = STICKER_MODELS.find(m => m.id === e.target.value);
              if (model) setSelectedModel(model);
            }}
            className={styles.select}
          >
            {STICKER_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.icon} {model.nameRu}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.promptSection}>
          <label className={styles.promptLabel}>Опишите стикер</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: милый котёнок с большими глазами в стиле Pixar..."
            className={styles.promptInput}
            rows={3}
          />
        </div>

        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{taskStatus?.state === 'generating' ? 'Генерация...' : 'Ожидание...'}</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span>Создать стикер</span>
            </>
          )}
        </button>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: '#fef2f2', borderRadius: 8, color: '#dc2626' }}>
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Результат</h3>
              <button className={styles.downloadButton} onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Скачать PNG
              </button>
            </div>
            <div style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', borderRadius: 8, overflow: 'hidden' }}>
              <img src={result} alt="Стикер" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            </div>
          </div>
        )}

        <div className={styles.infoBox}>
          <p>
            <strong>Kie.ai</strong> создаёт стикеры и иллюстрации.
            Доступны модели: Imagen4, Flux, Ideogram, Seedream.
          </p>
        </div>
      </div>
    </div>
  );
}
