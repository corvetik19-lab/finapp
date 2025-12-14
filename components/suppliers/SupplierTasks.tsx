"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Check,
  MoreHorizontal,
  Calendar,
  Clock,
  Phone,
  Users,
  Mail,
  FileText,
  CreditCard,
  Truck,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  SupplierTask,
  TaskType,
  TaskPriority,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/suppliers/types";
import {
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from "@/lib/suppliers/tasks-service";
import { useRouter } from "next/navigation";

interface SupplierTasksProps {
  supplierId: string;
  tasks: SupplierTask[];
}

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  meeting: <Users className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  contract: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
  other: <Calendar className="h-4 w-4" />,
};

export function SupplierTasks({ supplierId, tasks }: SupplierTasksProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("other");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTaskType("other");
    setPriority("medium");
    setDueDate("");
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      const result = await createTask({
        supplier_id: supplierId,
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: taskType,
        priority,
        due_date: dueDate || undefined,
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

  const handleComplete = async (taskId: string) => {
    await completeTask(taskId);
    router.refresh();
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Удалить задачу?")) return;
    await deleteTask(taskId);
    router.refresh();
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await updateTask(taskId, { status: status as SupplierTask["status"] });
    router.refresh();
  };

  const isOverdue = (task: SupplierTask) => {
    if (!task.due_date || task.status === "completed") return false;
    return new Date(task.due_date) < new Date();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const info = TASK_PRIORITIES[priority];
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gray: "secondary",
      blue: "outline",
      orange: "default",
      red: "destructive",
    };
    return (
      <Badge variant={variants[info.color] || "secondary"} className="text-xs">
        {info.name}
      </Badge>
    );
  };

  const renderTask = (task: SupplierTask) => {
    const overdue = isOverdue(task);
    
    return (
      <div
        key={task.id}
        className={`flex items-start gap-3 p-3 rounded-lg border ${
          overdue ? "border-red-200 bg-red-50" : "border-gray-100 hover:bg-gray-50"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 mt-0.5"
          onClick={() => handleComplete(task.id)}
        >
          {task.status === "completed" ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
          )}
        </Button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500">{TASK_ICONS[task.task_type]}</span>
            <span className={`font-medium ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>
              {task.title}
            </span>
            {getPriorityBadge(task.priority)}
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-500 mb-1">{task.description}</p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
                {overdue && <AlertCircle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {TASK_STATUSES[task.status].name}
              </Badge>
            </span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.status !== "completed" && (
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "completed")}>
                <Check className="h-4 w-4 mr-2" />
                Выполнено
              </DropdownMenuItem>
            )}
            {task.status === "pending" && (
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "in_progress")}>
                В работу
              </DropdownMenuItem>
            )}
            {task.status === "completed" && (
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "pending")}>
                Вернуть в работу
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Задачи</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Активные задачи */}
      {pendingTasks.length > 0 ? (
        <div className="space-y-2">
          {pendingTasks.map(renderTask)}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет активных задач</p>
          </CardContent>
        </Card>
      )}

      {/* Выполненные задачи */}
      {completedTasks.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Выполненные ({completedTasks.length})
          </h4>
          <div className="space-y-2 opacity-60">
            {completedTasks.slice(0, 5).map(renderTask)}
          </div>
        </div>
      )}

      {/* Форма создания */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Название задачи"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <Textarea
                placeholder="Описание (необязательно)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Тип</label>
                <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPES).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Приоритет</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITIES).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Срок выполнения</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={loading || !title.trim()}>
              {loading ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
