-- Миграция: Исправление RLS политик для tender_tasks
-- Дата: 2025-11-15
-- Описание: Обновление политик для корректной работы с задачами тендеров

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view tasks in their company" ON tender_tasks;
DROP POLICY IF EXISTS "Users can create tasks in their company" ON tender_tasks;
DROP POLICY IF EXISTS "Users can update tasks in their company" ON tender_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks or if admin" ON tender_tasks;

-- Создаём новые политики с правильной логикой

-- SELECT: Пользователи могут видеть задачи своей компании
CREATE POLICY "Users can view tasks in their company"
  ON tender_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members 
      WHERE company_members.company_id = tender_tasks.company_id 
      AND company_members.user_id = auth.uid()
    )
  );

-- INSERT: Пользователи могут создавать задачи в своей компании
CREATE POLICY "Users can create tasks in their company"
  ON tender_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members 
      WHERE company_members.company_id = tender_tasks.company_id 
      AND company_members.user_id = auth.uid()
    )
  );

-- UPDATE: Пользователи могут обновлять задачи своей компании
CREATE POLICY "Users can update tasks in their company"
  ON tender_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_members 
      WHERE company_members.company_id = tender_tasks.company_id 
      AND company_members.user_id = auth.uid()
    )
  );

-- DELETE: Пользователи могут удалять свои задачи или если они админы компании
CREATE POLICY "Users can delete tasks in their company"
  ON tender_tasks FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM company_members 
      WHERE company_members.company_id = tender_tasks.company_id 
      AND company_members.user_id = auth.uid()
      AND company_members.role IN ('owner', 'admin')
    )
  );
