'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast/ToastContext';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Paperclip, Send, Reply, Pencil, Trash2, Loader2 } from 'lucide-react';

interface CommentAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface TenderComment {
  id: string;
  tender_id: string;
  author_id: string;
  content: string;
  comment_type: string;
  stage_name: string | null;
  created_at: string;
  updated_at: string;
  attachments?: CommentAttachment[];
  parent_comment_id?: string | null;
  parent_comment?: {
    id: string;
    content: string;
    author_id: string;
    author?: {
      full_name: string;
    };
  } | null;
  author?: {
    full_name: string;
  };
}

interface UserPresence {
  userId: string;
  fullName?: string;
  isTyping?: boolean;
}

// Типизация для канала Realtime
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

interface TenderCommentsSidebarProps {
  tenderId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TenderCommentsSidebar({ tenderId, isOpen, onClose, onUpdate }: TenderCommentsSidebarProps) {
  const toast = useToast();
  const [comments, setComments] = useState<TenderComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<TenderComment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Подписка на Realtime события
  useEffect(() => {
    if (!isOpen || !tenderId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`tender_comments_${tenderId}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tender_comments',
          filter: `tender_id=eq.${tenderId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Загружаем детали нового комментария (автора)
            const { data: newCommentData } = await supabase
              .from('tender_comments')
              .select('*, author:employees(full_name)')
              .eq('id', payload.new.id)
              .single();

            if (newCommentData) {
              // Приводим к нужному формату
              const formattedComment: TenderComment = {
                ...newCommentData,
                author: newCommentData.author ? { full_name: newCommentData.author.full_name } : undefined,
                attachments: [], // Вложения приходят отдельно или через другой запрос
              };
              
              setComments((prev) => {
                if (prev.find(c => c.id === formattedComment.id)) return prev;
                const newComments = [...prev, formattedComment];
                onUpdate?.();
                return newComments;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => {
              const newComments = prev.filter((c) => c.id !== payload.old.id);
              onUpdate?.();
              return newComments;
            });
          } else if (payload.eventType === 'UPDATE') {
            setComments((prev) => prev.map(c => c.id === payload.new.id ? { ...c, content: payload.new.content, updated_at: payload.new.updated_at } : c));
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const typing: string[] = [];
        
        Object.values(newState).forEach((presences) => {
          (presences as unknown as UserPresence[]).forEach((presence) => {
            if (presence.isTyping && presence.userId !== currentUserId) {
              typing.push(presence.fullName || 'Кто-то');
            }
          });
        });
        
        setTypingUsers([...new Set(typing)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isOpen, tenderId, currentUserId, onUpdate]);

  const handleTyping = () => {
    if (!channelRef.current || !currentUserId) return;

    // Определяем имя пользователя из существующих комментариев
    const userName = comments.find(c => c.author_id === currentUserId)?.author?.full_name || 'Пользователь';

    channelRef.current.track({
      userId: currentUserId,
      fullName: userName,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.track({
          userId: currentUserId,
          isTyping: false,
        });
      }
    }, 2000);
  };

  const loadComments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments`);
      if (!response.ok) throw new Error('Failed to load comments');
      
      const { data, currentUserId: userId } = await response.json();
      setComments(data || []);
      
      // Устанавливаем текущего пользователя если API вернул его
      if (userId) {
        setCurrentUserId(userId);
      } else if (data && data.length > 0) {
        // Иначе берем author_id из последнего комментария как временное решение
        const lastComment = data[data.length - 1];
        if (lastComment && lastComment.author_id) {
          setCurrentUserId(lastComment.author_id);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          comment_type: 'general',
          parent_comment_id: replyingTo?.id || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const { data: comment } = await response.json();

      // Сохраняем ID текущего пользователя из созданного комментария
      if (comment && comment.author_id && !currentUserId) {
        setCurrentUserId(comment.author_id);
      }

      // Загружаем файл если есть
      if (attachmentFile && comment) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const uploadResponse = await fetch(`/api/tenders/${tenderId}/comments/${comment.id}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          console.error('Failed to upload attachment');
          toast.show('Не удалось загрузить файл', { type: 'error' });
        }
      }

      setNewComment('');
      setAttachmentFile(null);
      setReplyingTo(null);
      await loadComments(true);
      onUpdate?.();
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.show('Ошибка при создании комментария', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.show('Размер файла не должен превышать 10 МБ', { type: 'error' });
      return;
    }
    setAttachmentFile(file);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      const response = await fetch(`/api/tenders/${tenderId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete comment');
      await loadComments(true);
      onUpdate?.();
      toast.show('Комментарий удален', { type: 'success' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.show('Ошибка при удалении комментария', { type: 'error' });
    }
  };

  const downloadAttachment = (commentId: string, attachment: CommentAttachment) => {
    const url = `/api/tenders/${tenderId}/comments/${commentId}/attachments/${attachment.id}`;
    setPreviewAttachment({
      url,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
    });
  };

  const handleAttachmentDelete = async (commentId: string, attachmentId: string) => {
    if (!confirm('Удалить файл?')) return;

    try {
      const response = await fetch(`/api/tenders/${tenderId}/comments/${commentId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete attachment');
      await loadComments(true);
      toast.show('Файл удален', { type: 'success' });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.show('Ошибка при удалении файла', { type: 'error' });
    }
  };

  const handleEdit = (comment: TenderComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) throw new Error('Failed to update comment');

      setEditingId(null);
      setEditContent('');
      await loadComments(true);
      toast.show('Комментарий обновлен', { type: 'success' });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.show('Ошибка при обновлении комментария', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Фильтруем только корневые комментарии
  const rootComments = comments.filter(c => !c.parent_comment_id);
  
  // Функция для получения ответов на комментарий
  const getReplies = (commentId: string) => {
    return comments.filter(c => c.parent_comment_id === commentId);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-lg">💬 Комментарии</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Загрузка...</p>
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Комментариев пока нет</p>
            </div>
          )}
          {!loading && comments.length > 0 && (
            <div className="space-y-4">
              {rootComments.map((comment) => (
                <div key={comment.id}>
                  <div className="bg-white border rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      {comment.author && (
                        <span className="font-medium text-sm text-gray-900">{comment.author.full_name}</span>
                      )}
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); handleTyping(); }} rows={3} disabled={isSaving} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(comment.id)} disabled={isSaving || !editContent.trim()}>
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>Отмена</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {comment.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center gap-2 text-sm">
                                <button onClick={() => downloadAttachment(comment.id, attachment)} className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                                </button>
                                <button onClick={() => handleAttachmentDelete(comment.id, attachment.id)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2 pt-2 border-t">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyingTo(comment)}><Reply className="h-3 w-3 mr-1" />Ответить</Button>
                          {currentUserId === comment.author_id && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEdit(comment)}><Pencil className="h-3 w-3 mr-1" />Изменить</Button>
                          )}
                          {currentUserId === comment.author_id && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(comment.id)}><Trash2 className="h-3 w-3 mr-1" />Удалить</Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="ml-4 mt-2 bg-gray-50 border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {reply.author && <span className="font-medium text-sm text-gray-900">{reply.author.full_name}</span>}
                        <Badge variant="secondary" className="text-xs">Ответ</Badge>
                        <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                      </div>
                      {editingId === reply.id ? (
                        <div className="space-y-2">
                          <Textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); handleTyping(); }} rows={3} disabled={isSaving} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(reply.id)} disabled={isSaving || !editContent.trim()}>{isSaving ? 'Сохранение...' : 'Сохранить'}</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>Отмена</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {reply.parent_comment && (
                            <div className="bg-white border-l-2 border-blue-300 pl-2 mb-2 text-xs text-gray-500">
                              {reply.parent_comment.author && <span className="font-medium">{reply.parent_comment.author.full_name}: </span>}
                              <span className="line-clamp-1">{reply.parent_comment.content}</span>
                            </div>
                          )}
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {reply.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center gap-2 text-sm">
                                  <button onClick={() => downloadAttachment(reply.id, attachment)} className="flex items-center gap-1 text-blue-600 hover:underline">
                                    <Paperclip className="h-3 w-3" /><span className="truncate max-w-[180px]">{attachment.file_name}</span>
                                  </button>
                                  <button onClick={() => handleAttachmentDelete(reply.id, attachment.id)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2 pt-2 border-t">
                            {currentUserId === reply.author_id && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleEdit(reply)}><Pencil className="h-3 w-3 mr-1" />Изменить</Button>
                            )}
                            {currentUserId === reply.author_id && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600" onClick={() => handleDelete(reply.id)}><Trash2 className="h-3 w-3 mr-1" />Удалить</Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {typingUsers.length > 0 && (
            <div className="text-sm text-gray-500 italic animate-pulse">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'печатает' : 'печатают'}...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 space-y-3">
          {replyingTo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 text-xs text-blue-700">
                  <Reply className="h-3 w-3" />
                  <span>Ответ на комментарий</span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-blue-500 hover:text-blue-700"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{replyingTo.content}</p>
            </div>
          )}
          <Textarea
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); handleTyping(); }}
            placeholder={replyingTo ? "Напишите ответ..." : "Добавить комментарий..."}
            rows={3}
            disabled={isSubmitting}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md cursor-pointer hover:bg-gray-50 text-sm flex-1">
              <Paperclip className="h-4 w-4 text-gray-500" />
              <span className="truncate text-gray-600">{attachmentFile ? attachmentFile.name : 'Прикрепить файл'}</span>
              <input type="file" onChange={handleFileChange} className="hidden" disabled={isSubmitting} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
            </label>
            {attachmentFile && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setAttachmentFile(null)} disabled={isSubmitting}><X className="h-4 w-4" /></Button>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Отправка...</> : <><Send className="h-4 w-4 mr-2" />Отправить</>}
          </Button>
        </form>
      </div>
      {previewAttachment && (
        <AttachmentPreviewModal fileUrl={previewAttachment.url} fileName={previewAttachment.fileName} mimeType={previewAttachment.mimeType} onClose={() => setPreviewAttachment(null)} />
      )}
    </>
  );
}
