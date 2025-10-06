"use client";

import { useState } from "react";
import styles from "./AutoPayments.module.css";

interface PaymentResult {
  success: boolean;
  totalCreated: number;
  details: {
    creditCards: {
      success: boolean;
      count: number;
      error: string | null;
    };
    loans: {
      success: boolean;
      count: number;
      error: string | null;
    };
  };
  message: string;
}

export default function AutoPaymentsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAutoPayments = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/cron/auto-payments", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при создании платежей");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Автоматические платежи</h1>
        <p className={styles.description}>
          Создание напоминаний о платежах по кредитам и кредитным картам
        </p>
      </div>

      <div className={styles.card}>
        <h2>Как это работает?</h2>
        <ul className={styles.infoList}>
          <li>
            <span className="material-icons">credit_card</span>
            <div>
              <strong>Кредитные карты:</strong> создаёт платёж за 10 дней до срока оплаты,
              если есть задолженность
            </div>
          </li>
          <li>
            <span className="material-icons">account_balance</span>
            <div>
              <strong>Кредиты:</strong> создаёт платёж за 10 дней до даты следующего платежа
            </div>
          </li>
          <li>
            <span className="material-icons">event_repeat</span>
            <div>
              <strong>Автоматический запуск:</strong> каждый день в 9:00 UTC (12:00 МСК)
            </div>
          </li>
        </ul>
      </div>

      <div className={styles.card}>
        <h2>Ручной запуск</h2>
        <p>Нажмите кнопку ниже, чтобы проверить и создать платежи прямо сейчас</p>
        
        <button
          className={styles.runButton}
          onClick={handleRunAutoPayments}
          disabled={isLoading}
        >
          <span className="material-icons">
            {isLoading ? "hourglass_empty" : "play_arrow"}
          </span>
          {isLoading ? "Проверка..." : "Запустить проверку"}
        </button>
      </div>

      {error && (
        <div className={styles.errorCard}>
          <span className="material-icons">error</span>
          <div>
            <strong>Ошибка</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <span className="material-icons">
              {result.success ? "check_circle" : "warning"}
            </span>
            <h3>{result.success ? "Успешно!" : "Выполнено с ошибками"}</h3>
          </div>
          
          <p className={styles.resultMessage}>{result.message}</p>

          <div className={styles.detailsGrid}>
            <div className={styles.detailCard}>
              <span className="material-icons">credit_card</span>
              <div>
                <strong>Кредитные карты</strong>
                <p>
                  {result.details.creditCards.success ? (
                    <>Создано платежей: {result.details.creditCards.count}</>
                  ) : (
                    <span className={styles.errorText}>
                      {result.details.creditCards.error}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className={styles.detailCard}>
              <span className="material-icons">account_balance</span>
              <div>
                <strong>Кредиты</strong>
                <p>
                  {result.details.loans.success ? (
                    <>Создано платежей: {result.details.loans.count}</>
                  ) : (
                    <span className={styles.errorText}>
                      {result.details.loans.error}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.totalBadge}>
            <span className="material-icons">event_available</span>
            <strong>Всего создано:</strong> {result.totalCreated}
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h2>Проверка настроек</h2>
        <p>Для корректной работы убедитесь, что:</p>
        <ol className={styles.checkList}>
          <li>Применена миграция <code>20251005_auto_create_loan_payments.sql</code></li>
          <li>У кредитов установлено поле &ldquo;Дата следующего платежа&rdquo;</li>
          <li>У кредитных карт заполнены поля &ldquo;Дата следующего платежа&rdquo; и есть задолженность</li>
          <li>До даты платежа осталось не более 10 дней</li>
        </ol>
      </div>

      <div className={styles.footer}>
        <a href="/payments" className={styles.link}>
          <span className="material-icons">arrow_forward</span>
          Перейти к платежам
        </a>
        <a href="/loans" className={styles.link}>
          <span className="material-icons">arrow_forward</span>
          Перейти к кредитам
        </a>
      </div>
    </div>
  );
}
