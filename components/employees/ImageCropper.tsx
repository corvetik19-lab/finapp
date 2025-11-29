'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './ImageCropper.module.css';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // 1 для квадрата
}

export function ImageCropper({ 
  imageSrc, 
  onCrop, 
  onCancel, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  aspectRatio = 1 
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const cropSize = 200; // Размер области кропа

  // Загрузка изображения
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      
      // Центрируем изображение
      const minScale = Math.max(cropSize / img.width, cropSize / img.height);
      setScale(minScale * 1.2);
      setPosition({
        x: (cropSize - img.width * minScale * 1.2) / 2,
        y: (cropSize - img.height * minScale * 1.2) / 2
      });
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Отрисовка на canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, cropSize, cropSize);
    
    // Рисуем изображение
    ctx.drawImage(
      img,
      position.x,
      position.y,
      img.width * scale,
      img.height * scale
    );
  }, [position, scale]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, drawCanvas]);

  // Обработка перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  // Масштабирование
  const handleZoom = (delta: number) => {
    const img = imageRef.current;
    if (!img) return;

    const minScale = Math.max(cropSize / img.width, cropSize / img.height);
    const newScale = Math.max(minScale, Math.min(3, scale + delta));
    
    // Корректируем позицию при зуме
    const centerX = cropSize / 2;
    const centerY = cropSize / 2;
    const scaleRatio = newScale / scale;
    
    setPosition({
      x: centerX - (centerX - position.x) * scaleRatio,
      y: centerY - (centerY - position.y) * scaleRatio
    });
    setScale(newScale);
  };

  // Кроп и сохранение
  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>✂️ Обрезать фото</h3>
          <button onClick={onCancel} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          <div 
            ref={containerRef}
            className={styles.cropContainer}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={cropSize}
              height={cropSize}
              className={styles.canvas}
            />
            <div className={styles.cropFrame} />
          </div>

          <div className={styles.controls}>
            <button 
              onClick={() => handleZoom(-0.1)} 
              className={styles.zoomButton}
              title="Уменьшить"
            >
              ➖
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => {
                const newScale = parseFloat(e.target.value);
                const img = imageRef.current;
                if (img) {
                  const minScale = Math.max(cropSize / img.width, cropSize / img.height);
                  if (newScale >= minScale) {
                    setScale(newScale);
                  }
                }
              }}
              className={styles.slider}
            />
            <button 
              onClick={() => handleZoom(0.1)} 
              className={styles.zoomButton}
              title="Увеличить"
            >
              ➕
            </button>
          </div>

          <p className={styles.hint}>
            Перетащите изображение для позиционирования
          </p>
        </div>

        <div className={styles.footer}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Отмена
          </button>
          <button onClick={handleCrop} className={styles.saveButton}>
            ✅ Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
