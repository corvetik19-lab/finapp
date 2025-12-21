"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

interface ZakupkiPurchase {
  regNumber: string;
  purchaseName: string;
  publishDate: string;
  maxPrice?: number;
  customer: { name: string };
  status: string;
}

export function ZakupkiIntegration() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inn, setInn] = useState("");
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<ZakupkiPurchase[]>([]);
  const [rnpStatus, setRnpStatus] = useState<"clean" | "found" | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    // TODO: Вызов API поиска
    setTimeout(() => {
      setPurchases([]);
      setLoading(false);
    }, 1000);
  };

  const handleCheckRNP = async () => {
    if (!inn) return;
    setLoading(true);
    // TODO: Вызов API проверки РНП
    setTimeout(() => {
      setRnpStatus("clean");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Интеграция с Госзакупками
          </CardTitle>
          <CardDescription>
            Поиск закупок, проверка в РНП, импорт участников
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Проверка РНП */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Проверка в реестре недобросовестных поставщиков
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="rnp-inn">ИНН поставщика</Label>
                <Input
                  id="rnp-inn"
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  placeholder="Введите ИНН"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCheckRNP} disabled={!inn || loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Проверить
                </Button>
              </div>
            </div>
            {rnpStatus && (
              <div className={`p-3 rounded-lg ${
                rnpStatus === "clean" 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {rnpStatus === "clean" ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Поставщик не найден в реестре недобросовестных
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Поставщик найден в реестре недобросовестных!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Поиск закупок */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Поиск закупок
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Номер закупки или ключевые слова"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Найти
              </Button>
            </div>

            {purchases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Заказчик</TableHead>
                    <TableHead>НМЦ</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.regNumber}>
                      <TableCell className="font-mono text-sm">
                        {purchase.regNumber}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {purchase.purchaseName}
                      </TableCell>
                      <TableCell>{purchase.customer.name}</TableCell>
                      <TableCell>
                        {purchase.maxPrice ? formatMoney(purchase.maxPrice, "RUB") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{purchase.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a
                              href={`https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=${purchase.regNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Введите запрос для поиска закупок
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
