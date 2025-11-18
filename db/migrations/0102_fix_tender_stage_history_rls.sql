-- ============================================================
-- Миграция: Исправление RLS для tender_stage_history
-- Дата: 2025-11-13
-- Описание: Добавление политики INSERT для автоматического логирования изменений этапов
-- ============================================================

-- Политика для INSERT в tender_stage_history
-- Разрешаем вставку записей истории для тендеров своей компании
CREATE POLICY "Members can insert tender history"
  ON tender_stage_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      JOIN company_members ON company_members.company_id = tenders.company_id
      WHERE tenders.id = tender_stage_history.tender_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Комментарий
COMMENT ON POLICY "Members can insert tender history" ON tender_stage_history IS 
  'Участники компании могут создавать записи истории для тендеров своей компании';
