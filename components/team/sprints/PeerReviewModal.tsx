"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Users } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface PeerReview {
  reviewee_id: string;
  rating: number;
  feedback: string;
}

interface PeerReviewModalProps {
  sprintId: string;
  sprintName: string;
  currentUserId: string;
  employees: Employee[];
  open: boolean;
  onClose: () => void;
  onSave: (reviews: PeerReview[]) => void;
  existingReviews?: PeerReview[];
}

export function PeerReviewModal({
  sprintName,
  currentUserId,
  employees,
  open,
  onClose,
  onSave,
  existingReviews = [],
}: PeerReviewModalProps) {
  // Filter out current user from reviewable employees
  const reviewableEmployees = employees.filter((e) => e.id !== currentUserId);

  // Initialize reviews state
  const [reviews, setReviews] = useState<Record<string, { rating: number; feedback: string }>>(() => {
    const initial: Record<string, { rating: number; feedback: string }> = {};
    reviewableEmployees.forEach((emp) => {
      const existing = existingReviews.find((r) => r.reviewee_id === emp.id);
      initial[emp.id] = {
        rating: existing?.rating || 0,
        feedback: existing?.feedback || "",
      };
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRatingChange = (employeeId: string, rating: number) => {
    setReviews((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], rating },
    }));
  };

  const handleFeedbackChange = (employeeId: string, feedback: string) => {
    setReviews((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], feedback },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const reviewsToSave: PeerReview[] = Object.entries(reviews)
        .filter(([, data]) => data.rating > 0)
        .map(([revieweeId, data]) => ({
          reviewee_id: revieweeId,
          rating: data.rating,
          feedback: data.feedback,
        }));

      await onSave(reviewsToSave);
    } finally {
      setSaving(false);
    }
  };

  const completedReviewsCount = Object.values(reviews).filter((r) => r.rating > 0).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Peer Review: {sprintName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Оцените работу коллег в этом спринте. Ваши оценки анонимны и помогут
            улучшить командную работу.
          </p>

          {reviewableEmployees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет коллег для оценки
            </p>
          ) : (
            <div className="space-y-4">
              {reviewableEmployees.map((employee) => (
                <Card key={employee.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>

                        {/* Star Rating */}
                        <div className="space-y-1">
                          <Label className="text-sm">Оценка работы</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleRatingChange(employee.id, star)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`h-6 w-6 ${
                                    star <= reviews[employee.id]?.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Feedback */}
                        <div className="space-y-1">
                          <Label className="text-sm">Комментарий (опционально)</Label>
                          <Textarea
                            value={reviews[employee.id]?.feedback || ""}
                            onChange={(e) => handleFeedbackChange(employee.id, e.target.value)}
                            placeholder="Что было хорошо? Что можно улучшить?"
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Оценено: {completedReviewsCount} из {reviewableEmployees.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || completedReviewsCount === 0}
              >
                {saving ? "Сохранение..." : "Отправить оценки"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
