"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Delete } from "lucide-react";

type CalculatorProps = {
  onResult: (value: string) => void;
  onClose: () => void;
  initialValue?: string;
};

export default function Calculator({ onResult, onClose, initialValue }: CalculatorProps) {
  const [display, setDisplay] = useState(initialValue && initialValue !== "" ? initialValue : "0");
  const [expression, setExpression] = useState("");

  const handleNumber = (num: string) => {
    if (display === "0") {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    // Если уже есть выражение, сначала вычисляем его
    if (expression) {
      try {
        const fullExpression = expression + display;
        const result = calculateExpression(fullExpression);
        setExpression(result.toString() + " " + op + " ");
        setDisplay("0");
      } catch {
        setExpression(display + " " + op + " ");
        setDisplay("0");
      }
    } else {
      setExpression(display + " " + op + " ");
      setDisplay("0");
    }
  };

  const handleEquals = () => {
    try {
      const fullExpression = expression + display;
      // Безопасное вычисление без eval
      const result = calculateExpression(fullExpression);
      setDisplay(result.toString());
      setExpression("");
      // Автоматически применяем результат
      onResult(result.toString());
      onClose();
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

  // Обработка ввода с клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Цифры
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumber(e.key);
      }
      // Операторы
      else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      }
      else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      }
      else if (e.key === '*') {
        e.preventDefault();
        handleOperator('*');
      }
      else if (e.key === '/') {
        e.preventDefault();
        handleOperator('/');
      }
      // Равно
      else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      }
      // Точка
      else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleDecimal();
      }
      // Backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      // Escape - закрыть
      else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // C или Delete - очистить
      else if (e.key === 'c' || e.key === 'C' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [display, expression, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="w-[280px] shadow-xl" onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <CardHeader className="flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base">Калькулятор</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="bg-muted rounded-lg p-3 text-right">
          {expression && <div className="text-xs text-muted-foreground">{expression}</div>}
          <div className="text-2xl font-bold font-mono">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="destructive" size="sm" onClick={handleClear}>C</Button>
          <Button variant="secondary" size="sm" onClick={handleBackspace}><Delete className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={() => handleOperator("/")}>÷</Button>
          <Button variant="secondary" size="sm" onClick={() => handleOperator("*")}>×</Button>
          {["7","8","9"].map(n => <Button key={n} variant="outline" size="sm" onClick={() => handleNumber(n)}>{n}</Button>)}
          <Button variant="secondary" size="sm" onClick={() => handleOperator("-")}>−</Button>
          {["4","5","6"].map(n => <Button key={n} variant="outline" size="sm" onClick={() => handleNumber(n)}>{n}</Button>)}
          <Button variant="secondary" size="sm" onClick={() => handleOperator("+")}>+</Button>
          {["1","2","3","0"].map(n => <Button key={n} variant="outline" size="sm" onClick={() => handleNumber(n)}>{n}</Button>)}
          <Button variant="outline" size="sm" onClick={handleDecimal}>.</Button>
          <Button className="bg-primary" size="sm" onClick={handleEquals}>=</Button>
        </div>
      </CardContent>
    </Card>
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
