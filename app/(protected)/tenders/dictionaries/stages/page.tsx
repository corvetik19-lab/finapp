'use client';

import { useState, useEffect } from 'react';
import type { TenderStage } from '@/lib/tenders/types';

export default function TenderStagesPage() {
  const [stages, setStages] = useState<TenderStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'tender_dept' | 'realization'>('tender_dept');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<TenderStage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'tender_dept' as 'tender_dept' | 'realization',
    color: '#3b82f6',
    is_final: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tenders/stages');
      if (!response.ok) {
        throw new Error('Ошибка загрузки этапов');
      }

      const data = await response.json();
      setStages(data.data || []);
    } catch (err) {
      console.error('Error loading stages:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const filteredStages = stages.filter((s) => s.category === selectedCategory);

  const handleOpenModal = (stage?: TenderStage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        name: stage.name,
        category: (stage.category === 'archive' ? 'tender_dept' : stage.category) as 'tender_dept' | 'realization',
        color: stage.color || '#3b82f6',
        is_final: stage.is_final || false,
      });
    } else {
      setEditingStage(null);
      setFormData({
        name: '',
        category: selectedCategory,
        color: '#3b82f6',
        is_final: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStage(null);
    setFormData({
      name: '',
      category: 'tender_dept',
      color: '#3b82f6',
      is_final: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Введите название этапа');
      return;
    }

    try {
      setSubmitting(true);

      const url = editingStage
        ? `/api/tenders/stages/${editingStage.id}`
        : '/api/tenders/stages';

      const method = editingStage ? 'PATCH' : 'POST';

      // Определяем order_index для нового этапа
      const maxOrder = filteredStages.reduce(
        (max, s) => Math.max(max, s.order_index),
        0
      );

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          order_index: editingStage ? editingStage.order_index : maxOrder + 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения этапа');
      }

      await loadStages();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving stage:', err);
      alert('Ошибка при сохранении этапа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stageId: string, stageName: string) => {
    if (!confirm(`Удалить этап "${stageName}"?`)) return;

    try {
      const response = await fetch(`/api/tenders/stages/${stageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления этапа');
      }

      await loadStages();
    } catch (err) {
      console.error('Error deleting stage:', err);
      alert('Ошибка при удалении этапа');
    }
  };

  const categoryLabels = {
    tender_dept: 'Тендерный отдел',
    realization: 'Реализация',
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-2">⚠️ Ошибка</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadStages}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Этапы тендеров</h1>
            <p className="text-gray-600 mt-1">
              Управление этапами процесса работы с тендерами
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ➕ Добавить этап
          </button>
        </div>

        {/* Категории */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('tender_dept')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'tender_dept'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎯 Тендерный отдел
          </button>
          <button
            onClick={() => setSelectedCategory('realization')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'realization'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📦 Реализация
          </button>
        </div>
      </div>

      {/* Список этапов */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Порядок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цвет
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Финальный
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>Этапов для категории &ldquo;{categoryLabels[selectedCategory]}&rdquo; пока нет</p>
                  </td>
                </tr>
              ) : (
                filteredStages.map((stage) => (
                  <tr key={stage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {stage.order_index}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{stage.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: stage.color || '#3b82f6' }}
                        />
                        <span className="text-sm text-gray-600">
                          {stage.color || '#3b82f6'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {stage.is_final ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Да
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          Нет
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {stage.company_id ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Пользовательский
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          Системный
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {stage.company_id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(stage)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <span className="material-icons text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(stage.id, stage.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <span className="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingStage ? 'Редактировать этап' : 'Добавить этап'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: Анализ и просчёт"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as 'tender_dept' | 'realization',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!editingStage}
                  >
                    <option value="tender_dept">Тендерный отдел</option>
                    <option value="realization">Реализация</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цвет
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_final"
                    checked={formData.is_final}
                    onChange={(e) =>
                      setFormData({ ...formData, is_final: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_final"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Финальный этап (завершающий)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={submitting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
