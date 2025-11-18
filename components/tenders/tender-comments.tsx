'use client';

import { useEffect, useState } from 'react';
import type { TenderComment } from '@/lib/tenders/types';

interface TenderCommentsProps {
  tenderId: string;
}

export function TenderComments({ tenderId }: TenderCommentsProps) {
  const [comments, setComments] = useState<TenderComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tenderId}/comments`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки комментариев');
      }

      const data = await response.json();
      setComments(data.data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/tenders/${tenderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания комментария');
      }

      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Error creating comment:', err);
      alert('Ошибка при создании комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">⚠️ Ошибка</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Форма добавления комментария */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4">
        <label htmlFor="new-comment" className="block text-sm font-medium text-gray-700 mb-2">
          Добавить комментарий
        </label>
        <textarea
          id="new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Введите комментарий..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={submitting}
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </form>

      {/* Список комментариев */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Комментариев пока нет
          </h3>
          <p className="text-gray-600">
            Будьте первым, кто оставит комментарий
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-icons text-blue-600">person</span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Пользователь
                      </h4>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-gray-500 italic">
                        изменено
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
