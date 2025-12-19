"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Volume2, 
  Loader2, 
  Download,
  Play,
  Pause,
  AlertCircle
} from "lucide-react";
import { AUDIO_MODELS } from "@/lib/kie";
import styles from "./page.module.css";

// Модель ElevenLabs TTS
const TTS_MODEL = AUDIO_MODELS.find(m => m.id === "elevenlabs-tts")!;

interface TaskStatus {
  taskId: string;
  state: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

export default function TTSPage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Rachel");
  const [stability, setStability] = useState(0.5);
  const [clarity, setClarity] = useState(0.75);
  const [speed, setSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kie/task-status?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Ошибка получения статуса");

      setTaskStatus(data);

      if (data.isProcessing) {
        setTimeout(() => pollTaskStatus(taskId), 2000);
      } else if (data.isSuccess && data.resultUrls?.length > 0) {
        setAudioUrl(data.resultUrls[0]);
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
    if (!text.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setTaskStatus(null);

    try {
      const response = await fetch("/api/kie/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: TTS_MODEL.id,
          input: {
            text: text.trim(),
            voice,
            stability,
            similarity_boost: clarity,
            speed,
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

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `tts-${Date.now()}.wav`;
    link.click();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>Речь/Аудио (TTS)</h1>
          <p className={styles.subtitle}>ElevenLabs • Озвучка текста с выбором голоса</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Создать</button>
        <button className={styles.tab}>История</button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Voice Settings */}
        <div className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <label className={styles.label}>Голос</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className={styles.select}
            >
              <option value="Rachel">Rachel (Женский)</option>
              <option value="Drew">Drew (Мужской)</option>
              <option value="Clyde">Clyde (Мужской)</option>
              <option value="Paul">Paul (Мужской)</option>
              <option value="Domi">Domi (Женский)</option>
              <option value="Sarah">Sarah (Женский)</option>
              <option value="Antoni">Antoni (Мужской)</option>
              <option value="Emily">Emily (Женский)</option>
            </select>
          </div>
          
          <div className={styles.settingItem}>
            <label className={styles.label}>Стабильность: {stability}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={stability}
              onChange={(e) => setStability(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.settingItem}>
            <label className={styles.label}>Чёткость: {clarity}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={clarity}
              onChange={(e) => setClarity(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.settingItem}>
            <label className={styles.label}>Скорость: {speed}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>

        {/* Text Input */}
        <div className={styles.inputSection}>
          <label className={styles.label}>Текст для озвучки</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите текст, который нужно озвучить..."
            className={styles.textInput}
            rows={6}
          />
          <div className={styles.charCount}>
            {text.length} / 5000 символов
          </div>
        </div>

        {/* Generate Button */}
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{taskStatus?.state === 'generating' ? 'Генерация...' : 'Ожидание...'}</span>
            </>
          ) : (
            <>
              <Volume2 className="h-5 w-5" />
              <span>Озвучить текст</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className={styles.errorBox}>
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {audioUrl && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Результат</h3>
              <button className={styles.downloadButton} onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Скачать
              </button>
            </div>
            <div className={styles.audioPlayer}>
              <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
              <button 
                className={styles.playButton}
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </button>
              <div className={styles.waveform}>
                <span className={styles.waveformText}>
                  {isPlaying ? "Воспроизведение..." : "Нажмите для воспроизведения"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className={styles.infoBox}>
          <p>
            <strong>ElevenLabs TTS Turbo 2.5</strong> — высококачественный синтез речи.
            12 голосов, настройка стабильности и скорости.
          </p>
        </div>
      </div>
    </div>
  );
}
