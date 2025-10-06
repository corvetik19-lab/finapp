import styles from "./CreditCardDetails.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { CreditCard } from "./CreditCardsList";

type CreditCardDetailsProps = {
  card: CreditCard;
};

// Функция для правильного склонения слова "день"
function getDaysWord(days: number): string {
  const absNum = Math.abs(days);
  const lastDigit = absNum % 10;
  const lastTwoDigits = absNum % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "дней";
  }
  if (lastDigit === 1) {
    return "день";
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }
  return "дней";
}

export default function CreditCardDetails({ card }: CreditCardDetailsProps) {
  const utilizationPercent = Math.round((card.balance / card.limit) * 100);
  
  // Рассчитываем количество дней до платежа
  const calculateDaysUntilPayment = (): number | null => {
    if (!card.nextPaymentDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const paymentDate = new Date(card.nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilPayment = calculateDaysUntilPayment();

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Детали карты</h2>
        <div className={styles.detailsGrid}>
          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Банк:</span>
              <span className={styles.detailValue}>{card.bank}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Кредитный лимит:</span>
              <span className={styles.detailValue}>{formatMoney(card.limit, card.currency)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Процентная ставка:</span>
              <span className={styles.detailValue}>{card.interestRate}%</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Льготный период:</span>
              <span className={styles.detailValue}>{card.gracePeriod} дней</span>
            </div>
          </div>

          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Текущая задолженность:</span>
              <span className={styles.detailValue}>{formatMoney(card.balance, card.currency)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Минимальный платеж:</span>
              <span className={styles.detailValue}>{formatMoney(card.minPayment, card.currency)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Доступный лимит:</span>
              <span className={styles.detailValue}>{formatMoney(card.available, card.currency)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Следующий платеж:</span>
              <span className={styles.detailValue}>
                {card.nextPaymentDate 
                  ? new Date(card.nextPaymentDate).toLocaleDateString("ru-RU")
                  : "Не указано"
                }
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Дней до платежа:</span>
              <span 
                className={styles.detailValue}
                style={{
                  color: daysUntilPayment !== null && daysUntilPayment < 0 
                    ? "var(--danger)" 
                    : daysUntilPayment !== null && daysUntilPayment <= 3 
                      ? "var(--warning)" 
                      : undefined
                }}
              >
                {daysUntilPayment !== null 
                  ? `${daysUntilPayment} ${getDaysWord(daysUntilPayment)}`
                  : "—"
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Использование лимита</h2>
        <div className={styles.utilizationCard}>
          <div className={styles.utilizationHeader}>
            <span className={styles.utilizationLabel}>Использовано</span>
            <span className={styles.utilizationPercent}>{utilizationPercent}%</span>
          </div>
          <div className={styles.utilizationBar}>
            <div
              className={styles.utilizationFill}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
          <div className={styles.utilizationInfo}>
            <span>{formatMoney(card.balance, card.currency)} из {formatMoney(card.limit, card.currency)}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Рекомендации</h2>
        <div className={styles.tipsGrid}>
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>
              <span className="material-icons" aria-hidden>
                trending_down
              </span>
            </div>
            <div className={styles.tipContent}>
              <div className={styles.tipTitle}>Частичное досрочное погашение</div>
              <div className={styles.tipText}>
                Выплата {formatMoney(card.minPayment * 2, card.currency)} снизит использование лимита.
              </div>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>
              <span className="material-icons" aria-hidden>
                event
              </span>
            </div>
            <div className={styles.tipContent}>
              <div className={styles.tipTitle}>Разбейте платёж</div>
              <div className={styles.tipText}>
                Несколько небольших выплат упростят достижение цели по снижению задолженности.
              </div>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>
              <span className="material-icons" aria-hidden>
                notifications
              </span>
            </div>
            <div className={styles.tipContent}>
              <div className={styles.tipTitle}>Напоминания</div>
              <div className={styles.tipText}>
                Включите напоминания, чтобы не пропустить платежи и избежать штрафов.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
