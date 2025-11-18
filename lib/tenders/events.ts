/**
 * События для синхронизации изменений этапов между страницами
 */

export const STAGES_UPDATED_EVENT = 'tenders:stages:updated';

/**
 * Отправить событие об обновлении этапов
 */
export function notifyStagesUpdated() {
  // Используем localStorage для кросс-табовой синхронизации
  localStorage.setItem('tenders_stages_updated', Date.now().toString());
  
  // Также отправляем событие в текущей вкладке
  window.dispatchEvent(new CustomEvent(STAGES_UPDATED_EVENT));
}

/**
 * Подписаться на обновления этапов
 */
export function subscribeToStagesUpdates(callback: () => void) {
  // Обработчик для текущей вкладки
  const handleEvent = () => callback();
  window.addEventListener(STAGES_UPDATED_EVENT, handleEvent);

  // Обработчик для других вкладок (через localStorage)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'tenders_stages_updated') {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);

  // Функция отписки
  return () => {
    window.removeEventListener(STAGES_UPDATED_EVENT, handleEvent);
    window.removeEventListener('storage', handleStorage);
  };
}
