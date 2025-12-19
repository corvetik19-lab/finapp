"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface BrowserVoice {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export default function AIAudioPage() {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState<BrowserVoice[]>([]);
  const [mode, setMode] = useState<"tts" | "live">("tts");
  const [isRecording, setIsRecording] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Загружаем голоса браузера
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const availableVoices = synthRef.current?.getVoices() || [];
        const russianVoices = availableVoices
          .filter(v => v.lang.startsWith("ru") || v.lang.startsWith("en"))
          .map(v => ({
            name: v.name,
            lang: v.lang,
            voice: v,
          }));
        setVoices(russianVoices);
        if (russianVoices.length > 0 && !voice) {
          const ruVoice = russianVoices.find(v => v.lang.startsWith("ru"));
          setVoice(ruVoice?.name || russianVoices[0].name);
        }
      };
      
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, [voice]);

  const handleGenerateTTS = () => {
    if (!text.trim() || isGenerating || !synthRef.current) return;

    // Останавливаем предыдущее воспроизведение
    synthRef.current.cancel();
    
    setIsGenerating(true);
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const selectedVoice = voices.find(v => v.name === voice);
    if (selectedVoice) {
      utterance.voice = selectedVoice.voice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    utterance.onend = () => {
      setIsGenerating(false);
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsGenerating(false);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsGenerating(false);
      setIsSpeaking(false);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: Implement WebSocket Live API
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">mic</span>
          Аудио
        </h1>
        <p>Text-to-Speech и голосовой агент реального времени</p>
      </div>

      <div className={styles.modeSelector}>
        <button
          className={mode === "tts" ? styles.active : ""}
          onClick={() => setMode("tts")}
        >
          <span className="material-icons">record_voice_over</span>
          Озвучка текста
        </button>
        <button
          className={mode === "live" ? styles.active : ""}
          onClick={() => setMode("live")}
        >
          <span className="material-icons">settings_voice</span>
          Голосовой агент
        </button>
      </div>

      <div className={styles.content}>
        {mode === "tts" ? (
          <div className={styles.ttsLayout}>
            <div className={styles.mainColumn}>
              <div className={styles.inputSection}>
                <label>Текст для озвучки</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Введите текст, который нужно озвучить..."
                  rows={6}
                />
              </div>
            </div>

            <div className={styles.sidebarColumn}>
              <div className={styles.controlsPanel}>
                <div className={styles.settings}>
                  <div className={styles.setting}>
                    <label>Голос</label>
                    <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                      {voices.length > 0 ? (
                        voices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))
                      ) : (
                        <option value="">Загрузка голосов...</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className={styles.settings}>
                  <div className={styles.setting}>
                    <label>Скорость: {rate.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={rate}
                      onChange={(e) => setRate(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className={styles.setting}>
                    <label>Высота: {pitch.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {isSpeaking ? (
                  <button
                    onClick={handleStopSpeaking}
                    className={styles.generateButton}
                    style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
                  >
                    <span className="material-icons">stop</span>
                    Остановить
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateTTS}
                    disabled={!text.trim() || isGenerating || voices.length === 0}
                    className={styles.generateButton}
                  >
                    <span className="material-icons">
                      {isGenerating ? "hourglass_empty" : "volume_up"}
                    </span>
                    {isGenerating ? "Генерация..." : "Озвучить текст"}
                  </button>
                )}
              </div>

              <div className={styles.features}>
                <div className={styles.feature}>
                  <span className="material-icons">translate</span>
                  <div>
                    <strong>Многоязычность</strong>
                    <p>Русский, английский и другие</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className="material-icons">speed</span>
                  <div>
                    <strong>Мгновенно</strong>
                    <p>Озвучка в реальном времени</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.livePanel}>
            <div className={styles.liveStatus}>
              <div className={`${styles.statusIndicator} ${isRecording ? styles.active : ""}`} />
              <span>{isRecording ? "Запись..." : "Ожидание"}</span>
            </div>

            <div className={styles.micButton}>
              <button
                className={`${styles.recordButton} ${isRecording ? styles.recording : ""}`}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                <span className="material-icons">
                  {isRecording ? "stop" : "mic"}
                </span>
              </button>
              <p>{isRecording ? "Нажмите для остановки" : "Нажмите для записи"}</p>
            </div>

            <div className={styles.liveInfo}>
              <span className="material-icons">info</span>
              <p>
                Live Voice Agent позволяет вести диалог с Gemini в реальном времени
                через голос. Нажмите кнопку и начните говорить.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
