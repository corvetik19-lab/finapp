'use client';

import { useState, useEffect, useRef } from 'react';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import styles from './TenderCommentsSection.module.css';

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
  const newCommentFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/comments`);
      if (!response.ok) throw new Error('Failed to load comments');
      
      const { data } = await response.json();
      setComments(data || []);
      
      // Уведомляем родителя о количестве комментариев
      if (onCountChange) {
        onCountChange((data || []).length);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
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

  return (
    <div className={styles.container}>
      {/* Причины проигрыша */}
      {lossReasonComments.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Причины проигрыша</h3>
          {lossReasonComments.map((comment) => (
            <div key={comment.id} className={`${styles.comment} ${styles.lossReasonComment}`}>
              <div className={styles.commentHeader}>
                {comment.author && (
                  <span className={styles.authorName}>
                    {comment.author.full_name}
                  </span>
                )}
                <span className={styles.commentType}>{getCommentTypeLabel(comment.comment_type)}</span>
                {comment.stage_name && (
                  <span className={styles.stageName}>{comment.stage_name}</span>
                )}
                <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
              </div>

              {editingId === comment.id ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={styles.editTextarea}
                    rows={4}
                  />
                  <div className={styles.newAttachmentField}>
                    <label>Прикрепить новый файл (необязательно)</label>
                    <input
                      type="file"
                      onChange={handleAttachmentChange}
                      className={styles.fileInput}
                      disabled={isSaving}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    {attachmentDraft && (
                      <div className={styles.selectedFileInfo}>
                        <span>{attachmentDraft.name}</span>
                        <button
                          type="button"
                          className={styles.removeSelectedFile}
                          onClick={() => setAttachmentDraft(null)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.editActions}>
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className={styles.saveButton}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={styles.cancelButton}
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
                            <span className={styles.attachmentSize}>
                              ({(attachment.file_size / 1024).toFixed(1)} КБ)
                            </span>
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
                      onClick={() => {
                        setReplyingTo(comment);
                        setTimeout(() => {
                          newCommentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          newCommentFormRef.current?.querySelector('textarea')?.focus();
                        }, 100);
                      }}
                      className={styles.replyButton}
                    >
                      Ответить
                    </button>
                    <button
                      onClick={() => handleEdit(comment)}
                      className={styles.editButton}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}

              {/* Ответы на этот комментарий */}
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className={`${styles.comment} ${styles.replyComment}`}>
                  <div className={styles.commentHeader}>
                    {reply.author && (
                      <span className={styles.authorName}>
                        {reply.author.full_name}
                      </span>
                    )}
                    <span className={styles.replyBadge}>Ответ</span>
                    <span className={styles.commentDate}>{formatDate(reply.created_at)}</span>
                  </div>

                  {reply.parent_comment && (
                    <div className={styles.parentCommentQuote}>
                      <div className={styles.quoteHeader}>
                        <span className={styles.quoteIcon}>↩️</span>
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
                            <span className={styles.attachmentSize}>
                              ({(attachment.file_size / 1024).toFixed(1)} КБ)
                            </span>
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
                    <button
                      onClick={() => handleEdit(reply)}
                      className={styles.editButton}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Остальные комментарии */}
      {otherComments.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Комментарии</h3>
          {otherComments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <div className={styles.commentHeader}>
                {comment.author && (
                  <span className={styles.authorName}>
                    {comment.author.full_name}
                  </span>
                )}
                <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
              </div>

              {editingId === comment.id ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={styles.editTextarea}
                    rows={4}
                  />
                  <div className={styles.newAttachmentField}>
                    <label>Прикрепить новый файл (необязательно)</label>
                    <input
                      type="file"
                      onChange={handleAttachmentChange}
                      className={styles.fileInput}
                      disabled={isSaving}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    {attachmentDraft && (
                      <div className={styles.selectedFileInfo}>
                        <span>{attachmentDraft.name}</span>
                        <button
                          type="button"
                          className={styles.removeSelectedFile}
                          onClick={() => setAttachmentDraft(null)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.editActions}>
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className={styles.saveButton}
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={styles.cancelButton}
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
                            <span className={styles.attachmentSize}>
                              ({(attachment.file_size / 1024).toFixed(1)} КБ)
                            </span>
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
                      onClick={() => {
                        setReplyingTo(comment);
                        setTimeout(() => {
                          newCommentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          newCommentFormRef.current?.querySelector('textarea')?.focus();
                        }, 100);
                      }}
                      className={styles.replyButton}
                    >
                      Ответить
                    </button>
                    <button
                      onClick={() => handleEdit(comment)}
                      className={styles.editButton}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}

              {/* Ответы на этот комментарий */}
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className={`${styles.comment} ${styles.replyComment}`}>
                  <div className={styles.commentHeader}>
                    {reply.author && (
                      <span className={styles.authorName}>
                        {reply.author.full_name}
                      </span>
                    )}
                    <span className={styles.replyBadge}>Ответ</span>
                    <span className={styles.commentDate}>{formatDate(reply.created_at)}</span>
                  </div>

                  {reply.parent_comment && (
                    <div className={styles.parentCommentQuote}>
                      <div className={styles.quoteHeader}>
                        <span className={styles.quoteIcon}>↩️</span>
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
                            <span className={styles.attachmentSize}>
                              ({(attachment.file_size / 1024).toFixed(1)} КБ)
                            </span>
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
                    <button
                      onClick={() => handleEdit(reply)}
                      className={styles.editButton}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div className={styles.empty}>
          <p>Комментариев пока нет</p>
        </div>
      )}

      <form ref={newCommentFormRef} className={styles.newCommentForm} onSubmit={handleCreateComment}>
        <h4 className={styles.newCommentTitle}>Добавить комментарий</h4>
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
          onChange={(e) => setNewComment(e.target.value)}
          className={styles.newCommentTextarea}
          rows={4}
          placeholder={replyingTo ? "Напишите ответ..." : "Напишите комментарий..."}
          disabled={isCreating}
        />
        <div className={styles.newAttachmentControls}>
          <label className={styles.fileInputLabel}>
            <span className={styles.fileIcon}>📎</span>
            <span>{newAttachment ? newAttachment.name : 'Прикрепить файл'}</span>
            <input
              type="file"
              className={styles.fileInput}
              onChange={handleNewAttachmentChange}
              disabled={isCreating}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
          </label>
          {newAttachment && (
            <button
              type="button"
              className={styles.removeSelectedFile}
              onClick={() => setNewAttachment(null)}
              disabled={isCreating}
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isCreating || !newComment.trim()}
        >
          {isCreating ? 'Сохранение...' : 'Добавить комментарий'}
        </button>
      </form>

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
