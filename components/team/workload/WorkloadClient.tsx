"use client";

import { useState, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { GanttChart } from "./GanttChart";
import type { WorkloadAllocation, CardPriority } from "@/lib/team/types";

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  capacity_hours?: number;
}

interface WorkloadClientProps {
  companyId: string;
  userId: string;
  employees: Employee[];
  initialAllocations: WorkloadAllocation[];
}

const priorityColors: Record<CardPriority, string> = {
  low: "bg-gray-400",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function WorkloadClient({
  companyId,
  userId,
  employees,
  initialAllocations,
}: WorkloadClientProps) {
  const [allocations, setAllocations] = useState<WorkloadAllocation[]>(initialAllocations);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  // Calculate workload per employee
  const employeeWorkloads = useMemo(() => {
    const workloads: Record<
      string,
      {
        employee: Employee;
        allocations: WorkloadAllocation[];
        totalHours: number;
        capacityHours: number;
        utilizationPercent: number;
      }
    > = {};

    employees.forEach((emp) => {
      const empAllocations = allocations.filter(
        (a) => a.user_id === emp.id && a.status !== "completed" && a.status !== "cancelled"
      );
      const totalHours = empAllocations.reduce((sum, a) => sum + a.allocated_hours, 0);
      const capacityHours = emp.capacity_hours || 40; // Default 40 hours/week

      workloads[emp.id] = {
        employee: emp,
        allocations: empAllocations,
        totalHours,
        capacityHours,
        utilizationPercent: Math.round((totalHours / capacityHours) * 100),
      };
    });

    return workloads;
  }, [employees, allocations]);

  // Create allocation
  const handleCreateAllocation = async (data: {
    userId: string;
    title: string;
    description: string;
    allocatedHours: number;
    startDate: string;
    endDate: string;
    priority: CardPriority;
  }) => {
    try {
      const { data: allocation, error } = await supabase
        .from("workload_allocations")
        .insert({
          company_id: companyId,
          user_id: data.userId,
          title: data.title,
          description: data.description || null,
          allocated_hours: data.allocatedHours,
          start_date: data.startDate,
          end_date: data.endDate,
          priority: data.priority,
          status: "assigned",
          progress_percent: 0,
          color: getRandomColor(),
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setAllocations((prev) => [...prev, allocation]);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating allocation:", error);
    }
  };

  // Delete allocation
  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Удалить задачу?")) return;

    try {
      const { error } = await supabase
        .from("workload_allocations")
        .delete()
        .eq("id", allocationId);

      if (error) throw error;

      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    } catch (error) {
      console.error("Error deleting allocation:", error);
    }
  };

  const getRandomColor = () => {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#ef4444",
      "#f97316",
      "#22c55e",
      "#14b8a6",
      "#3b82f6",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent < 50) return "text-green-600";
    if (percent < 80) return "text-yellow-600";
    if (percent <= 100) return "text-orange-600";
    return "text-red-600";
  };

  const getUtilizationBgColor = (percent: number) => {
    if (percent < 50) return "bg-green-500";
    if (percent < 80) return "bg-yellow-500";
    if (percent <= 100) return "bg-orange-500";
    return "bg-red-500";
  };

  // Stats
  const overloadedCount = Object.values(employeeWorkloads).filter(
    (w) => w.utilizationPercent > 100
  ).length;
  const underutilizedCount = Object.values(employeeWorkloads).filter(
    (w) => w.utilizationPercent < 50
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-muted-foreground">Сотрудников</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{allocations.length}</p>
                <p className="text-sm text-muted-foreground">Задач</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{overloadedCount}</p>
                <p className="text-sm text-muted-foreground">Перегружены</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{underutilizedCount}</p>
                <p className="text-sm text-muted-foreground">Свободны</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Назначить задачу
        </Button>
      </div>

      {/* Employee Workload Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(employeeWorkloads).map(
          ({ employee, allocations: empAllocations, totalHours, capacityHours, utilizationPercent }) => (
            <Card
              key={employee.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedEmployee === employee.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() =>
                setSelectedEmployee(selectedEmployee === employee.id ? null : employee.id)
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">{employee.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getUtilizationColor(utilizationPercent)}
                  >
                    {utilizationPercent}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Загрузка</span>
                      <span>
                        {totalHours} / {capacityHours} ч
                      </span>
                    </div>
                    <Progress
                      value={Math.min(utilizationPercent, 100)}
                      className={`h-2 ${getUtilizationBgColor(utilizationPercent)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {empAllocations.length} задач
                    </span>
                    {utilizationPercent > 100 && (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Перегружен
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded view */}
                {selectedEmployee === employee.id && empAllocations.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {empAllocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="p-2 rounded bg-muted/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: allocation.color }}
                          />
                          <span className="text-sm truncate max-w-32">
                            {allocation.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={priorityColors[allocation.priority]}
                          >
                            {allocation.allocated_hours}ч
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAllocation(allocation.id);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Gantt Chart */}
      {allocations.length > 0 && (
        <GanttChart
          allocations={allocations}
          employees={employees}
        />
      )}

      {/* Empty State */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Нет сотрудников</h3>
            <p className="text-muted-foreground mt-1">
              Добавьте сотрудников в организацию для отслеживания загрузки
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Allocation Modal */}
      <CreateAllocationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateAllocation}
        employees={employees}
      />
    </div>
  );
}

// Create Allocation Modal
interface CreateAllocationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    userId: string;
    title: string;
    description: string;
    allocatedHours: number;
    startDate: string;
    endDate: string;
    priority: CardPriority;
  }) => void;
  employees: Employee[];
}

function CreateAllocationModal({
  open,
  onClose,
  onCreate,
  employees,
}: CreateAllocationModalProps) {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allocatedHours, setAllocatedHours] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<CardPriority>("normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim() || !allocatedHours || !startDate || !endDate) return;

    onCreate({
      userId,
      title: title.trim(),
      description: description.trim(),
      allocatedHours: Number(allocatedHours),
      startDate,
      endDate,
      priority,
    });

    // Reset form
    setUserId("");
    setTitle("");
    setDescription("");
    setAllocatedHours("");
    setStartDate("");
    setEndDate("");
    setPriority("normal");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Назначить задачу</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee">Сотрудник *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours">Часы *</Label>
              <Input
                id="hours"
                type="number"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(e.target.value)}
                placeholder="8"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="priority">Приоритет</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CardPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="normal">Обычный</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!userId || !title.trim() || !allocatedHours || !startDate || !endDate}
            >
              Назначить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
