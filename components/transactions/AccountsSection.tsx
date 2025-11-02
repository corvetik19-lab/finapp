"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils/format";
import styles from "./Transactions.module.css";

type Account = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  credit_limit: number | null;
};

type AccountsSectionProps = {
  accounts: Account[];
};

export default function AccountsSection({ accounts }: AccountsSectionProps) {
  // Состояния для сворачивания секций с сохранением в localStorage
  const [debitExpanded, setDebitExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('accounts_debit_expanded');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [creditExpanded, setCreditExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('accounts_credit_expanded');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [loansExpanded, setLoansExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('accounts_loans_expanded');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [othersExpanded, setOthersExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('accounts_others_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  // Разделяем счета на категории
  const debitCards = accounts.filter(
    (a) => a.type === "card" && (!a.credit_limit || a.credit_limit === 0)
  );
  const creditCards = accounts.filter(
    (a) => a.type === "card" && a.credit_limit && a.credit_limit > 0
  );
  const loans = accounts.filter((a) => a.type === "loan");
  const others = accounts.filter(
    (a) => a.type !== "card" && a.type !== "loan"
  );

  // Функции для переключения с сохранением в localStorage
  const toggleDebit = () => {
    const newValue = !debitExpanded;
    setDebitExpanded(newValue);
    localStorage.setItem('accounts_debit_expanded', String(newValue));
  };

  const toggleCredit = () => {
    const newValue = !creditExpanded;
    setCreditExpanded(newValue);
    localStorage.setItem('accounts_credit_expanded', String(newValue));
  };

  const toggleLoans = () => {
    const newValue = !loansExpanded;
    setLoansExpanded(newValue);
    localStorage.setItem('accounts_loans_expanded', String(newValue));
  };

  const toggleOthers = () => {
    const newValue = !othersExpanded;
    setOthersExpanded(newValue);
    localStorage.setItem('accounts_others_expanded', String(newValue));
  };

  const renderAccountCard = (a: Account) => {
    const currentBalance = a.balance ?? 0;
    let icon = "account_balance_wallet";
    let typeLabel = "";

    if (a.type === "card") {
      if (a.credit_limit && a.credit_limit > 0) {
        icon = "credit_card";
        typeLabel = "💳 Кредитная";
      } else {
        icon = "payment";
        typeLabel = "💳 Дебетовая";
      }
    } else if (a.type === "cash") {
      icon = "payments";
      typeLabel = "💵 Наличные";
    } else if (a.type === "loan") {
      icon = "account_balance";
      typeLabel = "💰 Кредит";
    } else if (a.type === "bank") {
      icon = "account_balance";
      typeLabel = "🏦 Счёт";
    }

    return (
      <div key={a.id} className={styles.accountCard}>
        <div className={styles.accountHeader}>
          <span
            className="material-icons"
            style={{ fontSize: 20, color: "var(--primary-color)" }}
          >
            {icon}
          </span>
          {typeLabel && <span className={styles.accountType}>{typeLabel}</span>}
        </div>
        <div className={styles.accountName}>{a.name}</div>
        <div className={styles.accountBalance}>
          {formatMoney(currentBalance, a.currency)}
        </div>
      </div>
    );
  };

  return (
    <>
      {debitCards.length > 0 && (
        <section className={styles.accountsSection}>
          <div
            className={styles.accountsSectionHeader}
            onClick={toggleDebit}
          >
            <h3 className={styles.accountsTitle}>💳 Дебетовые карты</h3>
            <span className="material-icons" style={{ cursor: "pointer" }}>
              {debitExpanded ? "expand_less" : "expand_more"}
            </span>
          </div>
          {debitExpanded && (
            <div className={styles.accounts}>
              {debitCards.map(renderAccountCard)}
            </div>
          )}
        </section>
      )}

      {creditCards.length > 0 && (
        <section className={styles.accountsSection}>
          <div
            className={styles.accountsSectionHeader}
            onClick={toggleCredit}
          >
            <h3 className={styles.accountsTitle}>💳 Кредитные карты</h3>
            <span className="material-icons" style={{ cursor: "pointer" }}>
              {creditExpanded ? "expand_less" : "expand_more"}
            </span>
          </div>
          {creditExpanded && (
            <div className={styles.accounts}>
              {creditCards.map(renderAccountCard)}
            </div>
          )}
        </section>
      )}

      {loans.length > 0 && (
        <section className={styles.accountsSection}>
          <div
            className={styles.accountsSectionHeader}
            onClick={toggleLoans}
          >
            <h3 className={styles.accountsTitle}>💰 Кредиты</h3>
            <span className="material-icons" style={{ cursor: "pointer" }}>
              {loansExpanded ? "expand_less" : "expand_more"}
            </span>
          </div>
          {loansExpanded && (
            <div className={styles.accounts}>{loans.map(renderAccountCard)}</div>
          )}
        </section>
      )}

      {others.length > 0 && (
        <section className={styles.accountsSection}>
          <div
            className={styles.accountsSectionHeader}
            onClick={toggleOthers}
          >
            <h3 className={styles.accountsTitle}>🏦 Другие счета</h3>
            <span className="material-icons" style={{ cursor: "pointer" }}>
              {othersExpanded ? "expand_less" : "expand_more"}
            </span>
          </div>
          {othersExpanded && (
            <div className={styles.accounts}>{others.map(renderAccountCard)}</div>
          )}
        </section>
      )}
    </>
  );
}
