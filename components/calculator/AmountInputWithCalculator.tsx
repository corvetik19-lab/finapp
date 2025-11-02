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
};

export default function AmountInputWithCalculator({
  value,
  onChange,
  placeholder = "0",
  label,
  error,
  className,
  inputClassName,
}: AmountInputWithCalculatorProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Закрываем калькулятор при клике вне его
  useEffect(() => {
    if (!showCalculator) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      setPosition({
        top: rect.top,
        left: rect.right + 12,
      });
    }
    
    setShowCalculator(!showCalculator);
  };

  return (
    <div className={`${styles.container} ${className || ""}`} ref={containerRef}>
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
            />
          </div>,
          document.body
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
