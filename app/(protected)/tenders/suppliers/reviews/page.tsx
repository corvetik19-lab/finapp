"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Plus, 
  Search, 
  Building2,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  User
} from "lucide-react";

interface Review {
  id: string;
  supplier: { id: string; name: string };
  author: { name: string };
  rating: number;
  tender_name?: string;
  comment: string;
  pros?: string;
  cons?: string;
  created_at: string;
}

export default function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Демо данные
  const reviews: Review[] = [
    {
      id: "1",
      supplier: { id: "s1", name: "ООО Альфа-Снаб" },
      author: { name: "Петров И.И." },
      rating: 5,
      tender_name: "Поставка канцтоваров",
      comment: "Отличный поставщик! Всё доставили вовремя и в полном объёме.",
      pros: "Быстрая доставка, качественный товар, адекватные цены",
      cons: "",
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: "2",
      supplier: { id: "s2", name: "ООО БетаТрейд" },
      author: { name: "Сидорова А.П." },
      rating: 4,
      tender_name: "Оргтехника Q3",
      comment: "В целом хорошо, но были небольшие задержки с поставкой.",
      pros: "Хорошее качество, оперативная коммуникация",
      cons: "Задержка на 3 дня",
      created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    },
    {
      id: "3",
      supplier: { id: "s3", name: "ИП Сидоров" },
      author: { name: "Козлов М.В." },
      rating: 3,
      comment: "Средне. Качество товара оставляет желать лучшего.",
      pros: "Низкие цены",
      cons: "Качество ниже среднего, слабая упаковка",
      created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    },
  ];

  const filteredReviews = reviews.filter(r =>
    r.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Оценки и отзывы</h1>
          <p className="text-muted-foreground">
            Отзывы о работе с поставщиками
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Оставить отзыв
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{reviews.length}</div>
            <div className="text-sm text-muted-foreground">Всего отзывов</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="text-sm text-muted-foreground">Средняя оценка</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {reviews.filter(r => r.rating >= 4).length}
            </div>
            <div className="text-sm text-muted-foreground">Положительных</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {reviews.filter(r => r.rating <= 2).length}
            </div>
            <div className="text-sm text-muted-foreground">Отрицательных</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по поставщику или тексту отзыва..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{review.supplier.name}</div>
                      {review.tender_name && (
                        <div className="text-sm text-muted-foreground">
                          Тендер: {review.tender_name}
                        </div>
                      )}
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                <p className="text-sm mb-3">{review.comment}</p>

                {(review.pros || review.cons) && (
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {review.pros && (
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-green-600 font-medium mb-1">
                          <ThumbsUp className="h-3 w-3" />
                          Плюсы
                        </div>
                        <p className="text-muted-foreground">{review.pros}</p>
                      </div>
                    )}
                    {review.cons && (
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-red-600 font-medium mb-1">
                          <ThumbsDown className="h-3 w-3" />
                          Минусы
                        </div>
                        <p className="text-muted-foreground">{review.cons}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {review.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(review.created_at).toLocaleDateString("ru")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
