'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Paperclip, Reply, Pencil, Trash2, X, Send, MessageSquare } from 'lucide-react';

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

interface TenderCommentsSectionProps {
  tenderId: string;
  onCountChange?: (count: number) => void;
}

export function TenderCommentsSection({ tenderId, onCountChange }: TenderCommentsSectionProps) {
  const [comments, setComments] = useState<TenderComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachmentDraft, setAttachmentDraft] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TenderComment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const newCommentFormRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments`);
      if (!response.ok) throw new Error('Failed to load comments');
      
      const { data, currentUserId: userId } = await response.json();
      setComments(data || []);
      
      // Устанавливаем ID текущего пользователя
      if (userId) {
        setCurrentUserId(userId);
      }
      
      // Уведомляем родителя о количестве комментариев
      if (onCountChange) {
        onCountChange((data || []).length);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [tenderId, onCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleEdit = (comment: TenderComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setAttachmentDraft(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) throw new Error('Failed to update comment');

      if (attachmentDraft) {
        const formData = new FormData();
        formData.append('file', attachmentDraft);
        const uploadResponse = await fetch(`/api/tenders/${tenderId}/comments/${commentId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('Upload error:', errorData);
          throw new Error(`Failed to upload attachment: ${errorData.details || errorData.error}`);
        }
      }

      await loadComments();
      setEditingId(null);
      setEditContent('');
      setAttachmentDraft(null);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Ошибка при обновлении комментария');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setAttachmentDraft(null);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      const response = await fetch(`/api/tenders/${tenderId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Ошибка при удалении комментария');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCommentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loss_reason: 'Причина проигрыша',
      stage_change: 'Смена этапа',
      general: 'Комментарий',
    };
    return labels[type] || 'Комментарий';
  };

  const downloadAttachment = async (commentId: string, attachment: CommentAttachment) => {
    const url = `/api/tenders/${tenderId}/comments/${commentId}/attachments/${attachment.id}`;
    
    // Открываем все файлы в модалке для предпросмотра
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
      await loadComments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Ошибка при удалении файла');
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 МБ');
      return;
    }
    setAttachmentDraft(file);
  };

  const handleNewAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 МБ');
      return;
    }
    setNewAttachment(file);
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsCreating(true);
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

      const { data: createdComment } = await response.json();

      if (createdComment && newAttachment) {
        const formData = new FormData();
        formData.append('file', newAttachment);
        const uploadResponse = await fetch(`/api/tenders/${tenderId}/comments/${createdComment.id}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          console.error('Attachment upload failed:', uploadError);
        }
      }

      setNewComment('');
      setNewAttachment(null);
      setReplyingTo(null);
      await loadComments();
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Ошибка при создании комментария');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
        <p>Загрузка комментариев...</p>
      </div>
    );
  }

  // Разделяем на корневые комментарии и ответы
  const lossReasonComments = comments.filter(c => c.comment_type === 'loss_reason' && !c.parent_comment_id);
  const otherComments = comments.filter(c => c.comment_type !== 'loss_reason' && !c.parent_comment_id);
  
  // Функция для получения ответов на конкретный комментарий
  const getReplies = (commentId: string) => {
    return comments.filter(c => c.parent_comment_id === commentId);
  };

  // Хелпер для рендеринга комментария
  const renderComment = (comment: TenderComment, isReply = false, isLossReason = false) => (
    <Card key={comment.id} className={`mb-3 ${isReply ? 'ml-8 border-l-2 border-l-blue-500' : ''} ${isLossReason ? 'bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {comment.author && (
            <span className="font-semibold text-gray-900">
              {comment.author.full_name}
            </span>
          )}
          {isLossReason && (
            <Badge variant="destructive" className="text-xs">
              {getCommentTypeLabel(comment.comment_type)}
            </Badge>
          )}
          {isReply && (
            <Badge variant="secondary" className="text-xs">Ответ</Badge>
          )}
          {comment.stage_name && (
            <span className="text-sm text-gray-500">{comment.stage_name}</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.created_at)}</span>
        </div>

        {editingId === comment.id ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Прикрепить файл (необязательно)</label>
              <input
                type="file"
                onChange={handleAttachmentChange}
                disabled={isSaving}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="text-sm"
              />
              {attachmentDraft && (
                <div className="flex items-center gap-2 text-sm">
                  <span>{attachmentDraft.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachmentDraft(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSaveEdit(comment.id)}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Цитата родительского комментария */}
            {isReply && comment.parent_comment && (
              <div className="mb-3 pl-3 border-l-2 border-gray-200">
                {comment.parent_comment.author && (
                  <span className="text-xs font-semibold text-blue-600">
                    {comment.parent_comment.author.full_name}
                  </span>
                )}
                <p className="text-sm text-gray-500 line-clamp-2">{comment.parent_comment.content}</p>
              </div>
            )}
            
            <p className="text-gray-700 whitespace-pre-wrap mb-3">{comment.content}</p>
            
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {comment.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAttachment(comment.id, attachment)}
                      className="h-auto py-1.5"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                      <span className="text-gray-400 ml-2">
                        ({(attachment.file_size / 1024).toFixed(1)} КБ)
                      </span>
                    </Button>
                    {currentUserId === comment.author_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAttachmentDelete(comment.id, attachment.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(comment);
                    setTimeout(() => {
                      newCommentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      newCommentFormRef.current?.querySelector('textarea')?.focus();
                    }, 100);
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Ответить
                </Button>
              )}
              {currentUserId === comment.author_id && (
                <Button variant="ghost" size="sm" onClick={() => handleEdit(comment)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
              )}
              {currentUserId === comment.author_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Удалить
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Причины проигрыша */}
      {lossReasonComments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Причины проигрыша
          </h3>
          {lossReasonComments.map((comment) => (
            <div key={comment.id}>
              {renderComment(comment, false, true)}
              {getReplies(comment.id).map((reply) => renderComment(reply, true))}
            </div>
          ))}
        </div>
      )}

      {/* Остальные комментарии */}
      {otherComments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Комментарии
          </h3>
          {otherComments.map((comment) => (
            <div key={comment.id}>
              {renderComment(comment)}
              {getReplies(comment.id).map((reply) => renderComment(reply, true))}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Комментариев пока нет</p>
        </div>
      )}

      {/* Форма добавления комментария */}
      <Card ref={newCommentFormRef}>
        <CardContent className="p-4">
          <form onSubmit={handleCreateComment} className="space-y-4">
            <h4 className="font-semibold text-gray-900">Добавить комментарий</h4>
            
            {replyingTo && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600">
                    Ответ на комментарий
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{replyingTo.content}</p>
              </div>
            )}
            
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
              placeholder={replyingTo ? "Напишите ответ..." : "Напишите комментарий..."}
              disabled={isCreating}
            />
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                <Paperclip className="h-4 w-4" />
                <span>{newAttachment ? newAttachment.name : 'Прикрепить файл'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleNewAttachmentChange}
                  disabled={isCreating}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </label>
              {newAttachment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewAttachment(null)}
                  disabled={isCreating}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isCreating || !newComment.trim()}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isCreating ? 'Сохранение...' : 'Добавить комментарий'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Модалка предпросмотра вложений */}
      {previewAttachment && (
        <AttachmentPreviewModal
          fileUrl={previewAttachment.url}
          fileName={previewAttachment.fileName}
          mimeType={previewAttachment.mimeType}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
