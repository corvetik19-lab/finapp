'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Video, 
  VideoOff,
  Calendar,
  Clock,
  Phone,
  PhoneOff,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Conference {
  id: string;
  title: string;
  description: string | null;
  jitsi_room_name: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  host_id: string;
  created_at: string;
}

interface Props {
  initialConferences: Conference[];
  employees: Employee[];
  companyId: string;
  userId: string;
  userName: string;
  isAdmin: boolean;
}

// Генерация уникального имени комнаты Jitsi
function generateJitsiRoomName(title: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/gi, '')
    .substring(0, 15);
  return `finapp-${sanitizedTitle}-${randomPart}-${timestamp}`;
}

export default function ConferencesClient({ 
  initialConferences, 
  employees, 
  companyId, 
  userId, 
  userName,
  isAdmin 
}: Props) {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>(initialConferences);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeConference, setActiveConference] = useState<Conference | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    scheduledTime: '',
    durationMinutes: 60,
    participantIds: [] as string[],
  });

  // Separate conferences by status
  const upcomingConferences = conferences.filter(c => 
    c.status === 'scheduled' && c.scheduled_at && new Date(c.scheduled_at) > new Date()
  );
  const activeConferences = conferences.filter(c => c.status === 'active');
  const pastConferences = conferences.filter(c => 
    c.status === 'ended' || c.status === 'cancelled' ||
    (c.status === 'scheduled' && c.scheduled_at && new Date(c.scheduled_at) < new Date())
  );

  const handleCreateConference = async (startNow = false) => {
    if (!formData.title.trim()) return;
    
    setIsCreating(true);
    try {
      const jitsiRoomName = generateJitsiRoomName(formData.title);
      
      const scheduledAt = startNow ? null : 
        (formData.scheduledAt && formData.scheduledTime) 
          ? new Date(`${formData.scheduledAt}T${formData.scheduledTime}`).toISOString()
          : null;

      const response = await fetch('/api/team/conferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          jitsi_room_name: jitsiRoomName,
          scheduled_at: scheduledAt,
          duration_minutes: formData.durationMinutes,
          status: startNow ? 'active' : 'scheduled',
          company_id: companyId,
          host_id: userId,
          participant_ids: formData.participantIds,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        setConferences([data, ...conferences]);
        setShowCreateModal(false);
        setFormData({ 
          title: '', 
          description: '', 
          scheduledAt: '', 
          scheduledTime: '',
          durationMinutes: 60, 
          participantIds: [] 
        });
        
        if (startNow) {
          setActiveConference(data);
          setShowJoinModal(true);
        }
        
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating conference:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinConference = (conference: Conference) => {
    setActiveConference(conference);
    setShowJoinModal(true);
  };

  const handleLeaveConference = () => {
    setActiveConference(null);
    setShowJoinModal(false);
    setIsFullscreen(false);
  };

  const handleEndConference = async (conferenceId: string) => {
    try {
      await fetch(`/api/team/conferences/${conferenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      });
      
      setConferences(conferences.map(c => 
        c.id === conferenceId ? { ...c, status: 'ended' as const } : c
      ));
      handleLeaveConference();
    } catch (error) {
      console.error('Error ending conference:', error);
    }
  };

  const handleDeleteConference = async (conferenceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту конференцию?')) return;
    
    try {
      await fetch(`/api/team/conferences/${conferenceId}`, {
        method: 'DELETE',
      });
      setConferences(conferences.filter(c => c.id !== conferenceId));
    } catch (error) {
      console.error('Error deleting conference:', error);
    }
  };

  const copyJoinLink = (roomName: string) => {
    navigator.clipboard.writeText(`https://meet.jit.si/${roomName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      participantIds: prev.participantIds.includes(memberId)
        ? prev.participantIds.filter(id => id !== memberId)
        : [...prev.participantIds, memberId],
    }));
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Conference['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">В эфире</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Запланировано</Badge>;
      case 'ended':
        return <Badge variant="outline">Завершено</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Отменено</Badge>;
    }
  };

  // Jitsi Meet URL
  const getJitsiUrl = (roomName: string) => {
    const params = new URLSearchParams({
      'userInfo.displayName': userName,
    });
    return `https://meet.jit.si/${roomName}#${params.toString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Видеоконференции
          </h1>
          <p className="text-muted-foreground mt-1">
            Проводите встречи через Jitsi Meet
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать встречу
            </Button>
          )}
        </div>
      </div>

      {/* Active Conferences */}
      {activeConferences.length > 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Активные встречи
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConferences.map(conference => (
              <div key={conference.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                  <h4 className="font-medium">{conference.title}</h4>
                  {conference.description && (
                    <p className="text-sm text-muted-foreground">{conference.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleJoinConference(conference)}>
                    <Phone className="h-4 w-4 mr-2" />
                    Присоединиться
                  </Button>
                  {(isAdmin || conference.host_id === userId) && (
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleEndConference(conference.id)}
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Предстоящие ({upcomingConferences.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Прошедшие ({pastConferences.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingConferences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Нет запланированных встреч</h3>
                <p className="text-muted-foreground mt-1">
                  {isAdmin 
                    ? 'Создайте новую встречу или начните мгновенный звонок'
                    : 'Вас пока не пригласили ни на одну встречу'}
                </p>
                {isAdmin && (
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать встречу
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingConferences.map(conference => (
                <Card key={conference.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{conference.title}</h4>
                          {getStatusBadge(conference.status)}
                        </div>
                        {conference.description && (
                          <p className="text-sm text-muted-foreground mt-1">{conference.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {conference.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDateTime(conference.scheduled_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {conference.duration_minutes} мин
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyJoinLink(conference.jitsi_room_name)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button onClick={() => handleJoinConference(conference)}>
                          <Phone className="h-4 w-4 mr-2" />
                          Войти
                        </Button>
                        {(isAdmin || conference.host_id === userId) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDeleteConference(conference.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastConferences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <VideoOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Нет прошедших встреч</h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastConferences.map(conference => (
                <Card key={conference.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{conference.title}</h4>
                          {getStatusBadge(conference.status)}
                        </div>
                        {conference.scheduled_at && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDateTime(conference.scheduled_at)}
                          </p>
                        )}
                      </div>
                      {(isAdmin || conference.host_id === userId) && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteConference(conference.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Conference Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать видеовстречу</DialogTitle>
            <DialogDescription>
              Создайте новую встречу или начните мгновенный звонок
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название встречи *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Обсуждение тендера"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="О чём будет встреча..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата (для планирования)</Label>
                <Input
                  type="date"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Время</Label>
                <Input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Пригласить участников</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {employees.filter(e => e.id !== userId).map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleMember(employee.id)}
                  >
                    <Checkbox
                      checked={formData.participantIds.includes(employee.id)}
                      onCheckedChange={() => toggleMember(employee.id)}
                    />
                    <span className="text-sm">{employee.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Отмена
            </Button>
            <Button 
              variant="secondary"
              onClick={() => handleCreateConference(false)} 
              disabled={!formData.title.trim() || isCreating || !formData.scheduledAt}
            >
              Запланировать
            </Button>
            <Button 
              onClick={() => handleCreateConference(true)} 
              disabled={!formData.title.trim() || isCreating}
            >
              <Phone className="h-4 w-4 mr-2" />
              Начать сейчас
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Jitsi Meet Modal */}
      <Dialog open={showJoinModal} onOpenChange={(open) => !open && handleLeaveConference()}>
        <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl h-[80vh]'} p-0`} aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Видеовстреча</DialogTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-medium">{activeConference?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Jitsi Meet • {activeConference?.jitsi_room_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => copyJoinLink(activeConference?.jitsi_room_name || '')}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(getJitsiUrl(activeConference?.jitsi_room_name || ''), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" onClick={handleLeaveConference}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Выйти
                </Button>
              </div>
            </div>
            <div ref={jitsiContainerRef} className="flex-1">
              {activeConference && (
                <iframe
                  src={getJitsiUrl(activeConference.jitsi_room_name)}
                  className="w-full h-full border-0"
                  allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
