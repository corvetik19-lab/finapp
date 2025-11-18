"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Calculator from "./Calculator";
import styles from "./AmountInputWithCalculator.module.css";

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
      // Проверяем что клик не внутри контейнера и не внутри калькулятора
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        calculatorRef.current && !calculatorRef.current.contains(target)
      ) {
        setShowCalculator(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <div className={`${styles.container} ${compact ? styles.compact : ""} ${className || ""}`} ref={containerRef}>
      {label && <label className={styles.label}>{label}</label>}
      
      <div className={styles.inputWrapper}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${styles.input} ${inputClassName || ""} ${error ? styles.inputError : ""}`}
        />
        
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleCalculator}
          className={`${styles.calculatorBtn} ${showCalculator ? styles.active : ""}`}
          title="Открыть калькулятор"
        >
          <span className="material-icons">calculate</span>
        </button>

        {showCalculator && typeof window !== 'undefined' && createPortal(
          <div
            ref={calculatorRef}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
          >
            <Calculator
              onResult={handleCalculatorResult}
              onClose={() => setShowCalculator(false)}
              initialValue={value}
            />
          </div>,
          document.body
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
