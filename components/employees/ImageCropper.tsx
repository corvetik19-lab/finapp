'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Minus, Plus, Check } from "lucide-react";

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
  aspectRatio: _aspectRatio = 1 
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">✂️ Обрезать фото</h3><Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button></div>
        <div className="p-4 space-y-4">
          <div ref={containerRef} className="relative mx-auto cursor-move" style={{ width: cropSize, height: cropSize }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp}>
            <canvas ref={canvasRef} width={cropSize} height={cropSize} className="rounded-full bg-muted" />
            <div className="absolute inset-0 border-2 border-primary rounded-full pointer-events-none" />
          </div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)}><Minus className="h-4 w-4" /></Button><input type="range" min={0.5} max={3} step={0.1} value={scale} onChange={e => { const v = parseFloat(e.target.value); const img = imageRef.current; if (img) { const minScale = Math.max(cropSize / img.width, cropSize / img.height); if (v >= minScale) setScale(v); } }} className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer" /><Button variant="outline" size="icon" onClick={() => handleZoom(0.1)}><Plus className="h-4 w-4" /></Button></div>
          <p className="text-sm text-muted-foreground text-center">Перетащите изображение для позиционирования</p>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t"><Button variant="outline" onClick={onCancel}>Отмена</Button><Button onClick={handleCrop}><Check className="h-4 w-4 mr-1" />Сохранить</Button></div>
      </div>
    </div>
  );
}
