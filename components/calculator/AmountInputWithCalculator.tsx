"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Calculator from "./Calculator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Calculator as CalculatorIcon } from "lucide-react";

type AmountInputWithCalculatorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
};

export default function AmountInputWithCalculator({
  value,
  onChange,
  placeholder = "0",
  label,
  error,
  className,
  inputClassName,
  compact = false,
}: AmountInputWithCalculatorProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Закрываем калькулятор при клике вне его
  useEffect(() => {
    if (!showCalculator) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Если калькулятор ref ещё не установлен, не закрываем
      if (!calculatorRef.current) return;
      
      // Проверяем что клик не внутри контейнера и не внутри калькулятора
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideCalculator = calculatorRef.current.contains(target);
      
      if (!isInsideContainer && !isInsideCalculator) {
        setShowCalculator(false);
      }
    };

    // Добавляем небольшую задержку, чтобы ref успел установиться
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalculator]);

  const handleCalculatorResult = (result: string) => {
    onChange(result);
  };

  const handleToggleCalculator = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showCalculator && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const calculatorWidth = 280;
      const calculatorHeight = 480; // Увеличили для учета всех кнопок
      
      let top = rect.top;
      let left = rect.right + 12;
      
      // Проверяем, помещается ли калькулятор справа
      if (left + calculatorWidth > window.innerWidth) {
        // Если не помещается справа, открываем слева
        left = rect.left - calculatorWidth - 12;
      }
      
      // Проверяем, помещается ли калькулятор по высоте
      if (top + calculatorHeight > window.innerHeight) {
        // Если не помещается снизу, выравниваем по нижнему краю экрана с отступом
        top = window.innerHeight - calculatorHeight - 60;
      }
      
      // Убеждаемся что калькулятор не выходит за верхний край
      if (top < 20) {
        top = 20;
      }
      
      // Убеждаемся что калькулятор не выходит за левый край
      if (left < 20) {
        left = 20;
      }
      
      setPosition({ top, left });
    }
    
    setShowCalculator(!showCalculator);
  };

  return (
    <div className={cn("space-y-1", compact && "space-y-0", className)} ref={containerRef}>
      {label && <Label>{label}</Label>}
      <div className="relative flex">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("pr-10", inputClassName, error && "border-destructive")}
        />
        <Button
          ref={buttonRef}
          type="button"
          variant={showCalculator ? "default" : "ghost"}
          size="icon"
          className="absolute right-0 top-0 h-full rounded-l-none"
          onClick={handleToggleCalculator}
          title="Открыть калькулятор"
        >
          <CalculatorIcon className="h-4 w-4" />
        </Button>
        {showCalculator && typeof window !== 'undefined' && createPortal(
          <div 
            ref={calculatorRef} 
            style={{ position: 'fixed', top: `${position.top}px`, left: `${position.left}px`, zIndex: 99999, pointerEvents: 'auto' }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Calculator onResult={handleCalculatorResult} onClose={() => setShowCalculator(false)} initialValue={value} />
          </div>,
          document.body
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
