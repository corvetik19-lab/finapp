"use client";

import { useState, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Briefcase,
  Sun,
  Moon,
} from "lucide-react";
import type { TeamCalendarEvent, CalendarEventType, Sprint, WorkloadAllocation } from "@/lib/team/types";

interface CalendarClientProps {
  companyId: string;
  userId: string;
  initialEvents: TeamCalendarEvent[];
  sprints?: Sprint[];
  workloadAllocations?: WorkloadAllocation[];
}

// Unified calendar item type
interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "event" | "sprint" | "workload";
  color: string;
  data: TeamCalendarEvent | Sprint | WorkloadAllocation;
}

const eventTypeColors: Record<CalendarEventType, string> = {
  meeting: "bg-blue-500",
  deadline: "bg-red-500",
  vacation: "bg-green-500",
  sick: "bg-yellow-500",
  conference: "bg-purple-500",
  task: "bg-orange-500",
  other: "bg-gray-500",
};

const eventTypeLabels: Record<CalendarEventType, string> = {
  meeting: "Встреча",
  deadline: "Дедлайн",
  vacation: "Отпуск",
  sick: "Больничный",
  conference: "Конференция",
  task: "Задача",
  other: "Другое",
};

const eventTypeIcons: Record<CalendarEventType, React.ReactNode> = {
  meeting: <Briefcase className="h-3 w-3" />,
  deadline: <Clock className="h-3 w-3" />,
  vacation: <Sun className="h-3 w-3" />,
  sick: <Moon className="h-3 w-3" />,
  conference: <Video className="h-3 w-3" />,
  task: <CalendarIcon className="h-3 w-3" />,
  other: <CalendarIcon className="h-3 w-3" />,
};

export function CalendarClient({
  companyId,
  userId,
  initialEvents,
  sprints = [],
  workloadAllocations = [],
}: CalendarClientProps) {
  const [events, setEvents] = useState<TeamCalendarEvent[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamCalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSyncedItems, setShowSyncedItems] = useState(true);
  const supabase = getSupabaseClient();

  // Combine all calendar items
  const allCalendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];

    // Add regular events
    events.forEach((event) => {
      items.push({
        id: event.id,
        title: event.title,
        start: event.start_at,
        end: event.end_at,
        type: "event",
        color: eventTypeColors[event.event_type] || "bg-gray-500",
        data: event,
      });
    });

    // Add sprints (if sync enabled)
    if (showSyncedItems) {
      sprints.forEach((sprint) => {
        items.push({
          id: `sprint-${sprint.id}`,
          title: `🏃 ${sprint.name}`,
          start: sprint.start_date,
          end: sprint.end_date,
          type: "sprint",
          color: "bg-indigo-500",
          data: sprint,
        });
      });

      // Add workload allocations (if sync enabled)
      workloadAllocations.forEach((allocation) => {
        items.push({
          id: `workload-${allocation.id}`,
          title: `📋 ${allocation.title}`,
          start: allocation.start_date,
          end: allocation.end_date,
          type: "workload",
          color: allocation.color || "bg-cyan-500",
          data: allocation,
        });
      });
    }

    return items;
  }, [events, sprints, workloadAllocations, showSyncedItems]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add days from previous month to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start

    for (let i = startOffset; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the grid (6 rows)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Get items for a specific day (using combined calendar items)
  const getItemsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return allCalendarItems.filter((item) => {
      const itemStart = item.start.split("T")[0];
      const itemEnd = item.end.split("T")[0];
      return dateStr >= itemStart && dateStr <= itemEnd;
    });
  };

  // Create event
  const handleCreateEvent = async (data: {
    title: string;
    description: string;
    eventType: CalendarEventType;
    startAt: string;
    endAt: string;
    allDay: boolean;
    location: string;
  }) => {
    try {
      const { data: event, error } = await supabase
        .from("team_calendar_events")
        .insert({
          company_id: companyId,
          title: data.title,
          description: data.description || null,
          event_type: data.eventType,
          start_at: data.startAt,
          end_at: data.endAt,
          all_day: data.allDay,
          location: data.location || null,
          color: eventTypeColors[data.eventType].replace("bg-", "#").replace("-500", ""),
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents((prev) => [...prev, event]);
      setShowCreateModal(false);
      setSelectedDate(null);
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Удалить событие?")) return;

    try {
      const { error } = await supabase
        .from("team_calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  };

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold capitalize min-w-48 text-center">
            {formatMonthYear(currentDate)}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Сегодня
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={showSyncedItems ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSyncedItems(!showSyncedItems)}
          >
            {showSyncedItems ? "Скрыть спринты/задачи" : "Показать спринты/задачи"}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить событие
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dayItems = getItemsForDay(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDay = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-24 p-1 border-b border-r cursor-pointer hover:bg-muted/50 transition-colors ${
                    !isCurrentMonthDay ? "bg-muted/20" : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(date);
                    setShowCreateModal(true);
                  }}
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center text-sm rounded-full mb-1 ${
                      isTodayDay
                        ? "bg-primary text-primary-foreground"
                        : !isCurrentMonthDay
                        ? "text-muted-foreground"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer ${item.color}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === "event") {
                            setSelectedEvent(item.data as TeamCalendarEvent);
                          }
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayItems.length - 3} ещё
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Type Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(eventTypeLabels).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded ${eventTypeColors[type as CalendarEventType]}`}
            />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
        {showSyncedItems && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-sm text-muted-foreground">🏃 Спринт</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500" />
              <span className="text-sm text-muted-foreground">📋 Задача загрузки</span>
            </div>
          </>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedDate(null);
        }}
        onCreate={handleCreateEvent}
        initialDate={selectedDate}
      />

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}

// Create Event Modal
interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    eventType: CalendarEventType;
    startAt: string;
    endAt: string;
    allDay: boolean;
    location: string;
  }) => void;
  initialDate: Date | null;
}

function CreateEventModal({
  open,
  onClose,
  onCreate,
  initialDate,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("meeting");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");

  // Set initial date when modal opens
  useState(() => {
    if (initialDate) {
      const dateStr = initialDate.toISOString().split("T")[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    const startAt = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const endAt = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;

    onCreate({
      title: title.trim(),
      description: description.trim(),
      eventType,
      startAt,
      endAt,
      allDay,
      location: location.trim(),
    });

    // Reset form
    setTitle("");
    setDescription("");
    setEventType("meeting");
    setStartDate("");
    setStartTime("09:00");
    setEndDate("");
    setEndTime("10:00");
    setAllDay(false);
    setLocation("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новое событие</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название события"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="eventType">Тип события</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as CalendarEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      {eventTypeIcons[value as CalendarEventType]}
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="allDay">Весь день</Label>
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
            {!allDay && (
              <div>
                <Label htmlFor="startTime">Время</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endDate">Конец *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div>
                <Label htmlFor="endTime">Время</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="location">Место</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Где будет проходить?"
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={!title.trim() || !startDate || !endDate}>
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Event Details Modal
interface EventDetailsModalProps {
  event: TeamCalendarEvent;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function EventDetailsModal({ event, onClose, onDelete }: EventDetailsModalProps) {
  const formatDateTime = (dateStr: string, allDay: boolean) => {
    const date = new Date(dateStr);
    if (allDay) {
      return date.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    return date.toLocaleString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded ${eventTypeColors[event.event_type]}`}
            />
            {event.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{eventTypeLabels[event.event_type]}</Badge>
            {event.all_day && <Badge variant="outline">Весь день</Badge>}
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="text-sm">
              <p>{formatDateTime(event.start_at, event.all_day)}</p>
              <p className="text-muted-foreground">
                до {formatDateTime(event.end_at, event.all_day)}
              </p>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          {event.description && (
            <div className="text-sm">
              <p className="font-medium mb-1">Описание</p>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
            <Button variant="destructive" onClick={() => onDelete(event.id)}>
              Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
