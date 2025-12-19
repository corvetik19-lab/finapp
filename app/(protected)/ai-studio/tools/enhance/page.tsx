"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Sparkles, Loader2, Download, RefreshCw, AlertCircle } from "lucide-react";
import { IMAGE_MODELS, KieModel } from "@/lib/kie";
import styles from "../live-photos/page.module.css";

// Модели upscale для фотобустера
const UPSCALE_MODELS = IMAGE_MODELS.filter(m => m.type === "upscale");

interface TaskStatus {
  taskId: string;
  state: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

export default function EnhancePage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<KieModel>(UPSCALE_MODELS[0]);
  const [scale, setScale] = useState("2");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    setError(null);
    setResult(null);
    setTaskStatus(null);
    
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
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
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
        setTimeout(() => pollTaskStatus(taskId), 3000);
      } else if (data.isSuccess && data.resultUrls?.length > 0) {
        setResult(data.resultUrls[0]);
        setIsProcessing(false);
      } else if (data.isFailed) {
        setError(data.errorMessage || "Ошибка обработки");
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsProcessing(false);
    }
  }, []);

  const handleProcess = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setTaskStatus(null);

    try {
      const response = await fetch("/api/kie/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel.id,
          input: {
            image_url: imageUrl,
            upscaling_factor: parseInt(scale),
            scale: parseInt(scale),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка создания задачи");
      
      pollTaskStatus(data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `enhanced-${Date.now()}.jpg`;
    link.click();
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setImageUrl(null);
    setResult(null);
    setTaskStatus(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>Фотобустер</h1>
          <p className={styles.subtitle}>Kie.ai • Увеличение разрешения фотографий</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Создать</button>
        <button className={styles.tab}>История</button>
      </div>

      <div className={styles.content}>
        {/* Model & Scale Selection */}
        <div className={styles.modelSection}>
          <label className={styles.label}>Модель</label>
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = UPSCALE_MODELS.find(m => m.id === e.target.value);
              if (model) setSelectedModel(model);
            }}
            className={styles.select}
          >
            {UPSCALE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.icon} {model.nameRu}
              </option>
            ))}
          </select>
          <p className={styles.modelDescription}>{selectedModel.descriptionRu}</p>
        </div>

        <div className={styles.modelSection}>
          <label className={styles.label}>Масштаб увеличения</label>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className={styles.select}
          >
            <option value="2">2x (удвоить)</option>
            <option value="4">4x (учетверить)</option>
          </select>
        </div>

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
              <span className={styles.uploadText}>Загрузите фотографию</span>
              <span className={styles.uploadHint}>для увеличения разрешения</span>
            </label>
          ) : (
            <div className={styles.previewArea}>
              <img src={image} alt="Preview" className={styles.previewImage} />
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

        <button
          className={styles.generateButton}
          onClick={handleProcess}
          disabled={!imageUrl || isProcessing || isUploading}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{taskStatus?.state === 'generating' ? 'Увеличение...' : 'Ожидание...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Увеличить {scale}x</span>
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
                Скачать
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16, padding: 20 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>До</p>
                <img src={image || ''} alt="Original" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>После</p>
                <img src={result} alt="Enhanced" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
              </div>
            </div>
          </div>
        )}

        <div className={styles.infoBox}>
          <p>
            <strong>Kie.ai Upscaler</strong> увеличивает разрешение фотографий в 2-4 раза.
            Доступны модели: Aura SR, Clarity Upscaler.
          </p>
        </div>
      </div>
    </div>
  );
}
