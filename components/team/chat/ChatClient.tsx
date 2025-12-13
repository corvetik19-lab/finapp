"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Plus,
  MessageSquare,
  Users,
  Hash,
  MoreVertical,
  Paperclip,
  FileText,
  Loader2,
  Trash2,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatRoom, ChatMessage } from "@/lib/team/types";

interface ChatClientProps {
  companyId: string;
  userId: string;
  initialRooms: ChatRoom[];
  employees: Array<{ id: string; name: string; email: string; department?: string | null }>;
  tenders: Array<{ id: string; name: string }>;
  departments: Array<{ name: string }>;
}

export function ChatClient({
  companyId,
  userId,
  initialRooms,
  employees,
  tenders,
  departments,
}: ChatClientProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>(initialRooms);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load messages for selected room
  useEffect(() => {
    if (!selectedRoom) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", selectedRoom.id)
          .order("created_at", { ascending: true })
          .limit(100);

        setMessages(data || []);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedRoom, supabase, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedRoom) return;

    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, supabase, scrollToBottom]);

  // Load unread counts
  useEffect(() => {
    const loadUnreadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const room of rooms) {
        const { data: participant } = await supabase
          .from("chat_participants")
          .select("last_read_at")
          .eq("room_id", room.id)
          .eq("user_id", userId)
          .single();

        if (participant?.last_read_at) {
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)
            .gt("created_at", participant.last_read_at);
          counts[room.id] = count || 0;
        }
      }
      setUnreadCounts(counts);
    };

    loadUnreadCounts();
  }, [rooms, userId, supabase]);

  // Mark room as read
  const markAsRead = async (roomId: string) => {
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", userId);
    
    setUnreadCounts((prev) => ({ ...prev, [roomId]: 0 }));
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    setAttachment(file);
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `chat/${selectedRoom.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath);

      // Send message with attachment
      await supabase.from("chat_messages").insert({
        room_id: selectedRoom.id,
        user_id: userId,
        content: file.name,
        attachments: [{
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        }],
      });

      setAttachment(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      await supabase.from("chat_messages").insert({
        room_id: selectedRoom.id,
        user_id: userId,
        content: newMessage.trim(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Удалить чат? Все сообщения будут удалены.")) return;

    try {
      // Delete messages first
      await supabase
        .from("chat_messages")
        .delete()
        .eq("room_id", roomId);

      // Delete participants
      await supabase
        .from("chat_participants")
        .delete()
        .eq("room_id", roomId);

      // Delete room
      const { error } = await supabase
        .from("chat_rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  // Create room
  const handleCreateRoom = async (name: string, type: string, participantIds: string[], tenderId?: string, departmentName?: string) => {
    try {
      // Create room
      const { data: room, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          company_id: companyId,
          name,
          type,
          created_by: userId,
          tender_id: tenderId || null,
          department: departmentName || null,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin
      await supabase.from("chat_participants").insert({
        room_id: room.id,
        user_id: userId,
        role: "admin",
      });

      // Add other participants
      for (const participantId of participantIds) {
        if (participantId !== userId) {
          await supabase.from("chat_participants").insert({
            room_id: room.id,
            user_id: participantId,
            role: "member",
          });
        }
      }

      setRooms((prev) => [room, ...prev]);
      setSelectedRoom(room);
      setShowCreateRoom(false);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
      {/* Sidebar - Room List */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Чаты</h2>
          <Button size="icon" variant="ghost" onClick={() => setShowCreateRoom(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  markAsRead(room.id);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedRoom?.id === room.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  {room.type === "team" ? (
                    <Users className="h-4 w-4" />
                  ) : room.type === "tender" ? (
                    <Hash className="h-4 w-4" />
                  ) : room.type === "department" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  <span className="font-medium truncate flex-1">{room.name}</span>
                  {unreadCounts[room.id] > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
                      {unreadCounts[room.id]}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {rooms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет чатов
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedRoom.type === "team" ? (
                  <Users className="h-5 w-5" />
                ) : selectedRoom.type === "tender" ? (
                  <Hash className="h-5 w-5" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                <h3 className="font-semibold">{selectedRoom.name}</h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteRoom(selectedRoom.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить чат
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="flex items-center justify-center my-4">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {formatDate(msgs[0].created_at)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {msgs.map((message) => {
                          const isOwn = message.user_id === userId;
                          const sender = employees.find((e) => e.id === message.user_id);
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {!isOwn && (
                                  <p className="text-xs font-medium mb-1 opacity-70">
                                    {sender?.name || "Неизвестный"}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                {/* Attachments */}
                                {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((att: { name: string; url: string; type: string }, idx: number) => (
                                      <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded text-xs ${
                                          isOwn ? "bg-primary-foreground/10" : "bg-background"
                                        }`}
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span className="truncate">{att.name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <p
                                  className={`text-xs mt-1 ${
                                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}
                                >
                                  {formatTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              {/* Upload indicator */}
              {uploading && (
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Загрузка файла: {attachment?.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    disabled={uploading}
                  />
                  <Button type="button" size="icon" variant="ghost" asChild disabled={uploading}>
                    <span>
                      <Paperclip className="h-5 w-5" />
                    </span>
                  </Button>
                </label>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  className="flex-1"
                  disabled={uploading}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || uploading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Выберите чат или создайте новый</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreate={handleCreateRoom}
        employees={employees}
        tenders={tenders}
        departments={departments}
        currentUserId={userId}
      />
    </div>
  );
}

// Create Room Modal Component
interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, type: string, participantIds: string[], tenderId?: string, departmentName?: string) => void;
  employees: Array<{ id: string; name: string; email: string; department?: string | null }>;
  tenders: Array<{ id: string; name: string }>;
  departments: Array<{ name: string }>;
  currentUserId: string;
}

function CreateRoomModal({ open, onClose, onCreate, employees, tenders, departments, currentUserId }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("team");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTender, setSelectedTender] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Filter out current user from employees list for private chat
  const otherEmployees = employees.filter(e => e.id !== currentUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let chatName = name.trim();
    let participants: string[] = [];
    let tenderId: string | undefined;
    let departmentName: string | undefined;

    if (type === "private") {
      if (!selectedEmployee) return;
      const emp = employees.find(e => e.id === selectedEmployee);
      chatName = chatName || emp?.name || "Личный чат";
      participants = [selectedEmployee];
    } else if (type === "tender") {
      if (!selectedTender) return;
      const tender = tenders.find(t => t.id === selectedTender);
      chatName = chatName || tender?.name || "Чат по тендеру";
      tenderId = selectedTender;
      participants = selectedEmployees;
    } else if (type === "department") {
      if (!selectedDepartment) return;
      chatName = chatName || `Отдел: ${selectedDepartment}`;
      departmentName = selectedDepartment;
      // Auto-add all employees from the department
      participants = employees
        .filter(e => e.department === selectedDepartment && e.id !== currentUserId)
        .map(e => e.id);
    } else {
      if (!chatName) return;
      participants = selectedEmployees;
    }

    onCreate(chatName, type, participants, tenderId, departmentName);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setType("team");
    setSelectedEmployees([]);
    setSelectedEmployee("");
    setSelectedTender("");
    setSelectedDepartment("");
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const canSubmit = () => {
    if (type === "private") return !!selectedEmployee;
    if (type === "tender") return !!selectedTender;
    if (type === "department") return !!selectedDepartment;
    return !!name.trim();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Тип чата</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setSelectedEmployee(""); setSelectedTender(""); setSelectedDepartment(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Личный</SelectItem>
                <SelectItem value="tender">По тендеру</SelectItem>
                <SelectItem value="department">По отделам</SelectItem>
                <SelectItem value="team">Командный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Private chat - select one employee */}
          {type === "private" && (
            <div>
              <Label>Выберите сотрудника</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {otherEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} {emp.email && <span className="text-muted-foreground">({emp.email})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tender chat - select tender */}
          {type === "tender" && (
            <>
              <div>
                <Label>Выберите тендер</Label>
                <Select value={selectedTender} onValueChange={setSelectedTender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тендер" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenders.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Нет тендеров
                      </div>
                    ) : (
                      tenders.map((tender) => (
                        <SelectItem key={tender.id} value={tender.id}>
                          {tender.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Участники (опционально)</Label>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                  {otherEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Department chat - select department */}
          {type === "department" && (
            <>
              <div>
                <Label>Выберите отдел</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите отдел" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Нет отделов
                      </div>
                    ) : (
                      departments.map((dept) => (
                        <SelectItem key={dept.name} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedDepartment && (
                <div className="text-sm text-muted-foreground">
                  Сотрудники отдела будут добавлены автоматически:
                  <ul className="mt-1 list-disc list-inside">
                    {employees
                      .filter(e => e.department === selectedDepartment && e.id !== currentUserId)
                      .map(e => (
                        <li key={e.id}>{e.name}</li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Team chat - name and participants */}
          {type === "team" && (
            <>
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Название чата"
                  autoFocus
                />
              </div>
              <div>
                <Label>Участники</Label>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                  {otherEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{emp.name}</span>
                      <span className="text-xs text-muted-foreground">{emp.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Optional name for private/tender/department */}
          {(type === "private" || type === "tender" || type === "department") && (
            <div>
              <Label htmlFor="name">Название (опционально)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Оставьте пустым для автоназвания"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Отмена
            </Button>
            <Button type="submit" disabled={!canSubmit()}>
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
