import Link from "next/link";
import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";

type AccountGroup = {
  name: string;
  icon: string;
  iconClass: string;
  balance: number;
  isDebt?: boolean;
};

type NetWorthWidgetProps = {
  accounts: AccountGroup[];
  totalAssets: number;
  totalDebts: number;
  currency: string;
  monthlyChange?: number;
};

export default function NetWorthWidget({
  accounts,
  totalAssets,
  totalDebts,
  currency,
  monthlyChange = 0,
}: NetWorthWidgetProps) {
  const totalMinor = totalAssets - totalDebts;
  const isPositiveChange = monthlyChange >= 0;

  return (
    <section className={styles.netWorthWidget}>
      <div className={styles.netWorthHeader}>
        <div className={styles.netWorthTitleGroup}>
          <span className="material-icons" aria-hidden>
            account_balance
          </span>
          <div className={styles.netWorthTitle}>Чистые активы</div>
        </div>
        <Link href="/transactions" className={styles.netWorthAction}>
          Детали
        </Link>
      </div>

      <div className={styles.netWorthSummary}>
        <div className={styles.netWorthAmount}>{formatMoney(totalMinor, currency)}</div>
        <div className={`${styles.netWorthChange} ${isPositiveChange ? styles.netWorthChangePositive : styles.netWorthChangeNegative}`}>
          <span className="material-icons" aria-hidden>
            {isPositiveChange ? "arrow_upward" : "arrow_downward"}
          </span>
          <span>{isPositiveChange ? "+" : ""}{monthlyChange.toFixed(1)}% за месяц</span>
        </div>
      </div>

      <div className={styles.netWorthBreakdown}>
        {accounts
          .filter((account) => !account.isDebt)
          .map((account) => (
            <div key={account.name} className={styles.assetItem}>
              <div className={styles.assetInfo}>
                <div className={`${styles.assetIcon} ${styles[account.iconClass]}`}>
                  <span className="material-icons" aria-hidden>
                    {account.icon}
                  </span>
                </div>
                <div className={styles.assetName}>{account.name}</div>
              </div>
              <div className={styles.assetValue}>
                {formatMoney(account.balance, currency)}
              </div>
            </div>
          ))}
        
        {accounts.some((account) => account.isDebt) && (
          <>
            <div className={styles.netWorthDivider} />
            {accounts
              .filter((account) => account.isDebt)
              .map((account) => (
                <div key={account.name} className={styles.assetItem}>
                  <div className={styles.assetInfo}>
                    <div className={`${styles.assetIcon} ${styles[account.iconClass]}`}>
                      <span className="material-icons" aria-hidden>
                        {account.icon}
                      </span>
                    </div>
                    <div className={styles.assetName}>{account.name}</div>
                  </div>
                  <div className={`${styles.assetValue} ${styles.debtValue}`}>
                    -{formatMoney(account.balance, currency)}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </section>
  );
}
