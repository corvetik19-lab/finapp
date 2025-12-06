import { createRSCClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import AddCardModal from "./AddCardModal";
import AddFundsModal from "./AddFundsModal";
import TransferModalLauncher from "./TransferModalLauncher";
import DeleteDebitCardButton from "@/components/cards/DeleteDebitCardButton";
import EditDebitCardButton from "@/components/cards/EditDebitCardButton";
import { getCurrentCompanyId } from "@/lib/platform/organization";

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
  const companyId = await getCurrentCompanyId();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  let accountsQuery = supabase
    .from("accounts")
    .select("id,name,currency,balance")
    .eq("type", "card")
    .is("credit_limit", null) // Только дебетовые карты (без кредитного лимита)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (companyId) {
    accountsQuery = accountsQuery.eq("company_id", companyId);
  }

  const { data: accountsRaw } = await accountsQuery;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Счета</h1>
          <p className="text-sm text-muted-foreground">Управление дебетовыми картами</p>
        </div>
        <AddCardModal />
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accountsData.map((card, idx) => {
          const stash = stashByAccount.get(card.id);
          const balance = balanceByAccount.get(card.id) ?? 0;
          
          const stashLimit = stash?.target_amount ?? 0;
          const stashAvailable = stash?.balance ?? 0;
          const stashUsed = stashLimit - stashAvailable;
          const usedPercent = usagePercent(stashAvailable, stashLimit);

          return (
            <Card key={card.id} className={idx === 0 ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(balance, card.currency)}</p>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <EditDebitCardButton 
                      cardId={card.id} 
                      cardName={card.name}
                      cardBalance={balance}
                    />
                    <DeleteDebitCardButton 
                      cardId={card.id} 
                      cardName={card.name}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {stash ? (
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">💰 Кубышка</span>
                      <span className="text-sm font-bold">{formatCurrency(stashAvailable, stash.currency)}</span>
                    </div>
                    <Progress value={usedPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Лимит: {formatCurrency(stashLimit, stash.currency)} • Использовано: {formatCurrency(stashUsed, stash.currency)} ({usedPercent}%)
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    💭 Кубышка ещё не настроена
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {accountsData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Пока нет ни одной карты. Добавьте карту, чтобы начать работать с Кубышкой.
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
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
