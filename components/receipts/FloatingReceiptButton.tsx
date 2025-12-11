"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import ReceiptChatModal from "./ReceiptChatModal";

const STORAGE_KEY = "floatingButtonPosition";
const DEFAULT_POSITION = { x: 24, y: 24 }; // отступ от правого нижнего угла

type Position = { x: number; y: number };

export default function FloatingReceiptButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasMoved = useRef(false);

  // Загружаем позицию из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Position;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
        }
      }
    } catch {
      // игнорируем ошибки парсинга
    }

    // Проверяем есть ли данные чека
    const hasPreview = localStorage.getItem("receiptChatPreview");
    const hasInput = localStorage.getItem("receiptChatInput");
    const hasText = localStorage.getItem("receiptChatText");

    if (hasPreview || hasInput || hasText) {
      setIsModalOpen(true);
    }
  }, []);

  // Сохраняем позицию в localStorage
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // игнорируем ошибки записи
    }
  }, []);

  // Ограничиваем позицию в пределах экрана
  const clampPosition = useCallback((x: number, y: number): Position => {
    const buttonSize = 56; // h-14 w-14 = 56px
    const padding = 8;
    const maxX = window.innerWidth - buttonSize - padding;
    const maxY = window.innerHeight - buttonSize - padding;

    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY)),
    };
  }, []);

  // Начало перетаскивания
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // только левая кнопка мыши
    
    setIsDragging(true);
    hasMoved.current = false;
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Захватываем указатель для плавного перетаскивания
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  // Перетаскивание
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStart) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Считаем что было движение если сдвиг больше 5px
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved.current = true;
      }

      // Позиция от правого нижнего угла
      const newX = window.innerWidth - e.clientX - 28; // 28 = половина кнопки
      const newY = window.innerHeight - e.clientY - 28;

      const clamped = clampPosition(newX, newY);
      setPosition(clamped);
    },
    [isDragging, dragStart, clampPosition]
  );

  // Конец перетаскивания
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      setIsDragging(false);
      setDragStart(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Сохраняем позицию
      savePosition(position);
    },
    [isDragging, position, savePosition]
  );

  // Клик - открываем модалку только если не было перетаскивания
  const handleClick = useCallback(() => {
    if (!hasMoved.current) {
      setIsModalOpen(true);
    }
    hasMoved.current = false;
  }, []);

  return (
    <>
      <Button
        ref={buttonRef}
        size="icon"
        className={`fixed h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 touch-none select-none ${
          isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
        }`}
        style={{
          right: `${position.x}px`,
          bottom: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        title="Добавить чек (перетащите для перемещения)"
        aria-label="Добавить чек"
      >
        <FilePlus className="h-6 w-6 pointer-events-none" />
      </Button>

      {isModalOpen && (
        <ReceiptChatModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
