-- Добавление политики UPDATE для tender_stages
-- Без этой политики члены компании не могут обновлять этапы (включая order_index)

-- Политика на обновление: члены компании могут обновлять этапы своей компании
CREATE POLICY "Members can update tender stages of their company"
  ON tender_stages FOR UPDATE
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_stages.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_stages.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

COMMENT ON POLICY "Members can update tender stages of their company" ON tender_stages IS 
  'Члены компании могут обновлять этапы тендеров своей компании';
