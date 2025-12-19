"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

interface ReferenceImage {
  base64: string;
  mimeType: string;
  preview: string;
}

interface GenerationResult {
  operationId: string;
  status: string;
  message: string;
  description?: string;
  estimatedTime?: number;
}

export default function AIVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [model, setModel] = useState("veo-3.1-generate-preview");
  const [mode, setMode] = useState<"text" | "image" | "extend">("text");
  const [duration, setDuration] = useState(8);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const base64 = await fileToBase64(file);
    setReferenceImage({
      base64: base64.split(",")[1],
      mimeType: file.type,
      preview: base64,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (mode === "text" && !prompt.trim()) return;
    if ((mode === "image" || mode === "extend") && !referenceImage) {
      setError("Загрузите изображение");
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);
    setResult(null);
    setError(null);

    // Симуляция прогресса
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 90));
    }, 500);

    try {
      const res = await fetch("/api/ai-studio/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          mode,
          duration,
          aspectRatio,
          resolution,
          generateAudio,
          referenceImage,
        }),
      });

      clearInterval(interval);

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }

      setProgress(100);
      setResult(data);
      
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      }
    } catch (err) {
      console.error("Video generation error:", err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      clearInterval(interval);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">movie</span>
          Генерация видео
        </h1>
        <p>Veo 3.1 — генерация видео с нативным аудио</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          <div className={styles.preview}>
            {videoUrl ? (
              <video src={videoUrl} controls className={styles.video} />
            ) : isGenerating ? (
              <div className={styles.generating}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p>Генерация видео... {progress}%</p>
                <span className={styles.hint}>Это может занять несколько минут</span>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className="material-icons">videocam</span>
                <p>Видео появится здесь</p>
              </div>
            )}
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className="material-icons">movie</span>
              <div>
                <strong>Текст → Видео</strong>
                <p>Генерация видео по описанию</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className="material-icons">image</span>
              <div>
                <strong>Фото → Видео</strong>
                <p>Анимация изображения</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className="material-icons">add_circle</span>
              <div>
                <strong>Продление</strong>
                <p>Продолжить видео</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className="material-icons">volume_up</span>
              <div>
                <strong>Нативное аудио</strong>
                <p>Генерация звука для видео</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.controls}>
          {/* Режим работы */}
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${mode === "text" ? styles.active : ""}`}
              onClick={() => setMode("text")}
            >
              <span className="material-icons">text_fields</span>
              Текст → Видео
            </button>
            <button
              className={`${styles.modeButton} ${mode === "image" ? styles.active : ""}`}
              onClick={() => setMode("image")}
            >
              <span className="material-icons">image</span>
              Фото → Видео
            </button>
            <button
              className={`${styles.modeButton} ${mode === "extend" ? styles.active : ""}`}
              onClick={() => setMode("extend")}
            >
              <span className="material-icons">add_circle</span>
              Продлить
            </button>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.setting}>
              <label>Модель</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="veo-3.1-generate-preview">🎬 Veo 3.1</option>
                <option value="veo-3.1-fast-generate-001">⚡ Veo 3.1 Быстрая</option>
                <option value="veo-3.0-generate-001">📦 Veo 3.0</option>
                <option value="veo-2.0-generate-001">🔹 Veo 2.0</option>
              </select>
            </div>

            <div className={styles.setting}>
              <label>Длительность</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={4}>4 секунды</option>
                <option value={6}>6 секунд</option>
                <option value={8}>8 секунд</option>
              </select>
            </div>

            <div className={styles.setting}>
              <label>Формат</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9 Широкий</option>
                <option value="9:16">9:16 Вертикальный</option>
              </select>
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.setting}>
              <label>Разрешение</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
              </select>
            </div>

            <div className={styles.setting}>
              <label>Аудио</label>
              <select value={generateAudio ? "on" : "off"} onChange={(e) => setGenerateAudio(e.target.value === "on")}>
                <option value="on">🔊 Со звуком</option>
                <option value="off">🔇 Без звука</option>
              </select>
            </div>
          </div>

          {/* Референсное изображение */}
          {(mode === "image" || mode === "extend") && (
            <div className={styles.referenceSection}>
              <label>Исходное изображение</label>
              {referenceImage ? (
                <div className={styles.referencePreview}>
                  <img src={referenceImage.preview} alt="Reference" />
                  <button
                    className={styles.removeButton}
                    onClick={() => setReferenceImage(null)}
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>
              ) : (
                <button
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-icons">upload</span>
                  Загрузить изображение
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          )}

          <div className={styles.promptSection}>
            <label>
              {mode === "text" ? "Описание видео" : "Дополнительные инструкции (опционально)"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "text"
                  ? "Опишите видео, которое хотите создать..."
                  : mode === "image"
                    ? "Как анимировать изображение..."
                    : "Как продолжить видео..."
              }
              rows={4}
            />
          </div>

          {error && (
            <div className={styles.error}>
              <span className="material-icons">error</span>
              {error}
            </div>
          )}

          {result && !videoUrl && (
            <div className={styles.resultInfo}>
              <span className="material-icons">info</span>
              <div>
                <strong>{result.message}</strong>
                {result.description && <p>{result.description}</p>}
                {result.estimatedTime && (
                  <span className={styles.estimatedTime}>
                    Примерное время: {result.estimatedTime}с
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={
              (mode === "text" && !prompt.trim()) ||
              ((mode === "image" || mode === "extend") && !referenceImage) ||
              isGenerating
            }
            className={styles.generateButton}
          >
            <span className="material-icons">movie_creation</span>
            {isGenerating
              ? `Генерация... ${progress}%`
              : mode === "extend"
                ? "Продлить видео"
                : "Создать видео"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
