"use client";

import { useState } from "react";
import styles from "./Calculator.module.css";

type CalculatorProps = {
  onResult: (value: string) => void;
  onClose: () => void;
};

export default function Calculator({ onResult, onClose }: CalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");

  const handleNumber = (num: string) => {
    if (display === "0") {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setExpression(display + " " + op + " ");
    setDisplay("0");
  };

  const handleEquals = () => {
    try {
      const fullExpression = expression + display;
      // Безопасное вычисление без eval
      const result = calculateExpression(fullExpression);
      setDisplay(result.toString());
      setExpression("");
    } catch {
      setDisplay("Ошибка");
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setExpression("");
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleApply = () => {
    onResult(display);
    onClose();
  };

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <span>Калькулятор</span>
        <button type="button" onClick={onClose} className={styles.closeBtn}>
          <span className="material-icons">close</span>
        </button>
      </div>
      
      <div className={styles.display}>
        {expression && <div className={styles.expression}>{expression}</div>}
        <div className={styles.value}>{display}</div>
      </div>

      <div className={styles.buttons}>
        <button type="button" onClick={handleClear} className={styles.btnClear}>C</button>
        <button type="button" onClick={handleBackspace} className={styles.btnOperator}>
          <span className="material-icons">backspace</span>
        </button>
        <button type="button" onClick={() => handleOperator("/")} className={styles.btnOperator}>÷</button>
        <button type="button" onClick={() => handleOperator("*")} className={styles.btnOperator}>×</button>

        <button type="button" onClick={() => handleNumber("7")}>7</button>
        <button type="button" onClick={() => handleNumber("8")}>8</button>
        <button type="button" onClick={() => handleNumber("9")}>9</button>
        <button type="button" onClick={() => handleOperator("-")} className={styles.btnOperator}>−</button>

        <button type="button" onClick={() => handleNumber("4")}>4</button>
        <button type="button" onClick={() => handleNumber("5")}>5</button>
        <button type="button" onClick={() => handleNumber("6")}>6</button>
        <button type="button" onClick={() => handleOperator("+")} className={styles.btnOperator}>+</button>

        <button type="button" onClick={() => handleNumber("1")}>1</button>
        <button type="button" onClick={() => handleNumber("2")}>2</button>
        <button type="button" onClick={() => handleNumber("3")}>3</button>
        <button type="button" onClick={handleEquals} className={styles.btnEquals}>=</button>

        <button type="button" onClick={() => handleNumber("0")} className={styles.btnZero}>0</button>
        <button type="button" onClick={handleDecimal}>.</button>
        <button type="button" onClick={handleApply} className={styles.btnApply}>
          <span className="material-icons">check</span>
        </button>
      </div>
    </div>
  );
}

// Безопасное вычисление математического выражения
function calculateExpression(expr: string): number {
  // Удаляем пробелы и заменяем операторы
  const cleaned = expr.replace(/\s/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  
  // Парсим и вычисляем
  const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens) throw new Error("Invalid expression");

  // Простой калькулятор с приоритетом операций
  const numbers: number[] = [];
  const operators: string[] = [];

  let currentNumber = "";
  for (const token of tokens) {
    if (/[\d.]/.test(token)) {
      currentNumber += token;
    } else {
      if (currentNumber) {
        numbers.push(parseFloat(currentNumber));
        currentNumber = "";
      }
      
      // Обрабатываем операторы с приоритетом
      while (
        operators.length > 0 &&
        getPriority(operators[operators.length - 1]!) >= getPriority(token)
      ) {
        const op = operators.pop()!;
        const b = numbers.pop()!;
        const a = numbers.pop()!;
        numbers.push(applyOperator(a, b, op));
      }
      operators.push(token);
    }
  }

  if (currentNumber) {
    numbers.push(parseFloat(currentNumber));
  }

  // Применяем оставшиеся операторы
  while (operators.length > 0) {
    const op = operators.pop()!;
    const b = numbers.pop()!;
    const a = numbers.pop()!;
    numbers.push(applyOperator(a, b, op));
  }

  return Math.round(numbers[0]! * 100) / 100; // Округляем до 2 знаков
}

function getPriority(op: string): number {
  if (op === "+" || op === "-") return 1;
  if (op === "*" || op === "/") return 2;
  return 0;
}

function applyOperator(a: number, b: number, op: string): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return a / b;
    default: return 0;
  }
}
