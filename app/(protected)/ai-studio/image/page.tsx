"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

interface ReferenceImage {
  base64: string;
  mimeType: string;
  preview: string;
}

export default function AIImagePage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [model, setModel] = useState("gemini-3-pro-image-preview");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [mode, setMode] = useState<"generate" | "edit" | "upscale">("generate");
  const [resolution, setResolution] = useState("1024");
  const [editInstructions, setEditInstructions] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ReferenceImage[] = [];
    
    for (let i = 0; i < Math.min(files.length, 14 - referenceImages.length); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const base64 = await fileToBase64(file);
      newImages.push({
        base64: base64.split(",")[1], // Remove data:... prefix
        mimeType: file.type,
        preview: base64,
      });
    }

    setReferenceImages((prev) => [...prev, ...newImages].slice(0, 14));
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

  const removeReference = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (mode === "generate" && !prompt.trim()) return;
    if ((mode === "edit" || mode === "upscale") && referenceImages.length === 0) {
      setError("Загрузите изображение для редактирования");
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setGeneratedImage(null);
    setError(null);

    try {
      const res = await fetch("/api/ai-studio/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspectRatio,
          mode,
          resolution,
          editInstructions: editInstructions.trim(),
          referenceImages,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (err) {
      console.error("Image generation error:", err);
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">image</span>
          Генерация изображений
        </h1>
        <p>Nano Banana Pro — генерация и редактирование изображений до 4K</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          <div className={styles.preview}>
            {generatedImage ? (
              <img src={generatedImage} alt="Generated" className={styles.generatedImage} />
            ) : isGenerating ? (
              <div className={styles.generating}>
                <div className={styles.spinner}></div>
                <p>Генерация изображения...</p>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className="material-icons">add_photo_alternate</span>
                <p>Изображение появится здесь</p>
              </div>
            )}
          </div>

          <div className={styles.info}>
            <span className="material-icons">info</span>
            <p>
              <strong>Возможности:</strong> генерация изображений, редактирование с референсами (до 14 изображений), 
              увеличение до 4K разрешения.
            </p>
          </div>
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.controls}>
          {/* Режим работы */}
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${mode === "generate" ? styles.active : ""}`}
              onClick={() => setMode("generate")}
            >
              <span className="material-icons">add_photo_alternate</span>
              Генерация
            </button>
            <button
              className={`${styles.modeButton} ${mode === "edit" ? styles.active : ""}`}
              onClick={() => setMode("edit")}
            >
              <span className="material-icons">edit</span>
              Редактирование
            </button>
            <button
              className={`${styles.modeButton} ${mode === "upscale" ? styles.active : ""}`}
              onClick={() => setMode("upscale")}
            >
              <span className="material-icons">zoom_in</span>
              Увеличение (4K)
            </button>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.setting}>
              <label>Модель</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="gemini-3-pro-image-preview">🧠 Gemini 3 Pro Image</option>
                <option value="gemini-2.5-flash-image">⚡ Gemini 2.5 Flash Image</option>
              </select>
            </div>

            <div className={styles.setting}>
              <label>Соотношение сторон</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9 (Широкий)</option>
                <option value="9:16">9:16 (Вертикальный)</option>
                <option value="1:1">1:1 (Квадрат)</option>
                <option value="4:3">4:3 (Стандартный)</option>
              </select>
            </div>

            {mode === "upscale" && (
              <div className={styles.setting}>
                <label>Разрешение</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option value="1024">1024px (HD)</option>
                  <option value="2048">2048px (2K)</option>
                  <option value="4096">4096px (4K)</option>
                </select>
              </div>
            )}
          </div>

          {/* Референсные изображения */}
          {(mode === "edit" || mode === "upscale" || referenceImages.length > 0) && (
            <div className={styles.referenceSection}>
              <label>
                Референсные изображения ({referenceImages.length}/14)
              </label>
              <div className={styles.referenceGrid}>
                {referenceImages.map((img, i) => (
                  <div key={i} className={styles.referenceItem}>
                    <img src={img.preview} alt={`Reference ${i + 1}`} />
                    <button
                      className={styles.removeButton}
                      onClick={() => removeReference(i)}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                ))}
                {referenceImages.length < 14 && (
                  <button
                    className={styles.addReference}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="material-icons">add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          )}

          {mode === "edit" && (
            <div className={styles.promptSection}>
              <label>Инструкции для редактирования</label>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Опишите, как нужно изменить изображение..."
                rows={2}
              />
            </div>
          )}

          <div className={styles.promptSection}>
            <label>
              {mode === "generate" ? "Описание изображения" : "Дополнительное описание (опционально)"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "generate"
                  ? "Опишите изображение, которое хотите создать..."
                  : "Дополнительные детали..."
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

          <button
            onClick={handleGenerate}
            disabled={
              (mode === "generate" && !prompt.trim()) ||
              ((mode === "edit" || mode === "upscale") && referenceImages.length === 0) ||
              isGenerating
            }
            className={styles.generateButton}
          >
            <span className="material-icons">auto_awesome</span>
            {isGenerating
              ? "Обработка..."
              : mode === "generate"
                ? "Создать изображение"
                : mode === "edit"
                  ? "Редактировать"
                  : "Увеличить до " + resolution + "px"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
