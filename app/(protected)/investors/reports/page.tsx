import { getInvestments, getSources } from "@/lib/investors/service";
import { formatMoney } from "@/lib/investors/calculations";
import { INVESTMENT_STATUS_LABELS } from "@/lib/investors/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, Building2, FileText } from "lucide-react";

export default async function InvestorsReportsPage() {
  const [investments, sources] = await Promise.all([
    getInvestments(),
    getSources(),
  ]);

  const activeInvestments = investments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );

  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
  const totalInterest = activeInvestments.reduce((sum, i) => sum + i.interest_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Отчёты</h1>
        <p className="text-muted-foreground">Аналитика и отчёты по инвестициям</p>
      </div>

      {/* Сводка */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Источники</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sources.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Активных инвестиций</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInvestments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Привлечено</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalInvested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Проценты</CardTitle>
            <PieChart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatMoney(totalInterest)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Отчёты */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              По источникам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => {
                  const sourceInvestments = activeInvestments.filter((i) => i.source_id === source.id);
                  const amount = sourceInvestments.reduce((s, i) => s + i.approved_amount, 0);
                  return (
                    <div key={source.id} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{source.name}</span>
                      <span className="font-bold">{formatMoney(amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              По статусам
            </CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  investments.reduce((acc, inv) => {
                    acc[inv.status] = (acc[inv.status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([status, count]) => (
                  <div key={status} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">{INVESTMENT_STATUS_LABELS[status as keyof typeof INVESTMENT_STATUS_LABELS] || status}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="text-center py-8">
        <CardContent>
          <p className="text-muted-foreground">Расширенные отчёты и экспорт в разработке</p>
        </CardContent>
      </Card>
    </div>
  );
}
