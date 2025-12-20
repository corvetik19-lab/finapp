"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Star,
  Phone,
  Mail,
  Building2,
  Send,
  CheckCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import { SupplierCategory } from "@/lib/suppliers/types";
import {
  MatchedSupplier,
  MatchingCriteria,
  matchSuppliersForTender,
  bulkInviteSuppliers,
} from "@/lib/suppliers/matching-service";

interface Tender {
  id: string;
  subject: string;
  purchase_number?: string;
  status: string;
  max_price?: number;
}

interface TenderSupplierMatcherProps {
  categories: SupplierCategory[];
  tenders: Tender[];
}

export function TenderSupplierMatcher({ categories, tenders }: TenderSupplierMatcherProps) {
  const router = useRouter();
  const [selectedTender, setSelectedTender] = useState<string>("");
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    excludeBlacklisted: true,
    maxResults: 20,
  });
  const [results, setResults] = useState<MatchedSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: number; failed: number } | null>(null);

  const handleSearch = useCallback(async () => {
    if (!selectedTender) return;

    setLoading(true);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const matched = await matchSuppliersForTender(selectedTender, criteria);
      setResults(matched);
    } catch (error) {
      console.error("Error matching suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTender, criteria]);

  const handleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleInvite = async () => {
    if (selectedIds.size === 0 || !selectedTender) return;

    setInviting(true);
    try {
      const result = await bulkInviteSuppliers(
        selectedTender,
        Array.from(selectedIds),
        "platform"
      );
      setInviteResult(result);
    } catch (error) {
      console.error("Error inviting suppliers:", error);
    } finally {
      setInviting(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "—";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const selectedTenderData = tenders.find(t => t.id === selectedTender);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Подбор поставщиков под тендер
        </h1>
        <p className="text-muted-foreground">
          Умный подбор подходящих поставщиков на основе критериев
        </p>
      </div>

      {/* Выбор тендера и критерии */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Параметры подбора</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Тендер</Label>
              <Select value={selectedTender} onValueChange={setSelectedTender}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тендер" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map((tender) => (
                    <SelectItem key={tender.id} value={tender.id}>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[400px]">
                          {tender.subject}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tender.purchase_number} • {formatPrice(tender.max_price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Категории поставщиков</Label>
                <Select
                  value={criteria.categoryIds?.[0] || "all"}
                  onValueChange={(v) =>
                    setCriteria((prev) => ({
                      ...prev,
                      categoryIds: v === "all" ? undefined : [v],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Минимальный рейтинг</Label>
                <Select
                  value={String(criteria.minRating || 0)}
                  onValueChange={(v) =>
                    setCriteria((prev) => ({
                      ...prev,
                      minRating: parseInt(v) || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Любой</SelectItem>
                    <SelectItem value="3">От 3 ★</SelectItem>
                    <SelectItem value="4">От 4 ★</SelectItem>
                    <SelectItem value="5">Только 5 ★</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exclude-blacklist"
                  checked={criteria.excludeBlacklisted}
                  onCheckedChange={(checked) =>
                    setCriteria((prev) => ({ ...prev, excludeBlacklisted: !!checked }))
                  }
                />
                <Label htmlFor="exclude-blacklist">Исключить чёрный список</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-phone"
                  checked={criteria.hasPhone}
                  onCheckedChange={(checked) =>
                    setCriteria((prev) => ({ ...prev, hasPhone: !!checked }))
                  }
                />
                <Label htmlFor="has-phone">С телефоном</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-email"
                  checked={criteria.hasEmail}
                  onCheckedChange={(checked) =>
                    setCriteria((prev) => ({ ...prev, hasEmail: !!checked }))
                  }
                />
                <Label htmlFor="has-email">С email</Label>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={!selectedTender || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Поиск...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Подобрать поставщиков
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {selectedTenderData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Выбранный тендер</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium line-clamp-2">{selectedTenderData.subject}</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>№ {selectedTenderData.purchase_number || "—"}</p>
                <p>НМЦ: {formatPrice(selectedTenderData.max_price)}</p>
                <Badge variant="outline">{selectedTenderData.status}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Результаты */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Найдено: {results.length} поставщиков</CardTitle>
                <CardDescription>
                  Отсортированы по релевантности
                </CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Пригласить ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === results.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">Скор</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead>История</TableHead>
                  <TableHead>Рекомендации</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(supplier.id)}
                        onCheckedChange={() => handleSelectOne(supplier.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={supplier.matchScore} className="w-12 h-2" />
                        <span className="text-sm font-medium">{supplier.matchScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.short_name || supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.inn && `ИНН ${supplier.inn}`}
                        </p>
                        {supplier.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {(supplier.category as { name: string }).name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{supplier.rating}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {supplier.previousTenders ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {supplier.previousTenders} тендеров
                            </div>
                            {supplier.winRate !== undefined && supplier.winRate > 0 && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Trophy className="h-3 w-3" />
                                {supplier.winRate.toFixed(0)}% побед
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Новый</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.matchReasons.slice(0, 2).map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-xs block w-fit">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Диалог приглашения */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить поставщиков</DialogTitle>
            <DialogDescription>
              Выбрано {selectedIds.size} поставщиков для приглашения в тендер
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="text-lg font-semibold">Приглашения отправлены!</p>
                <p className="text-sm text-muted-foreground">
                  Успешно: {inviteResult.success}, Ошибок: {inviteResult.failed}
                </p>
              </div>
              <Button onClick={() => {
                setInviteDialogOpen(false);
                setInviteResult(null);
                router.push(`/tenders/${selectedTender}`);
              }}>
                Перейти к тендеру
              </Button>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p>Поставщики будут приглашены к участию в тендере:</p>
                <p className="font-medium mt-2">{selectedTenderData?.subject}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Пригласить
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
