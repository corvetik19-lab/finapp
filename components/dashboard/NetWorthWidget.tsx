import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, TrendingUp, TrendingDown, CreditCard, Wallet, Banknote, Building } from "lucide-react";

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  credit_card: CreditCard,
  account_balance_wallet: Wallet,
  payments: Banknote,
  account_balance: Building,
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Чистые активы
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance/transactions">Детали</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className={`text-2xl font-bold ${totalMinor < 0 ? "text-red-600" : ""}`}>
            {formatMoney(totalMinor, currency)}
          </div>
          <div className={`flex items-center gap-1 text-sm ${isPositiveChange ? "text-green-600" : "text-red-600"}`}>
            {isPositiveChange ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{isPositiveChange ? "+" : ""}{monthlyChange.toFixed(1)}% за месяц</span>
          </div>
        </div>

        <div className="space-y-2">
          {accounts.filter((a) => !a.isDebt).map((account) => {
            const Icon = ICON_MAP[account.icon] || Wallet;
            return (
              <div key={account.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{account.name}</span>
                </div>
                <span className="font-medium text-sm">{formatMoney(account.balance, currency)}</span>
              </div>
            );
          })}

          {accounts.some((a) => a.isDebt) && (
            <>
              <div className="border-t my-2" />
              {accounts.filter((a) => a.isDebt).map((account) => {
                const Icon = ICON_MAP[account.icon] || Building;
                return (
                  <div key={account.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{account.name}</span>
                    </div>
                    <span className="font-medium text-sm text-red-600">-{formatMoney(account.balance, currency)}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
