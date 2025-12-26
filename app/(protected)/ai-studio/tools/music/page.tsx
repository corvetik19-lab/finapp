"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Music, 
  Loader2, 
  Download, 
  AlertCircle,
  Play,
  Pause
} from "lucide-react";
import { AUDIO_MODELS, KieModel } from "@/lib/kie";
import styles from "../live-photos/page.module.css";

// Модели Suno для генерации музыки
const MUSIC_MODELS = AUDIO_MODELS.filter(m => 
  m.type === "text-to-music" || 
  m.type === "lyrics-generation" || 
  m.type === "music-extend" ||
  m.type === "music-cover" ||
  m.type === "vocal-separation"
);

export default function MusicPage() {
  const [selectedModel, setSelectedModel] = useState<KieModel>(MUSIC_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [lyricsResult, setLyricsResult] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [_taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const needsAudioInput = selectedModel.type === "music-extend" || 
                          selectedModel.type === "music-cover" || 
                          selectedModel.type === "vocal-separation";

  const [_tracks, setTracks] = useState<Array<{
    id: string;
    audioUrl: string;
    imageUrl?: string;
    title?: string;
    prompt?: string;
    tags?: string;
    duration?: number;
  }>>([]);

  const pollTaskStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/kie/suno/status?taskId=${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка получения статуса");
      }

      setProgress(data.progress || 0);
      setProgressText(data.progressText || "");

      if (data.isProcessing) {
        setTimeout(() => pollTaskStatus(id), 5000);
      } else if (data.isSuccess) {
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
          setResultUrl(data.tracks[0].audioUrl);
        } else if (data.resultUrls && data.resultUrls.length > 0) {
          setResultUrl(data.resultUrls[0]);
        }
        setIsLoading(false);
      } else if (data.isFailed) {
        setError(data.errorMessage || "Ошибка генерации");
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && selectedModel.type !== "vocal-separation") {
      setError("Введите описание музыки");
      return;
    }

    if ((selectedModel.type === "music-extend" || selectedModel.type === "music-cover" || selectedModel.type === "vocal-separation") && !audioFile) {
      setError("Загрузите аудио файл");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultUrl(null);
    setLyricsResult(null);
    setProgress(0);
    setProgressText("Запуск генерации...");

    try {
      // Используем modelId из конфигурации модели (V5, V4_5PLUS, V4_5, V4)
      const sunoModel = selectedModel.modelId || "V4_5";

      // Создаём задачу через Suno API
      const response = await fetch("/api/kie/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          customMode,
          instrumental,
          model: sunoModel,
          style: style.trim() || undefined,
          title: title.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка создания задачи");
      }

      setTaskId(data.taskId);
      pollTaskStatus(data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `suno-music-${Date.now()}.mp3`;
      a.click();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className={styles.title}>Музыка (Suno AI)</h1>
          <p className={styles.subtitle}>Kie.ai • Генерация музыки, текстов и обработка аудио</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Model Selection */}
        <div className={styles.modelSection}>
          <span className={styles.label}>Модель</span>
          <select
            className={styles.select}
            value={selectedModel.id}
            onChange={(e) => {
              const model = MUSIC_MODELS.find(m => m.id === e.target.value);
              if (model) setSelectedModel(model);
            }}
          >
            {MUSIC_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.icon} {model.nameRu}
              </option>
            ))}
          </select>
          <p className={styles.modelDescription}>{selectedModel.descriptionRu}</p>
        </div>

        {/* Audio File Input (for extend/cover/separate) */}
        {needsAudioInput && (
          <div className={styles.modelSection}>
            <span className={styles.label}>Аудио файл</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <div 
              className={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              {audioFile ? (
                <div style={{ textAlign: "center" }}>
                  <Music size={32} style={{ marginBottom: 8, color: "#ff6b35" }} />
                  <p className={styles.uploadText}>{audioFile.name}</p>
                  <p className={styles.uploadHint}>Нажмите, чтобы заменить</p>
                </div>
              ) : (
                <>
                  <Music size={32} className={styles.uploadIcon} />
                  <p className={styles.uploadText}>Загрузите аудио файл</p>
                  <p className={styles.uploadHint}>MP3, WAV, FLAC до 50MB</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Prompt Input */}
        {selectedModel.type !== "vocal-separation" && (
          <div className={styles.promptSection}>
            <span className={styles.promptLabel}>
              {selectedModel.type === "lyrics-generation" ? "Тема песни" : "Описание музыки"}
            </span>
            <textarea
              className={styles.promptInput}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedModel.type === "lyrics-generation" 
                  ? "Опишите тему и настроение песни..."
                  : "Опишите желаемую музыку: жанр, настроение, темп..."
              }
              rows={3}
            />
          </div>
        )}

        {/* Additional options for music generation */}
        {(selectedModel.type === "text-to-music") && (
          <>
            <div className={styles.modelSection}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={customMode}
                  onChange={(e) => setCustomMode(e.target.checked)}
                />
                <span className={styles.label}>Расширенный режим</span>
              </label>
            </div>

            {customMode && (
              <>
                <div className={styles.promptSection}>
                  <span className={styles.promptLabel}>Стиль</span>
                  <input
                    type="text"
                    className={styles.promptInput}
                    style={{ minHeight: "auto", padding: "12px 16px" }}
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Pop, Rock, Jazz, Electronic, Classical..."
                  />
                </div>

                <div className={styles.promptSection}>
                  <span className={styles.promptLabel}>Название трека</span>
                  <input
                    type="text"
                    className={styles.promptInput}
                    style={{ minHeight: "auto", padding: "12px 16px" }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название вашего трека"
                  />
                </div>
              </>
            )}

            <div className={styles.modelSection}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => setInstrumental(e.target.checked)}
                />
                <span className={styles.label}>Только инструментал (без вокала)</span>
              </label>
            </div>
          </>
        )}

        {/* Style for cover */}
        {selectedModel.type === "music-cover" && (
          <div className={styles.promptSection}>
            <span className={styles.promptLabel}>Целевой стиль</span>
            <input
              type="text"
              className={styles.promptInput}
              style={{ minHeight: "auto", padding: "12px 16px" }}
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Jazz, Rock, Electronic, Classical..."
            />
          </div>
        )}

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
              Генерация... {progress > 0 && `${progress}%`}
            </>
          ) : (
            <>
              <Music size={18} />
              {selectedModel.type === "lyrics-generation" ? "Сгенерировать текст" : "Создать музыку"}
            </>
          )}
        </button>

        {/* Progress */}
        {isLoading && progress > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#666" }}>{progressText}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#7c3aed" }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${progress}%`, 
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  borderRadius: 4,
                  transition: "width 0.5s ease-out"
                }} 
              />
            </div>
          </div>
        )}

        {/* Lyrics Result */}
        {lyricsResult && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Сгенерированный текст</h3>
              <button className={styles.downloadButton} onClick={() => {
                navigator.clipboard.writeText(lyricsResult);
              }}>
                Копировать
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <pre style={{ 
                whiteSpace: "pre-wrap", 
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.6
              }}>
                {lyricsResult}
              </pre>
            </div>
          </div>
        )}

        {/* Audio Result */}
        {resultUrl && !lyricsResult && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Результат</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={styles.downloadButton} onClick={togglePlayback}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? "Пауза" : "Воспроизвести"}
                </button>
                <button className={styles.downloadButton} onClick={handleDownload}>
                  <Download size={14} />
                  Скачать
                </button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <audio 
                ref={audioRef} 
                src={resultUrl} 
                controls 
                style={{ width: "100%" }}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className={styles.infoBox}>
          <p>
            <strong>Suno AI</strong> — мощная платформа для генерации музыки. Доступные функции:
            генерация музыки из текста, создание текстов песен, продление треков, 
            создание каверов в новом стиле и разделение вокала/инструментала.
          </p>
        </div>
      </div>
    </div>
  );
}
