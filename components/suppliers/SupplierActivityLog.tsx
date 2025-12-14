"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  PhoneOutgoing,
  PhoneIncoming,
  Send,
  Mail,
  Users,
  StickyNote,
  Upload,
  FileCheck,
  ListTodo,
  CheckCircle,
  RefreshCw,
  Star,
  MessageSquare,
  Clock,
} from "lucide-react";
import { SupplierActivity, ActivityType } from "@/lib/suppliers/types";
import { addComment } from "@/lib/suppliers/tasks-service";
import { useRouter } from "next/navigation";

interface SupplierActivityLogProps {
  supplierId: string;
  activities: SupplierActivity[];
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-green-500" />,
  updated: <Edit className="h-4 w-4 text-blue-500" />,
  call_made: <PhoneOutgoing className="h-4 w-4 text-blue-500" />,
  call_received: <PhoneIncoming className="h-4 w-4 text-green-500" />,
  email_sent: <Send className="h-4 w-4 text-blue-500" />,
  email_received: <Mail className="h-4 w-4 text-green-500" />,
  meeting: <Users className="h-4 w-4 text-purple-500" />,
  note_added: <StickyNote className="h-4 w-4 text-yellow-500" />,
  file_uploaded: <Upload className="h-4 w-4 text-gray-500" />,
  contract_signed: <FileCheck className="h-4 w-4 text-green-500" />,
  task_created: <ListTodo className="h-4 w-4 text-blue-500" />,
  task_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  status_changed: <RefreshCw className="h-4 w-4 text-orange-500" />,
  rating_changed: <Star className="h-4 w-4 text-yellow-500" />,
  comment: <MessageSquare className="h-4 w-4 text-gray-500" />,
};

export function SupplierActivityLog({ supplierId, activities }: SupplierActivityLogProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayedActivities = showAll ? activities : activities.slice(0, 10);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    setLoading(true);
    try {
      const result = await addComment(supplierId, comment.trim());
      if (result.success) {
        setComment("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">История взаимодействий</h3>

      {/* Форма добавления комментария */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Добавить комментарий..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleAddComment}
              disabled={loading || !comment.trim()}
              className="self-end"
            >
              {loading ? "..." : "Отправить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Лента активностей */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет записей</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Вертикальная линия */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {displayedActivities.map((activity) => (
              <div key={activity.id} className="flex gap-4 relative">
                {/* Иконка */}
                <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200">
                  {ACTIVITY_ICONS[activity.activity_type] || <Clock className="h-4 w-4" />}
                </div>
                
                {/* Контент */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{activity.title}</p>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {activities.length > 10 && !showAll && (
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setShowAll(true)}
            >
              Показать ещё ({activities.length - 10})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
