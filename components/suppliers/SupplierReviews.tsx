"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  Plus,
  Trash2,
  Package,
  Truck,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { SupplierReview } from "@/lib/suppliers/types";
import { createReview, deleteReview } from "@/lib/suppliers/reviews-service";
import { useRouter } from "next/navigation";

interface SupplierReviewsProps {
  supplierId: string;
  reviews: SupplierReview[];
}

const RATING_CATEGORIES = [
  { key: "quality_rating", label: "Качество", icon: Package },
  { key: "delivery_rating", label: "Доставка", icon: Truck },
  { key: "price_rating", label: "Цена", icon: DollarSign },
  { key: "communication_rating", label: "Коммуникация", icon: MessageSquare },
] as const;

export function SupplierReviews({ supplierId, reviews }: SupplierReviewsProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [qualityRating, setQualityRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [priceRating, setPriceRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comment, setComment] = useState("");

  // Calculate average stats
  const avgStats = reviews.length > 0 ? {
    quality: Math.round(reviews.reduce((sum, r) => sum + (r.quality_rating || 0), 0) / reviews.filter(r => r.quality_rating).length * 10) / 10 || 0,
    delivery: Math.round(reviews.reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / reviews.filter(r => r.delivery_rating).length * 10) / 10 || 0,
    price: Math.round(reviews.reduce((sum, r) => sum + (r.price_rating || 0), 0) / reviews.filter(r => r.price_rating).length * 10) / 10 || 0,
    communication: Math.round(reviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0) / reviews.filter(r => r.communication_rating).length * 10) / 10 || 0,
    overall: Math.round(reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length * 10) / 10 || 0,
  } : null;

  const resetForm = () => {
    setQualityRating(0);
    setDeliveryRating(0);
    setPriceRating(0);
    setCommunicationRating(0);
    setComment("");
  };

  const handleCreate = async () => {
    if (qualityRating === 0 && deliveryRating === 0 && priceRating === 0 && communicationRating === 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await createReview({
        supplier_id: supplierId,
        quality_rating: qualityRating || undefined,
        delivery_rating: deliveryRating || undefined,
        price_rating: priceRating || undefined,
        communication_rating: communicationRating || undefined,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        resetForm();
        setFormOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Удалить отзыв?")) return;
    await deleteReview(reviewId);
    router.refresh();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const StarRating = ({
    value,
    onChange,
    readonly = false,
  }: {
    value: number;
    onChange?: (v: number) => void;
    readonly?: boolean;
  }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          } ${!readonly ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );

  const RatingBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-600 w-28">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8">{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Отзывы и оценки</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить отзыв
        </Button>
      </div>

      {/* Сводная статистика */}
      {avgStats && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">{avgStats.overall}</div>
                <div className="flex items-center justify-center mt-1">
                  <StarRating value={Math.round(avgStats.overall)} readonly />
                </div>
                <p className="text-xs text-gray-500 mt-1">{reviews.length} отзыв(ов)</p>
              </div>
              <div className="flex-1 space-y-2">
                <RatingBar label="Качество" value={avgStats.quality} icon={Package} />
                <RatingBar label="Доставка" value={avgStats.delivery} icon={Truck} />
                <RatingBar label="Цена" value={avgStats.price} icon={DollarSign} />
                <RatingBar label="Коммуникация" value={avgStats.communication} icon={MessageSquare} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список отзывов */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет отзывов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StarRating value={Math.round(review.overall_rating || 0)} readonly />
                      <Badge variant="secondary">{review.overall_rating}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                      {review.quality_rating && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {review.quality_rating}
                        </span>
                      )}
                      {review.delivery_rating && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {review.delivery_rating}
                        </span>
                      )}
                      {review.price_rating && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {review.price_rating}
                        </span>
                      )}
                      {review.communication_rating && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {review.communication_rating}
                        </span>
                      )}
                    </div>

                    {review.comment && (
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => handleDelete(review.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Форма создания отзыва */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый отзыв</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {RATING_CATEGORIES.map(({ key, label, icon: Icon }) => {
              const value = key === "quality_rating" ? qualityRating :
                           key === "delivery_rating" ? deliveryRating :
                           key === "price_rating" ? priceRating : communicationRating;
              const setValue = key === "quality_rating" ? setQualityRating :
                              key === "delivery_rating" ? setDeliveryRating :
                              key === "price_rating" ? setPriceRating : setCommunicationRating;

              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span>{label}</span>
                  </div>
                  <StarRating value={value} onChange={setValue} />
                </div>
              );
            })}

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Комментарий</label>
              <Textarea
                placeholder="Опишите ваш опыт работы с поставщиком..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || (qualityRating === 0 && deliveryRating === 0 && priceRating === 0 && communicationRating === 0)}
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
