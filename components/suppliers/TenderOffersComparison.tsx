"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Scale,
  Trophy,
  Star,
  Phone,
  Mail,
  Truck,
  CreditCard,
  Shield,
  FileText,
  Loader2,
  Award,
} from "lucide-react";
import {
  TenderSupplierOffer,
  OFFER_STATUSES,
  SupplierOfferStatus,
  getTenderOffers,
  updateOfferStatus,
  saveOfferDetails,
  selectWinner,
} from "@/lib/suppliers/matching-service";

interface Tender {
  id: string;
  subject: string;
  purchase_number?: string;
  status: string;
  max_price?: number;
}

interface TenderOffersComparisonProps {
  tenders: Tender[];
}

export function TenderOffersComparison({ tenders }: TenderOffersComparisonProps) {
  const [selectedTender, setSelectedTender] = useState<string>("");
  const [offers, setOffers] = useState<TenderSupplierOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffer, setEditingOffer] = useState<TenderSupplierOffer | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "delivery" | "score">("price");
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<TenderSupplierOffer | null>(null);

  const loadOffers = useCallback(async () => {
    if (!selectedTender) return;

    setLoading(true);
    try {
      const data = await getTenderOffers(selectedTender);
      setOffers(data);
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTender]);

  useEffect(() => {
    if (selectedTender) {
      loadOffers();
    }
  }, [selectedTender, loadOffers]);

  const handleStatusChange = async (offerId: string, status: SupplierOfferStatus) => {
    await updateOfferStatus(offerId, status);
    loadOffers();
  };

  const handleSaveOffer = async () => {
    if (!editingOffer) return;

    setSaving(true);
    try {
      await saveOfferDetails(editingOffer.id, {
        offer_amount: editingOffer.offer_amount,
        offer_delivery_days: editingOffer.offer_delivery_days,
        offer_payment_terms: editingOffer.offer_payment_terms,
        offer_warranty_months: editingOffer.offer_warranty_months,
        evaluation_score: editingOffer.evaluation_score,
        evaluation_notes: editingOffer.evaluation_notes,
      });
      setEditingOffer(null);
      loadOffers();
    } catch (error) {
      console.error("Error saving offer:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWinner = async () => {
    if (!selectedWinner) return;

    setSaving(true);
    try {
      await selectWinner(selectedTender, selectedWinner.id);
      setWinnerDialogOpen(false);
      setSelectedWinner(null);
      loadOffers();
    } catch (error) {
      console.error("Error selecting winner:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "—";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const sortedOffers = [...offers].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return (a.offer_amount || Infinity) - (b.offer_amount || Infinity);
      case "delivery":
        return (a.offer_delivery_days || Infinity) - (b.offer_delivery_days || Infinity);
      case "score":
        return (b.evaluation_score || 0) - (a.evaluation_score || 0);
      default:
        return 0;
    }
  });

  const offersWithPrice = offers.filter(o => o.offer_amount);
  const minPrice = offersWithPrice.length > 0 
    ? Math.min(...offersWithPrice.map(o => o.offer_amount!))
    : 0;
  const maxPrice = offersWithPrice.length > 0
    ? Math.max(...offersWithPrice.map(o => o.offer_amount!))
    : 0;

  // Данные выбранного тендера для будущего использования
  // const selectedTenderData = tenders.find(t => t.id === selectedTender);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6" />
          Сравнение коммерческих предложений
        </h1>
        <p className="text-muted-foreground">
          Анализ и сравнение предложений поставщиков
        </p>
      </div>

      {/* Выбор тендера */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Тендер</Label>
              <Select value={selectedTender} onValueChange={setSelectedTender}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тендер с предложениями" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map((tender) => (
                    <SelectItem key={tender.id} value={tender.id}>
                      <span className="truncate max-w-[500px]">{tender.subject}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadOffers} disabled={!selectedTender || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Обновить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      {offers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{offers.length}</div>
              <p className="text-sm text-muted-foreground">Всего предложений</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(minPrice)}
              </div>
              <p className="text-sm text-muted-foreground">Минимальная цена</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(maxPrice)}
              </div>
              <p className="text-sm text-muted-foreground">Максимальная цена</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {offers.filter(o => o.status === "winner").length > 0 ? "Да" : "Нет"}
              </div>
              <p className="text-sm text-muted-foreground">Победитель выбран</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Таблица сравнения */}
      {offers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Предложения поставщиков</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Сортировка:</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">По цене</SelectItem>
                    <SelectItem value="delivery">По сроку</SelectItem>
                    <SelectItem value="score">По оценке</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Поставщик</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-center">Срок</TableHead>
                    <TableHead>Условия</TableHead>
                    <TableHead className="text-center">Гарантия</TableHead>
                    <TableHead className="text-center">Оценка</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOffers.map((offer) => {
                    const isWinner = offer.status === "winner";
                    const isCheapest = offer.offer_amount === minPrice && minPrice > 0;

                    return (
                      <TableRow 
                        key={offer.id} 
                        className={isWinner ? "bg-green-50" : isCheapest ? "bg-yellow-50" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isWinner && <Trophy className="h-4 w-4 text-green-600" />}
                            {isCheapest && !isWinner && <Award className="h-4 w-4 text-yellow-600" />}
                            <div>
                              <p className="font-medium">
                                {offer.supplier?.short_name || offer.supplier?.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {offer.supplier?.rating && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {offer.supplier.rating}
                                  </span>
                                )}
                                {offer.supplier?.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3" />
                                  </span>
                                )}
                                {offer.supplier?.email && (
                                  <span className="flex items-center gap-0.5">
                                    <Mail className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={offer.status}
                            onValueChange={(v) => handleStatusChange(offer.id, v as SupplierOfferStatus)}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <Badge 
                                variant={offer.status === "winner" ? "default" : "outline"}
                                className={`${
                                  offer.status === "winner" ? "bg-green-500" :
                                  offer.status === "rejected" ? "text-red-600" :
                                  offer.status === "offer_received" ? "text-indigo-600" :
                                  ""
                                }`}
                              >
                                {OFFER_STATUSES[offer.status]?.name || offer.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(OFFER_STATUSES).map(([key, { name }]) => (
                                <SelectItem key={key} value={key}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {offer.offer_amount ? (
                            <span className={isCheapest ? "text-green-600 font-semibold" : ""}>
                              {formatPrice(offer.offer_amount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {offer.offer_delivery_days ? (
                            <div className="flex items-center justify-center gap-1">
                              <Truck className="h-3 w-3" />
                              {offer.offer_delivery_days} дн.
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {offer.offer_payment_terms ? (
                            <div className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-3 w-3" />
                              {offer.offer_payment_terms}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {offer.offer_warranty_months ? (
                            <div className="flex items-center justify-center gap-1">
                              <Shield className="h-3 w-3" />
                              {offer.offer_warranty_months} мес.
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {offer.evaluation_score ? (
                            <Badge variant="outline">{offer.evaluation_score}/100</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOffer(offer)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {!isWinner && offer.offer_amount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedWinner(offer);
                                  setWinnerDialogOpen(true);
                                }}
                              >
                                <Trophy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTender && offers.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нет предложений</p>
            <p className="text-sm text-muted-foreground">
              Пригласите поставщиков через раздел «Подбор под тендер»
            </p>
          </CardContent>
        </Card>
      )}

      {/* Диалог редактирования предложения */}
      <Dialog open={!!editingOffer} onOpenChange={() => setEditingOffer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Данные предложения</DialogTitle>
            <DialogDescription>
              {editingOffer?.supplier?.name}
            </DialogDescription>
          </DialogHeader>

          {editingOffer && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Цена (копейки)</Label>
                  <Input
                    type="number"
                    value={editingOffer.offer_amount || ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        offer_amount: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Срок поставки (дней)</Label>
                  <Input
                    type="number"
                    value={editingOffer.offer_delivery_days || ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        offer_delivery_days: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Условия оплаты</Label>
                  <Input
                    value={editingOffer.offer_payment_terms || ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        offer_payment_terms: e.target.value,
                      })
                    }
                    placeholder="Предоплата 50%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Гарантия (мес.)</Label>
                  <Input
                    type="number"
                    value={editingOffer.offer_warranty_months || ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        offer_warranty_months: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Оценка (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingOffer.evaluation_score || ""}
                  onChange={(e) =>
                    setEditingOffer({
                      ...editingOffer,
                      evaluation_score: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Примечания</Label>
                <Textarea
                  value={editingOffer.evaluation_notes || ""}
                  onChange={(e) =>
                    setEditingOffer({
                      ...editingOffer,
                      evaluation_notes: e.target.value,
                    })
                  }
                  placeholder="Комментарии к предложению..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOffer(null)}>
              Отмена
            </Button>
            <Button onClick={handleSaveOffer} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора победителя */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выбрать победителя</DialogTitle>
            <DialogDescription>
              Подтвердите выбор победителя тендера
            </DialogDescription>
          </DialogHeader>

          {selectedWinner && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold">{selectedWinner.supplier?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Цена: {formatPrice(selectedWinner.offer_amount)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Все остальные предложения будут отмечены как отклонённые.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSelectWinner} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
              Подтвердить победителя
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
