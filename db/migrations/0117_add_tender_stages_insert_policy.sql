-- Добавление политики INSERT для tender_stages

-- Политика на создание: члены компании могут создавать этапы для своей компании
CREATE POLICY "Members can create tender stages for their company"
  ON tender_stages FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_stages.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политика на удаление: члены компании могут удалять этапы своей компании
CREATE POLICY "Members can delete tender stages of their company"
  ON tender_stages FOR DELETE
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_stages.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

COMMENT ON POLICY "Members can create tender stages for their company" ON tender_stages IS 
  'Члены компании могут создавать этапы тендеров для своей компании';
COMMENT ON POLICY "Members can delete tender stages of their company" ON tender_stages IS 
  'Члены компании могут удалять этапы тендеров своей компании';
