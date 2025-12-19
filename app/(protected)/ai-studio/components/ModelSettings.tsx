"use client";

import { useState } from "react";
import { 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Image,
  Video,
  Volume2,
  Type,
  Mic
} from "lucide-react";
import {
  ModelType,
  ImageGenerationConfig,
  VideoGenerationConfig,
  TextGenerationConfig,
  TTSConfig,
  TranscribeConfig,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_TEXT_CONFIG,
  DEFAULT_TTS_CONFIG,
  DEFAULT_TRANSCRIBE_CONFIG,
  IMAGE_ASPECT_RATIOS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
  TTS_VOICES,
  TTS_LANGUAGES,
} from "@/lib/ai-studio/models/config";
import styles from "./ModelSettings.module.css";

type ConfigType = 
  | ImageGenerationConfig 
  | VideoGenerationConfig 
  | TextGenerationConfig 
  | TTSConfig 
  | TranscribeConfig;

interface ModelSettingsProps {
  modelType: ModelType;
  config: ConfigType;
  onChange: (config: ConfigType) => void;
  collapsed?: boolean;
}

export default function ModelSettings({ 
  modelType, 
  config, 
  onChange,
  collapsed = false 
}: ModelSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const getIcon = () => {
    switch (modelType) {
      case "image": return <Image className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "tts": return <Volume2 className="h-4 w-4" />;
      case "text": return <Type className="h-4 w-4" />;
      case "audio": return <Mic className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getTitle = () => {
    switch (modelType) {
      case "image": return "Настройки изображения";
      case "video": return "Настройки видео";
      case "tts": return "Настройки озвучки";
      case "text": return "Настройки генерации";
      case "audio": return "Настройки транскрибации";
      default: return "Настройки модели";
    }
  };

  const renderImageSettings = () => {
    const cfg = config as ImageGenerationConfig;
    return (
      <div className={styles.settingsGrid}>
        {/* Aspect Ratio */}
        <div className={styles.settingItem}>
          <label>Соотношение сторон</label>
          <div className={styles.aspectRatioGrid}>
            {IMAGE_ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                className={`${styles.aspectButton} ${cfg.aspectRatio === ratio.value ? styles.active : ""}`}
                onClick={() => onChange({ ...cfg, aspectRatio: ratio.value as ImageGenerationConfig["aspectRatio"] })}
                title={ratio.label}
              >
                <span>{ratio.icon}</span>
                <span className={styles.aspectLabel}>{ratio.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Number of Images */}
        <div className={styles.settingItem}>
          <label>Количество изображений</label>
          <div className={styles.numberButtons}>
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                className={`${styles.numberButton} ${cfg.numberOfImages === num ? styles.active : ""}`}
                onClick={() => onChange({ ...cfg, numberOfImages: num })}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Guidance Scale */}
        <div className={styles.settingItem}>
          <label>
            Следование промпту
            <span className={styles.valueLabel}>{cfg.guidanceScale || 7}</span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={cfg.guidanceScale || 7}
            onChange={(e) => onChange({ ...cfg, guidanceScale: parseFloat(e.target.value) })}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>Творческий</span>
            <span>Точный</span>
          </div>
        </div>

        {/* Negative Prompt */}
        <div className={styles.settingItem}>
          <label>Негативный промпт</label>
          <input
            type="text"
            value={cfg.negativePrompt || ""}
            onChange={(e) => onChange({ ...cfg, negativePrompt: e.target.value })}
            placeholder="Что исключить из генерации..."
            className={styles.textInput}
          />
        </div>

        {/* Seed */}
        <div className={styles.settingItem}>
          <label>Seed (для воспроизводимости)</label>
          <input
            type="number"
            value={cfg.seed || ""}
            onChange={(e) => onChange({ ...cfg, seed: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Случайный"
            className={styles.textInput}
          />
        </div>

        {/* Toggles */}
        <div className={styles.togglesRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.enhancePrompt}
              onChange={(e) => onChange({ ...cfg, enhancePrompt: e.target.checked })}
            />
            <span>Улучшить промпт</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.addWatermark}
              onChange={(e) => onChange({ ...cfg, addWatermark: e.target.checked })}
            />
            <span>Водяной знак</span>
          </label>
        </div>

        {/* Person Generation */}
        <div className={styles.settingItem}>
          <label>Генерация людей</label>
          <select
            value={cfg.personGeneration}
            onChange={(e) => onChange({ ...cfg, personGeneration: e.target.value as ImageGenerationConfig["personGeneration"] })}
            className={styles.select}
          >
            <option value="dont_allow">Запрещено</option>
            <option value="allow_adult">Только взрослые</option>
            <option value="allow_all">Разрешено</option>
          </select>
        </div>
      </div>
    );
  };

  const renderVideoSettings = () => {
    const cfg = config as VideoGenerationConfig;
    return (
      <div className={styles.settingsGrid}>
        {/* Aspect Ratio */}
        <div className={styles.settingItem}>
          <label>Соотношение сторон</label>
          <div className={styles.aspectRatioGrid}>
            {VIDEO_ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                className={`${styles.aspectButton} ${cfg.aspectRatio === ratio.value ? styles.active : ""}`}
                onClick={() => onChange({ ...cfg, aspectRatio: ratio.value as VideoGenerationConfig["aspectRatio"] })}
                title={ratio.label}
              >
                <span>{ratio.icon}</span>
                <span className={styles.aspectLabel}>{ratio.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className={styles.settingItem}>
          <label>
            Длительность
            <span className={styles.valueLabel}>{cfg.durationSeconds} сек</span>
          </label>
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={cfg.durationSeconds}
            onChange={(e) => onChange({ ...cfg, durationSeconds: parseInt(e.target.value) })}
            className={styles.slider}
          />
        </div>

        {/* Resolution */}
        <div className={styles.settingItem}>
          <label>Разрешение</label>
          <div className={styles.numberButtons}>
            {VIDEO_RESOLUTIONS.map((res) => (
              <button
                key={res.value}
                className={`${styles.numberButton} ${styles.wide} ${cfg.resolution === res.value ? styles.active : ""}`}
                onClick={() => onChange({ ...cfg, resolution: res.value as VideoGenerationConfig["resolution"] })}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* FPS */}
        <div className={styles.settingItem}>
          <label>
            Частота кадров
            <span className={styles.valueLabel}>{cfg.fps} fps</span>
          </label>
          <input
            type="range"
            min="12"
            max="60"
            step="6"
            value={cfg.fps}
            onChange={(e) => onChange({ ...cfg, fps: parseInt(e.target.value) })}
            className={styles.slider}
          />
        </div>

        {/* Negative Prompt */}
        <div className={styles.settingItem}>
          <label>Негативный промпт</label>
          <input
            type="text"
            value={cfg.negativePrompt || ""}
            onChange={(e) => onChange({ ...cfg, negativePrompt: e.target.value })}
            placeholder="Что исключить..."
            className={styles.textInput}
          />
        </div>

        {/* Toggles */}
        <div className={styles.togglesRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.enhancePrompt}
              onChange={(e) => onChange({ ...cfg, enhancePrompt: e.target.checked })}
            />
            <span>Улучшить промпт</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.generateAudio}
              onChange={(e) => onChange({ ...cfg, generateAudio: e.target.checked })}
            />
            <span>Генерировать звук</span>
          </label>
        </div>
      </div>
    );
  };

  const renderTextSettings = () => {
    const cfg = config as TextGenerationConfig;
    return (
      <div className={styles.settingsGrid}>
        {/* Temperature */}
        <div className={styles.settingItem}>
          <label>
            Температура
            <span className={styles.valueLabel}>{cfg.temperature.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={cfg.temperature}
            onChange={(e) => onChange({ ...cfg, temperature: parseFloat(e.target.value) })}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>Точный</span>
            <span>Творческий</span>
          </div>
        </div>

        {/* Top P */}
        <div className={styles.settingItem}>
          <label>
            Top P
            <span className={styles.valueLabel}>{cfg.topP.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={cfg.topP}
            onChange={(e) => onChange({ ...cfg, topP: parseFloat(e.target.value) })}
            className={styles.slider}
          />
        </div>

        {/* Top K */}
        <div className={styles.settingItem}>
          <label>
            Top K
            <span className={styles.valueLabel}>{cfg.topK}</span>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={cfg.topK}
            onChange={(e) => onChange({ ...cfg, topK: parseInt(e.target.value) })}
            className={styles.slider}
          />
        </div>

        {/* Max Output Tokens */}
        <div className={styles.settingItem}>
          <label>
            Максимум токенов
            <span className={styles.valueLabel}>{cfg.maxOutputTokens}</span>
          </label>
          <input
            type="range"
            min="256"
            max="32768"
            step="256"
            value={cfg.maxOutputTokens}
            onChange={(e) => onChange({ ...cfg, maxOutputTokens: parseInt(e.target.value) })}
            className={styles.slider}
          />
        </div>
      </div>
    );
  };

  const renderTTSSettings = () => {
    const cfg = config as TTSConfig;
    return (
      <div className={styles.settingsGrid}>
        {/* Voice */}
        <div className={styles.settingItem}>
          <label>Голос</label>
          <div className={styles.voiceGrid}>
            {TTS_VOICES.map((voice) => (
              <button
                key={voice.id}
                className={`${styles.voiceButton} ${cfg.voice === voice.id ? styles.active : ""}`}
                onClick={() => onChange({ ...cfg, voice: voice.id })}
                title={voice.description}
              >
                <span className={styles.voiceName}>{voice.name}</span>
                <span className={styles.voiceDesc}>{voice.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className={styles.settingItem}>
          <label>Язык</label>
          <select
            value={cfg.language}
            onChange={(e) => onChange({ ...cfg, language: e.target.value })}
            className={styles.select}
          >
            {TTS_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Speaking Rate */}
        <div className={styles.settingItem}>
          <label>
            Скорость речи
            <span className={styles.valueLabel}>{cfg.speakingRate.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={cfg.speakingRate}
            onChange={(e) => onChange({ ...cfg, speakingRate: parseFloat(e.target.value) })}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>Медленно</span>
            <span>Быстро</span>
          </div>
        </div>

        {/* Pitch */}
        <div className={styles.settingItem}>
          <label>
            Высота голоса
            <span className={styles.valueLabel}>{cfg.pitch > 0 ? `+${cfg.pitch}` : cfg.pitch}</span>
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={cfg.pitch}
            onChange={(e) => onChange({ ...cfg, pitch: parseInt(e.target.value) })}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>Низкий</span>
            <span>Высокий</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTranscribeSettings = () => {
    const cfg = config as TranscribeConfig;
    return (
      <div className={styles.settingsGrid}>
        {/* Language */}
        <div className={styles.settingItem}>
          <label>Язык</label>
          <select
            value={cfg.language}
            onChange={(e) => onChange({ ...cfg, language: e.target.value })}
            className={styles.select}
          >
            <option value="auto">Автоопределение</option>
            {TTS_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className={styles.togglesRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.includeTimestamps}
              onChange={(e) => onChange({ ...cfg, includeTimestamps: e.target.checked })}
            />
            <span>Таймкоды</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={cfg.punctuate}
              onChange={(e) => onChange({ ...cfg, punctuate: e.target.checked })}
            />
            <span>Пунктуация</span>
          </label>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    switch (modelType) {
      case "image": return renderImageSettings();
      case "video": return renderVideoSettings();
      case "text": return renderTextSettings();
      case "tts": return renderTTSSettings();
      case "audio": return renderTranscribeSettings();
      default: return null;
    }
  };

  const handleReset = () => {
    switch (modelType) {
      case "image": onChange({ ...DEFAULT_IMAGE_CONFIG }); break;
      case "video": onChange({ ...DEFAULT_VIDEO_CONFIG }); break;
      case "text": onChange({ ...DEFAULT_TEXT_CONFIG }); break;
      case "tts": onChange({ ...DEFAULT_TTS_CONFIG }); break;
      case "audio": onChange({ ...DEFAULT_TRANSCRIBE_CONFIG }); break;
    }
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsExpanded(!isExpanded)}
      >
        <div className={styles.headerLeft}>
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.resetButton}
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            title="Сбросить настройки"
          >
            Сбросить
          </button>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className={styles.content}>
          {renderSettings()}
        </div>
      )}
    </div>
  );
}
