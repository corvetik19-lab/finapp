import { createRSCClient } from "@/lib/supabase/server";
import styles from "./cards.module.css";
import AddCardModal from "./AddCardModal";
import AddFundsModal from "./AddFundsModal";
import TransferModalLauncher from "./TransferModalLauncher";

type CardRow = {
  id: string;
  name: string;
  currency: string;
};

type StashRow = {
  id: string;
  account_id: string;
  target_amount: number | null;
  balance: number;
  currency: string;
};

type TxRow = {
  account_id: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
};

type TransferOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
  stashId: string;
  stashBalance: number;
  stashCurrency: string;
};

type FundsOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
};

function formatCurrency(minor: number | null | undefined, currency: string) {
  const major = (minor ?? 0) / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(major);
}

function progressPercent(balance: number, target: number | null | undefined) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((balance / target) * 100)));
}

export default async function CardsPage() {
  const supabase = await createRSCClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  const { data: accountsRaw } = await supabase
    .from("accounts")
    .select("id,name,currency")
    .eq("type", "card")
    .order("created_at", { ascending: true });
  const accountsData: CardRow[] = (accountsRaw ?? []) as CardRow[];

  let stashes: StashRow[] = [];
  let transactions: TxRow[] = [];

  if (userId) {
    const { data: stashRows } = await supabase
      .from("account_stashes")
      .select("id,account_id,target_amount,balance,currency")
      .eq("user_id", userId);
    stashes = (stashRows ?? []) as StashRow[];

    const { data: txRows } = await supabase
      .from("transactions")
      .select("account_id,direction,amount")
      .eq("user_id", userId);
    transactions = (txRows ?? []) as TxRow[];
  }

  const balanceByAccount = new Map<string, number>();
  for (const tx of transactions) {
    const delta = tx.direction === "income" ? tx.amount : tx.direction === "expense" ? -tx.amount : 0;
    balanceByAccount.set(tx.account_id, (balanceByAccount.get(tx.account_id) ?? 0) + delta);
  }

  const stashByAccount = new Map<string, StashRow>();
  for (const stash of stashes) {
    stashByAccount.set(stash.account_id, stash);
  }

  const transferOptions: TransferOption[] = accountsData
    .map((card) => {
      const stash = stashByAccount.get(card.id);
      if (!stash) return null;
      const cardBalance = balanceByAccount.get(card.id) ?? 0;
      return {
        accountId: card.id,
        accountName: card.name,
        cardBalance,
        cardCurrency: card.currency,
        stashId: stash.id,
        stashBalance: stash.balance,
        stashCurrency: stash.currency,
      };
    })
    .filter((item): item is TransferOption => Boolean(item));

  const fundsOptions: FundsOption[] = accountsData.map((card) => ({
    accountId: card.id,
    accountName: card.name,
    cardBalance: balanceByAccount.get(card.id) ?? 0,
    cardCurrency: card.currency,
  }));

  return (
    <div className={styles.cardsPage}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Дебетовые карты</div>
        <AddCardModal triggerClassName={styles.addCardBtn} />
      </div>

      <div className={styles.cardsContainer}>
        {accountsData.map((card, idx) => {
          const stash = stashByAccount.get(card.id);
          const balance = balanceByAccount.get(card.id) ?? 0;
          const percent = progressPercent(stash?.balance ?? 0, stash?.target_amount);

          return (
            <div key={card.id} className={`${styles.debitCard}${idx === 0 ? " " + styles.debitCardActive : ""}`}>
              <div className={styles.cardBalance}>{formatCurrency(balance, card.currency)}</div>
              <div className={styles.cardType}>{card.name}</div>

              {stash ? (
                <div className={styles.kubyshkaInfo}>
                  <div>Кубышка: {formatCurrency(stash.balance, stash.currency)}</div>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: stash.target_amount ? `${percent}%` : "0%" }} />
                    </div>
                  </div>
                  <div>
                    Доступно: {formatCurrency(stash.balance, stash.currency)} из {stash.target_amount ? formatCurrency(stash.target_amount, stash.currency) : "—"}
                  </div>
                </div>
              ) : (
                <div className={styles.kubyshkaInfo}>
                  <div>Кубышка ещё не настроена</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accountsData.length === 0 && (
        <div className={styles.emptyState}>Пока нет ни одной карты. Добавьте карту, чтобы начать работать с Кубышкой.</div>
      )}

      <div className={styles.quickActions}>
        <AddFundsModal icon="add_circle" label="Добавить средства" options={fundsOptions} />
        <TransferModalLauncher
          mode="to_stash"
          icon="arrow_upward"
          label="Перевод в Кубышку"
          options={transferOptions}
        />
        <TransferModalLauncher
          mode="from_stash"
          icon="arrow_downward"
          label="Перевод из Кубышки"
          options={transferOptions}
        />
      </div>
    </div>
  );
}
