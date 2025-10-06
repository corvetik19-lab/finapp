"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  CommonNotifications,
} from "@/lib/notifications/helpers";
import styles from "./TestNotifications.module.css";

export default function TestNotificationsPage() {
  const { addNotification, clearAll } = useNotifications();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Тестирование системы уведомлений</h1>
        <p>Нажимайте на кнопки для создания разных типов уведомлений</p>
      </div>

      <div className={styles.section}>
        <h2>Базовые типы</h2>
        <div className={styles.grid}>
          <button
            type="button"
            className={`${styles.button} ${styles.success}`}
            onClick={() =>
              addNotification(
                notifySuccess({
                  title: "Успешно!",
                  message: "Операция выполнена успешно",
                  actionUrl: "/dashboard",
                  actionLabel: "На дашборд",
                })
              )
            }
          >
            <span className="material-icons">check_circle</span>
            Success
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.error}`}
            onClick={() =>
              addNotification(
                notifyError({
                  title: "Ошибка!",
                  message: "Не удалось выполнить операцию",
                })
              )
            }
          >
            <span className="material-icons">error</span>
            Error
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.warning}`}
            onClick={() =>
              addNotification(
                notifyWarning({
                  title: "Внимание!",
                  message: "Требуется ваше внимание",
                  actionUrl: "/settings",
                  actionLabel: "В настройки",
                })
              )
            }
          >
            <span className="material-icons">warning</span>
            Warning
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.info}`}
            onClick={() =>
              addNotification(
                notifyInfo({
                  title: "Информация",
                  message: "Полезная информация для вас",
                })
              )
            }
          >
            <span className="material-icons">info</span>
            Info
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Готовые уведомления</h2>

        <h3>Транзакции</h3>
        <div className={styles.grid}>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.transactionCreated("1 500 ₽"))}
          >
            Транзакция создана
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.transactionUpdated())}
          >
            Транзакция обновлена
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.transactionDeleted())}
          >
            Транзакция удалена
          </button>
        </div>

        <h3>Бюджеты</h3>
        <div className={styles.grid}>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.budgetExceeded("Продукты", 105))}
          >
            Бюджет превышен
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.budgetCreated())}
          >
            Бюджет создан
          </button>
        </div>

        <h3>Платежи</h3>
        <div className={styles.grid}>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.paymentDue("Коммунальные услуги", 3))}
          >
            Предстоящий платеж
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.paymentOverdue("Интернет"))}
          >
            Просроченный платеж
          </button>
        </div>

        <h3>Планы</h3>
        <div className={styles.grid}>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.planGoalReached("Отпуск"))}
          >
            Цель достигнута
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.planProgress("Машина", 75))}
          >
            Прогресс плана
          </button>
        </div>

        <h3>Долги</h3>
        <div className={styles.grid}>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.debtCreated())}
          >
            Долг добавлен
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.debtPaid("Иван"))}
          >
            Долг оплачен
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => addNotification(CommonNotifications.debtOverdue("Петр"))}
          >
            Долг просрочен
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Управление</h2>
        <button
          type="button"
          className={`${styles.button} ${styles.clear}`}
          onClick={clearAll}
        >
          <span className="material-icons">clear_all</span>
          Очистить все уведомления
        </button>
      </div>
    </div>
  );
}
