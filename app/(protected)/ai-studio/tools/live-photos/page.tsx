"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  Upload, 
  Video, 
  Loader2, 
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { VIDEO_MODELS, KieModel } from "@/lib/kie";
import styles from "./page.module.css";

// Модели image-to-video для оживления фото
const I2V_MODELS = VIDEO_MODELS.filter(m => m.type === "image-to-video");

interface TaskStatus {
  taskId: string;
  state: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

export default function LivePhotosPage() {
  const [image, setImage] = useState<string | null>(null);
  const [, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<KieModel>(I2V_MODELS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    setError(null);
    setVideoUrl(null);
    setTaskStatus(null);
    
    // Preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload to Kie.ai
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/kie/upload-file", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка загрузки");
      
      setImageUrl(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки файла");
    } finally {
      setIsUploading(false);
    }
  };

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kie/task-status?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Ошибка получения статуса");

      setTaskStatus(data);

      if (data.isProcessing) {
        setTimeout(() => pollTaskStatus(taskId), 5000);
      } else if (data.isSuccess && data.resultUrls?.length > 0) {
        setVideoUrl(data.resultUrls[0]);
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
    if (!imageUrl) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setTaskStatus(null);

    try {
      const response = await fetch("/api/kie/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel.id,
          input: {
            image_url: imageUrl,
            prompt: prompt.trim() || "Анимация изображения",
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
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `live-photo-${Date.now()}.mp4`;
    link.click();
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setImageUrl(null);
    setPrompt("");
    setVideoUrl(null);
    setTaskStatus(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>Оживление фото</h1>
          <p className={styles.subtitle}>Kie.ai • Превратите фото в видео с движением</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Создать</button>
        <button className={styles.tab}>История</button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Model Selection */}
        <div className={styles.modelSection}>
          <label className={styles.label}>Модель</label>
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = I2V_MODELS.find(m => m.id === e.target.value);
              if (model) setSelectedModel(model);
            }}
            className={styles.select}
          >
            {I2V_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.icon} {model.nameRu}
              </option>
            ))}
          </select>
          <p className={styles.modelDescription}>{selectedModel.descriptionRu}</p>
        </div>

        {/* Upload Area */}
        <div className={styles.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="image-upload"
          />
          
          {!image ? (
            <label htmlFor="image-upload" className={styles.uploadArea}>
              <Upload className={styles.uploadIcon} />
              <span className={styles.uploadText}>Загрузите изображение</span>
              <span className={styles.uploadHint}>или перетащите файл сюда</span>
            </label>
          ) : (
            <div className={styles.previewArea}>
              <Image src={image} alt="Preview" className={styles.previewImage} width={400} height={400} unoptimized />
              {isUploading && (
                <div className={styles.uploadingOverlay}>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Загрузка...</span>
                </div>
              )}
              {imageUrl && !isUploading && (
                <div className={styles.uploadedBadge}>✅ Загружено</div>
              )}
              <button className={styles.changeButton} onClick={handleReset}>
                <RefreshCw className="h-4 w-4" />
                Изменить
              </button>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className={styles.promptSection}>
          <label className={styles.promptLabel}>
            Опишите, что должно происходить на видео
            <span className={styles.optional}>(необязательно)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: волосы развеваются на ветру, человек поворачивает голову..."
            className={styles.promptInput}
            rows={3}
          />
        </div>

        {/* Generate Button */}
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!imageUrl || isGenerating || isUploading}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{taskStatus?.state === 'generating' ? 'Генерация...' : 'Ожидание очереди...'}</span>
            </>
          ) : (
            <>
              <Video className="h-5 w-5" />
              <span>Создать видео</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: '#fef2f2', borderRadius: 8, color: '#dc2626' }}>
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {videoUrl && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Результат</h3>
              <button className={styles.downloadButton} onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Скачать
              </button>
            </div>
            <div className={styles.videoContainer}>
              <video 
                src={videoUrl} 
                controls 
                className={styles.resultVideo}
                poster={image || undefined}
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className={styles.infoBox}>
          <p>
            <strong>Kie.ai Image-to-Video</strong> создаёт видео из фотографий.
            Доступны модели: Sora2, Kling, Hailuo.
          </p>
        </div>
      </div>
    </div>
  );
}
