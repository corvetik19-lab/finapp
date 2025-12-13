"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Play,
  Pause,
  Check,
  X,
  FileText,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BurndownChart } from "./BurndownChart";
import { RetrospectiveModal } from "./RetrospectiveModal";
import { PeerReviewModal } from "./PeerReviewModal";
import type { Sprint, SprintStatus } from "@/lib/team/types";

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface SprintsClientProps {
  companyId: string;
  userId: string;
  initialSprints: Sprint[];
  employees?: Employee[];
}

const statusColors: Record<SprintStatus, string> = {
  planning: "bg-gray-500",
  active: "bg-green-500",
  review: "bg-yellow-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<SprintStatus, string> = {
  planning: "Планирование",
  active: "Активный",
  review: "Ревью",
  completed: "Завершён",
  cancelled: "Отменён",
};

export function SprintsClient({
  companyId,
  userId,
  initialSprints,
  employees = [],
}: SprintsClientProps) {
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [showRetrospective, setShowRetrospective] = useState<Sprint | null>(null);
  const [showPeerReview, setShowPeerReview] = useState<Sprint | null>(null);
  const supabase = getSupabaseClient();

  // Create sprint
  const handleCreateSprint = async (data: {
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      const { data: sprint, error } = await supabase
        .from("sprints")
        .insert({
          company_id: companyId,
          name: data.name,
          goal: data.goal || null,
          start_date: data.startDate,
          end_date: data.endDate,
          status: "planning",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setSprints((prev) => [sprint, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating sprint:", error);
    }
  };

  // Update sprint status
  const handleUpdateStatus = async (sprintId: string, status: SprintStatus) => {
    try {
      const { error } = await supabase
        .from("sprints")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", sprintId);

      if (error) throw error;

      setSprints((prev) =>
        prev.map((s) => (s.id === sprintId ? { ...s, status } : s))
      );
    } catch (error) {
      console.error("Error updating sprint:", error);
    }
  };

  // Delete sprint
  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Удалить спринт?")) return;

    try {
      const { error } = await supabase
        .from("sprints")
        .delete()
        .eq("id", sprintId);

      if (error) throw error;

      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    } catch (error) {
      console.error("Error deleting sprint:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  const getSprintProgress = (sprint: Sprint) => {
    const total = sprint.total_story_points || 0;
    const completed = sprint.completed_story_points || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Group sprints by status
  const activeSprints = sprints.filter((s) => s.status === "active");
  const planningSprints = sprints.filter((s) => s.status === "planning");
  const completedSprints = sprints.filter(
    (s) => s.status === "completed" || s.status === "review" || s.status === "cancelled"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Target className="h-3 w-3" />
            {sprints.length} спринтов
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600">
            <Play className="h-3 w-3" />
            {activeSprints.length} активных
          </Badge>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый спринт
        </Button>
      </div>

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            Активные спринты
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onSelect={() => setSelectedSprint(sprint)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteSprint}
                formatDate={formatDate}
                getProgress={getSprintProgress}
                getDaysRemaining={getDaysRemaining}
              />
            ))}
          </div>
        </div>
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Планирование
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {planningSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onSelect={() => setSelectedSprint(sprint)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteSprint}
                formatDate={formatDate}
                getProgress={getSprintProgress}
                getDaysRemaining={getDaysRemaining}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            Завершённые
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onSelect={() => setSelectedSprint(sprint)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteSprint}
                formatDate={formatDate}
                getProgress={getSprintProgress}
                getDaysRemaining={getDaysRemaining}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sprints.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Нет спринтов</h3>
            <p className="text-muted-foreground mt-1">
              Создайте первый спринт для планирования работы команды
            </p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать спринт
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Sprint Modal */}
      <CreateSprintModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateSprint}
      />

      {/* Sprint Details Modal */}
      {selectedSprint && (
        <SprintDetailsModal
          sprint={selectedSprint}
          onClose={() => setSelectedSprint(null)}
          onUpdateStatus={handleUpdateStatus}
          onOpenRetrospective={() => {
            setShowRetrospective(selectedSprint);
            setSelectedSprint(null);
          }}
          onOpenPeerReview={() => {
            setShowPeerReview(selectedSprint);
            setSelectedSprint(null);
          }}
        />
      )}

      {/* Retrospective Modal */}
      {showRetrospective && (
        <RetrospectiveModal
          sprintId={showRetrospective.id}
          sprintName={showRetrospective.name}
          open={true}
          onClose={() => setShowRetrospective(null)}
          onSave={async (data) => {
            try {
              await supabase.from("sprint_retrospectives").upsert({
                sprint_id: showRetrospective.id,
                went_well: data.went_well,
                to_improve: data.to_improve,
                action_items: data.action_items,
                notes: data.notes,
                created_by: userId,
              });
              setShowRetrospective(null);
            } catch (error) {
              console.error("Error saving retrospective:", error);
            }
          }}
        />
      )}

      {/* Peer Review Modal */}
      {showPeerReview && (
        <PeerReviewModal
          sprintId={showPeerReview.id}
          sprintName={showPeerReview.name}
          currentUserId={userId}
          employees={employees}
          open={true}
          onClose={() => setShowPeerReview(null)}
          onSave={async (reviews) => {
            try {
              for (const review of reviews) {
                await supabase.from("peer_reviews").upsert({
                  sprint_id: showPeerReview.id,
                  reviewer_id: userId,
                  reviewee_id: review.reviewee_id,
                  rating: review.rating,
                  feedback: review.feedback,
                });
              }
              setShowPeerReview(null);
            } catch (error) {
              console.error("Error saving peer reviews:", error);
            }
          }}
        />
      )}
    </div>
  );
}

// Sprint Card Component
interface SprintCardProps {
  sprint: Sprint;
  onSelect: () => void;
  onUpdateStatus: (id: string, status: SprintStatus) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
  getProgress: (sprint: Sprint) => number;
  getDaysRemaining: (date: string) => number;
  compact?: boolean;
}

function SprintCard({
  sprint,
  onSelect,
  onUpdateStatus,
  onDelete,
  formatDate,
  getProgress,
  getDaysRemaining,
  compact,
}: SprintCardProps) {
  const progress = getProgress(sprint);
  const daysRemaining = getDaysRemaining(sprint.end_date);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        compact ? "" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{sprint.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[sprint.status]}>
                {statusLabels[sprint.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sprint.status === "planning" && (
                <DropdownMenuItem onClick={() => onUpdateStatus(sprint.id, "active")}>
                  <Play className="h-4 w-4 mr-2" />
                  Запустить
                </DropdownMenuItem>
              )}
              {sprint.status === "active" && (
                <>
                  <DropdownMenuItem onClick={() => onUpdateStatus(sprint.id, "review")}>
                    <Pause className="h-4 w-4 mr-2" />
                    На ревью
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(sprint.id, "completed")}>
                    <Check className="h-4 w-4 mr-2" />
                    Завершить
                  </DropdownMenuItem>
                </>
              )}
              {sprint.status === "review" && (
                <DropdownMenuItem onClick={() => onUpdateStatus(sprint.id, "completed")}>
                  <Check className="h-4 w-4 mr-2" />
                  Завершить
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(sprint.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {sprint.goal && !compact && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {sprint.goal}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {sprint.status === "active" && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {daysRemaining > 0
                ? `${daysRemaining} дн. осталось`
                : daysRemaining === 0
                ? "Последний день"
                : `Просрочен на ${Math.abs(daysRemaining)} дн.`}
            </span>
            <span className="text-muted-foreground">
              {sprint.completed_items_count || 0}/{sprint.items_count || 0} задач
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Create Sprint Modal
interface CreateSprintModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }) => void;
}

function CreateSprintModal({ open, onClose, onCreate }: CreateSprintModalProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onCreate({ name: name.trim(), goal: goal.trim(), startDate, endDate });
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
  };

  // Set default dates (2 weeks sprint)
  const setDefaultDates = () => {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(twoWeeksLater.toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый спринт</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="goal">Цель спринта</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Что мы хотим достичь в этом спринте?"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Начало *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Конец *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setDefaultDates}
          >
            2 недели с сегодня
          </Button>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!name.trim() || !startDate || !endDate}>
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sprint Details Modal
interface SprintDetailsModalProps {
  sprint: Sprint;
  onClose: () => void;
  onUpdateStatus: (id: string, status: SprintStatus) => void;
  onOpenRetrospective: () => void;
  onOpenPeerReview: () => void;
}

function SprintDetailsModal({
  sprint,
  onClose,
  onOpenRetrospective,
  onOpenPeerReview,
}: SprintDetailsModalProps) {
  // Mock burndown data - in production this would come from sprint items
  const completedPointsByDay: Record<string, number> = {};
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sprint.name}
            <Badge className={statusColors[sprint.status]}>
              {statusLabels[sprint.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sprint.goal && (
            <div>
              <Label>Цель спринта</Label>
              <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Период</Label>
              <p className="text-sm mt-1">
                {new Date(sprint.start_date).toLocaleDateString("ru-RU")} -{" "}
                {new Date(sprint.end_date).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <div>
              <Label>Velocity</Label>
              <p className="text-sm mt-1">{sprint.velocity || 0} story points</p>
            </div>
          </div>
          <div>
            <Label>Прогресс</Label>
            <div className="mt-2">
              <Progress
                value={
                  sprint.total_story_points
                    ? ((sprint.completed_story_points || 0) /
                        sprint.total_story_points) *
                      100
                    : 0
                }
                className="h-3"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {sprint.completed_story_points || 0} из{" "}
                {sprint.total_story_points || 0} story points выполнено
              </p>
            </div>
          </div>

          {/* Burndown Chart */}
          {sprint.total_story_points && sprint.total_story_points > 0 && (
            <BurndownChart
              startDate={sprint.start_date}
              endDate={sprint.end_date}
              totalPoints={sprint.total_story_points}
              completedPointsByDay={completedPointsByDay}
            />
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              {(sprint.status === "completed" || sprint.status === "review") && (
                <>
                  <Button variant="outline" onClick={onOpenRetrospective}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ретроспектива
                  </Button>
                  <Button variant="outline" onClick={onOpenPeerReview}>
                    <Star className="h-4 w-4 mr-2" />
                    Peer Review
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
