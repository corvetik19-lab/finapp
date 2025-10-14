import { createRSCClient } from "@/lib/supabase/server";
import styles from "./cards.module.css";
import AddCardModal from "./AddCardModal";
import AddFundsModal from "./AddFundsModal";
import TransferModalLauncher from "./TransferModalLauncher";
import DeleteDebitCardButton from "@/components/cards/DeleteDebitCardButton";
import EditDebitCardButton from "@/components/cards/EditDebitCardButton";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

type CardRow = {
  id: string;
  name: string;
  currency: string;
  balance: number;
};

type StashRow = {
  id: string;
  account_id: string;
  target_amount: number | null;
  balance: number;
  currency: string;
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
  
  // Для рублей не показываем код валюты
  if (currency === "RUB") {
    return `${major.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  }
  
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

function usagePercent(available: number, limit: number | null | undefined) {
  if (!limit || limit <= 0) return 0;
  // Кубышка - виртуальный лимит. available = сколько доступно
  // Использовано = limit - available
  const used = limit - available;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export default async function CardsPage() {
  const supabase = await createRSCClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  const { data: accountsRaw } = await supabase
    .from("accounts")
    .select("id,name,currency,balance")
    .eq("type", "card")
    .is("credit_limit", null) // Только дебетовые карты (без кредитного лимита)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  const accountsData: CardRow[] = (accountsRaw ?? []) as CardRow[];

  let stashes: StashRow[] = [];

  if (userId) {
    const { data: stashRows } = await supabase
      .from("account_stashes")
      .select("id,account_id,target_amount,balance,currency")
      .eq("user_id", userId);
    stashes = (stashRows ?? []) as StashRow[];
  }

  // Используем баланс напрямую из БД (balance уже актуальный)
  const balanceByAccount = new Map<string, number>();
  for (const card of accountsData) {
    balanceByAccount.set(card.id, card.balance ?? 0);
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
          
          // Кубышка - виртуальный лимит от банка
          const stashLimit = stash?.target_amount ?? 0;
          const stashAvailable = stash?.balance ?? 0;
          const stashUsed = stashLimit - stashAvailable;
          const usedPercent = usagePercent(stashAvailable, stashLimit);

          return (
            <div key={card.id} className={`${styles.debitCard}${idx === 0 ? " " + styles.debitCardActive : ""}`}>
              {/* Верхняя часть с балансом и кнопками действий */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div className={styles.cardBalance}>{formatCurrency(balance, card.currency)}</div>
                  <div className={styles.cardType}>{card.name}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <EditDebitCardButton 
                    cardId={card.id} 
                    cardName={card.name}
                    className={styles.editCardBtn}
                  />
                  <DeleteDebitCardButton 
                    cardId={card.id} 
                    cardName={card.name}
                    className={styles.deleteCardBtn}
                  />
                </div>
              </div>

              {/* Информация о кубышке */}
              {stash ? (
                <div className={styles.kubyshkaInfo}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>💰 Кубышка (виртуальный лимит)</span>
                    <span style={{ fontSize: "14px", fontWeight: 700 }}>{formatCurrency(stashAvailable, stash.currency)}</span>
                  </div>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${usedPercent}%` }} />
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Лимит: {formatCurrency(stashLimit, stash.currency)} • Использовано: {formatCurrency(stashUsed, stash.currency)} ({usedPercent}%)
                  </div>
                </div>
              ) : (
                <div className={styles.kubyshkaInfo}>
                  <div style={{ opacity: 0.8, textAlign: "center" }}>💭 Кубышка ещё не настроена</div>
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
