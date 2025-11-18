'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast/ToastContext';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import styles from './TenderCommentsSidebar.module.css';

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

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenderId]);

  const loadComments = async (silent = false) => {
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
  };

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
      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Комментарии</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Загрузка...</p>
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div className={styles.empty}>
              <p>Комментариев пока нет</p>
            </div>
          )}

          {!loading && comments.length > 0 && (
            <div className={styles.commentsList}>
              {rootComments.map((comment) => (
                <div key={comment.id}>
                  <div className={styles.comment}>
                    <div className={styles.commentHeader}>
                      {comment.author && (
                        <span className={styles.authorName}>{comment.author.full_name}</span>
                      )}
                      <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                    </div>

                    {editingId === comment.id ? (
                      <div className={styles.editForm}>
                        <textarea
                          value={editContent}
                          onChange={(e) => {
                            setEditContent(e.target.value);
                            handleTyping();
                          }}
                          className={styles.editTextarea}
                          rows={3}
                          disabled={isSaving}
                        />
                        <div className={styles.editActions}>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className={styles.saveButton}
                            disabled={isSaving || !editContent.trim()}
                          >
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={styles.cancelButton}
                            disabled={isSaving}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={styles.commentContent}>{comment.content}</p>

                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className={styles.attachments}>
                            {comment.attachments.map((attachment) => (
                              <div key={attachment.id} className={styles.attachmentRow}>
                                <button
                                  onClick={() => downloadAttachment(comment.id, attachment)}
                                  className={styles.attachmentButton}
                                >
                                  <span className={styles.attachmentIcon}>📎</span>
                                  <span className={styles.attachmentName}>{attachment.file_name}</span>
                                </button>
                                <button
                                  type="button"
                                  className={styles.attachmentDeleteButton}
                                  onClick={() => handleAttachmentDelete(comment.id, attachment.id)}
                                  title="Удалить файл"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={styles.commentActions}>
                          <button
                            onClick={() => setReplyingTo(comment)}
                            className={styles.replyButton}
                          >
                            Ответить
                          </button>
                          {currentUserId === comment.author_id && (
                            <button
                              onClick={() => handleEdit(comment)}
                              className={styles.editButton}
                            >
                              Редактировать
                            </button>
                          )}
                          {currentUserId === comment.author_id && (
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className={styles.deleteButton}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ответы на этот комментарий */}
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className={`${styles.comment} ${styles.replyComment}`}>
                      <div className={styles.commentHeader}>
                        {reply.author && (
                          <span className={styles.authorName}>{reply.author.full_name}</span>
                        )}
                        <span className={styles.replyBadge}>Ответ</span>
                        <span className={styles.commentDate}>{formatDate(reply.created_at)}</span>
                      </div>

                      {editingId === reply.id ? (
                        <div className={styles.editForm}>
                          <textarea
                            value={editContent}
                            onChange={(e) => {
                              setEditContent(e.target.value);
                              handleTyping();
                            }}
                            className={styles.editTextarea}
                            rows={3}
                            disabled={isSaving}
                          />
                          <div className={styles.editActions}>
                            <button
                              onClick={() => handleSaveEdit(reply.id)}
                              className={styles.saveButton}
                              disabled={isSaving || !editContent.trim()}
                            >
                              {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={styles.cancelButton}
                              disabled={isSaving}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {reply.parent_comment && (
                            <div className={styles.parentCommentQuote}>
                              <div className={styles.quoteHeader}>
                                {reply.parent_comment.author && (
                                  <span className={styles.quoteAuthor}>
                                    {reply.parent_comment.author.full_name}
                                  </span>
                                )}
                              </div>
                              <p className={styles.quoteContent}>{reply.parent_comment.content}</p>
                            </div>
                          )}

                          <p className={styles.commentContent}>{reply.content}</p>

                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className={styles.attachments}>
                              {reply.attachments.map((attachment) => (
                                <div key={attachment.id} className={styles.attachmentRow}>
                                  <button
                                    onClick={() => downloadAttachment(reply.id, attachment)}
                                    className={styles.attachmentButton}
                                  >
                                    <span className={styles.attachmentIcon}>📎</span>
                                    <span className={styles.attachmentName}>{attachment.file_name}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.attachmentDeleteButton}
                                    onClick={() => handleAttachmentDelete(reply.id, attachment.id)}
                                    title="Удалить файл"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={styles.commentActions}>
                            {currentUserId === reply.author_id && (
                              <button
                                onClick={() => handleEdit(reply)}
                                className={styles.editButton}
                              >
                                Редактировать
                              </button>
                            )}
                            {currentUserId === reply.author_id && (
                              <button
                                onClick={() => handleDelete(reply.id)}
                                className={styles.deleteButton}
                              >
                                Удалить
                              </button>
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
            <div className={styles.typingIndicator}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'печатает' : 'печатают'}...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {replyingTo && (
            <div className={styles.replyingToBox}>
              <div className={styles.replyingToHeader}>
                <span className={styles.replyingToIcon}>↩️</span>
                <span className={styles.replyingToText}>Ответ на комментарий</span>
                <button
                  type="button"
                  className={styles.cancelReplyButton}
                  onClick={() => setReplyingTo(null)}
                >
                  ✕
                </button>
              </div>
              <p className={styles.replyingToContent}>{replyingTo.content}</p>
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              handleTyping();
            }}
            placeholder={replyingTo ? "Напишите ответ..." : "Добавить комментарий..."}
            className={styles.textarea}
            rows={3}
            disabled={isSubmitting}
          />
          
          <div className={styles.fileInputWrapper}>
            <label className={styles.fileInputLabel}>
              <span className={styles.fileIcon}>📎</span>
              <span>{attachmentFile ? attachmentFile.name : 'Прикрепить файл'}</span>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                disabled={isSubmitting}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </label>
            {attachmentFile && (
              <button
                type="button"
                onClick={() => setAttachmentFile(null)}
                className={styles.removeFileButton}
                disabled={isSubmitting}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>

      {previewAttachment && (
        <AttachmentPreviewModal
          fileUrl={previewAttachment.url}
          fileName={previewAttachment.fileName}
          mimeType={previewAttachment.mimeType}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </>
  );
}
