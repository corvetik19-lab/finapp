"use client";

import { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCalculator(!showCalculator);
          }}
          className={`${styles.calculatorBtn} ${showCalculator ? styles.active : ""}`}
          title="Открыть калькулятор"
        >
          <span className="material-icons">calculate</span>
        </button>

        {showCalculator && (
          <Calculator
            onResult={handleCalculatorResult}
            onClose={() => setShowCalculator(false)}
          />
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
