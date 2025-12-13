'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Kanban, 
  Users, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Archive,
  Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface KanbanBoard {
  id: string;
  name: string;
  description: string | null;
  background_color: string;
  is_template: boolean;
  created_at: string;
  members?: { count: number }[];
}

interface Props {
  initialBoards: KanbanBoard[];
  employees: Employee[];
  companyId: string;
  userId: string;
  isAdmin: boolean;
}

export default function KanbanBoardsClient({ 
  initialBoards, 
  employees, 
  companyId, 
  userId, 
  isAdmin 
}: Props) {
  const router = useRouter();
  const [boards, setBoards] = useState<KanbanBoard[]>(initialBoards);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
  });

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBoard = async () => {
    if (!formData.name.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/team/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          member_ids: formData.memberIds,
          company_id: companyId,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        setBoards([data, ...boards]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', memberIds: [] });
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту доску?')) return;
    
    try {
      const response = await fetch(`/api/team/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoards(boards.filter(b => b.id !== boardId));
      }
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const toggleMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Kanban className="h-6 w-6 text-primary" />
            Канбан-доски
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление задачами в визуальном формате
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать доску
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск досок..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Kanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Нет досок</h3>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'Создайте первую канбан-доску для организации работы команды'
                : 'Вас ещё не пригласили ни на одну доску'}
            </p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать доску
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((board) => (
            <Card 
              key={board.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/tenders/team/boards/${board.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: board.background_color || '#6366f1' }}
                  >
                    <Kanban className="h-5 w-5 text-white" />
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                          <Archive className="h-4 w-4 mr-2" />
                          Архивировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{board.name}</CardTitle>
                {board.description && (
                  <CardDescription className="line-clamp-2">{board.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{board.members?.[0]?.count || 1} участников</span>
                  </div>
                  {board.is_template && (
                    <Badge variant="secondary">Шаблон</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать канбан-доску</DialogTitle>
            <DialogDescription>
              Создайте новую доску для управления задачами команды
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Тендер №123"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишите цель доски..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Пригласить участников</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {employees.filter(e => e.id !== userId).map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleMember(employee.id)}
                  >
                    <Checkbox
                      checked={formData.memberIds.includes(employee.id)}
                      onCheckedChange={() => toggleMember(employee.id)}
                    />
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="text-sm">{employee.full_name}</span>
                  </div>
                ))}
                {employees.filter(e => e.id !== userId).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Нет доступных сотрудников
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateBoard} disabled={!formData.name.trim() || isCreating}>
              {isCreating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
