"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  Film, 
  Loader2, 
  Download, 
  AlertCircle,
  Upload,
  RefreshCw
} from "lucide-react";
import { VIDEO_MODELS, KieModel } from "@/lib/kie";
import styles from "../live-photos/page.module.css";

// Модели для видео генерации (Runway, Luma, Veo)
const VIDEO_GEN_MODELS = VIDEO_MODELS.filter(m => 
  m.id.startsWith("runway-") || 
  m.id.startsWith("luma-") || 
  m.id.startsWith("veo3-")
);

export default function VideoGenPage() {
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [selectedModel, setSelectedModel] = useState<KieModel>(VIDEO_GEN_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [duration, setDuration] = useState("5");
  const [quality, setQuality] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Введите описание видео");
      return;
    }

    const needsImage = selectedModel.type === "image-to-video";
    const needsVideo = selectedModel.type === "video-modify";

    if (needsImage && !imageFile) {
      setError("Загрузите изображение");
      return;
    }

    if (needsVideo && !videoFile) {
      setError("Загрузите видео для модификации");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      // Для демо - имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Заглушка для демо
      setResultUrl("https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `video-${selectedModel.id}-${Date.now()}.mp4`;
      a.click();
    }
  };

  const needsImage = selectedModel.type === "image-to-video";
  const needsVideo = selectedModel.type === "video-modify";
  const isRunway = selectedModel.id.startsWith("runway-");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className={styles.title}>Видео генератор</h1>
          <p className={styles.subtitle}>Kie.ai • Runway, Luma, Veo 3.1</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "create" ? styles.active : ""}`}
          onClick={() => setActiveTab("create")}
        >
          Создать
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
        >
          История
        </button>
      </div>

      {activeTab === "create" && (
        <div className={styles.content}>
          {/* Model Selection */}
          <div className={styles.modelSection}>
            <span className={styles.label}>Модель</span>
            <select
              className={styles.select}
              value={selectedModel.id}
              onChange={(e) => {
                const model = VIDEO_GEN_MODELS.find(m => m.id === e.target.value);
                if (model) {
                  setSelectedModel(model);
                  setImageFile(null);
                  setImagePreview(null);
                  setVideoFile(null);
                }
              }}
            >
              <optgroup label="Runway">
                {VIDEO_GEN_MODELS.filter(m => m.id.startsWith("runway-")).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.icon} {model.nameRu}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Luma">
                {VIDEO_GEN_MODELS.filter(m => m.id.startsWith("luma-")).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.icon} {model.nameRu}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Veo 3.1 (Google)">
                {VIDEO_GEN_MODELS.filter(m => m.id.startsWith("veo3-")).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.icon} {model.nameRu}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className={styles.modelDescription}>{selectedModel.descriptionRu}</p>
          </div>

          {/* Image Upload for I2V */}
          {needsImage && (
            <div className={styles.modelSection}>
              <span className={styles.label}>Изображение</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              {imagePreview ? (
                <div className={styles.previewArea}>
                  <Image src={imagePreview} alt="Preview" className={styles.previewImage} width={400} height={400} unoptimized />
                  <button
                    className={styles.changeButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={14} />
                    Заменить
                  </button>
                </div>
              ) : (
                <div 
                  className={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className={styles.uploadIcon} />
                  <p className={styles.uploadText}>Загрузите изображение</p>
                  <p className={styles.uploadHint}>PNG, JPG до 10MB</p>
                </div>
              )}
            </div>
          )}

          {/* Video Upload for Luma Modify */}
          {needsVideo && (
            <div className={styles.modelSection}>
              <span className={styles.label}>Видео для модификации</span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className={styles.fileInput}
              />
              <div 
                className={styles.uploadArea}
                onClick={() => videoInputRef.current?.click()}
              >
                {videoFile ? (
                  <div style={{ textAlign: "center" }}>
                    <Film size={32} style={{ marginBottom: 8, color: "#ff6b35" }} />
                    <p className={styles.uploadText}>{videoFile.name}</p>
                    <p className={styles.uploadHint}>Нажмите, чтобы заменить</p>
                  </div>
                ) : (
                  <>
                    <Film size={32} className={styles.uploadIcon} />
                    <p className={styles.uploadText}>Загрузите видео</p>
                    <p className={styles.uploadHint}>MP4, MOV до 100MB</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Prompt */}
          <div className={styles.promptSection}>
            <span className={styles.promptLabel}>
              {needsImage ? "Промпт анимации" : needsVideo ? "Промпт модификации" : "Описание видео"}
            </span>
            <textarea
              className={styles.promptInput}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                needsImage 
                  ? "Опишите движение персонажа..." 
                  : needsVideo 
                    ? "Опишите желаемые изменения в видео..."
                    : "Опишите видео с деталями движения, стиля, освещения..."
              }
              rows={3}
            />
          </div>

          {/* Runway options */}
          {isRunway && (
            <>
              <div className={styles.modelSection}>
                <span className={styles.label}>Длительность</span>
                <select
                  className={styles.select}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="5">5 секунд (720p/1080p)</option>
                  <option value="10">10 секунд (только 720p)</option>
                </select>
              </div>

              <div className={styles.modelSection}>
                <span className={styles.label}>Качество</span>
                <select
                  className={styles.select}
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={duration === "10"}
                >
                  <option value="720p">720p HD</option>
                  <option value="1080p" disabled={duration === "10"}>1080p Full HD</option>
                </select>
                {duration === "10" && (
                  <p className={styles.modelDescription}>10-секундные видео доступны только в 720p</p>
                )}
              </div>
            </>
          )}

          {/* Aspect Ratio */}
          <div className={styles.modelSection}>
            <span className={styles.label}>Соотношение сторон</span>
            <select
              className={styles.select}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              <option value="16:9">16:9 Широкий экран</option>
              <option value="9:16">9:16 Вертикальный</option>
              <option value="1:1">1:1 Квадрат</option>
              {isRunway && (
                <>
                  <option value="4:3">4:3 Традиционный</option>
                  <option value="3:4">3:4 Портрет</option>
                </>
              )}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.infoBox} style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
              <p style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Генерация видео...
              </>
            ) : (
              <>
                <Film size={18} />
                Создать видео
              </>
            )}
          </button>

          {/* Result */}
          {resultUrl && (
            <div className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <h3>Результат</h3>
                <button className={styles.downloadButton} onClick={handleDownload}>
                  <Download size={14} />
                  Скачать
                </button>
              </div>
              <div className={styles.videoContainer}>
                <video
                  src={resultUrl}
                  controls
                  className={styles.resultVideo}
                  autoPlay
                  loop
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className={styles.infoBox}>
            <p>
              <strong>Видео генератор</strong> объединяет лучшие модели:
              <br />• <strong>Runway</strong> — text-to-video и image-to-video с поддержкой 1080p
              <br />• <strong>Luma</strong> — модификация существующих видео с помощью ИИ
              <br />• <strong>Veo 3.1</strong> — высококачественная генерация видео от Google
            </p>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className={styles.content}>
          <div className={styles.infoBox}>
            <p>История генераций будет доступна после подключения к Kie.ai API</p>
          </div>
        </div>
      )}
    </div>
  );
}
