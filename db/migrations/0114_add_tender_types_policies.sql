-- Добавление политик для создания, обновления и удаления типов тендеров

-- Политика на создание: члены компании могут создавать типы для своей компании
CREATE POLICY "Members can create tender types for their company"
  ON tender_types FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_types.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политика на обновление: члены компании могут обновлять типы своей компании
CREATE POLICY "Members can update tender types of their company"
  ON tender_types FOR UPDATE
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_types.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политика на удаление: члены компании могут удалять типы своей компании
CREATE POLICY "Members can delete tender types of their company"
  ON tender_types FOR DELETE
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_types.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

COMMENT ON POLICY "Members can create tender types for their company" ON tender_types IS 
  'Члены компании могут создавать типы тендеров для своей компании';
COMMENT ON POLICY "Members can update tender types of their company" ON tender_types IS 
  'Члены компании могут обновлять типы тендеров своей компании';
COMMENT ON POLICY "Members can delete tender types of their company" ON tender_types IS 
  'Члены компании могут удалять типы тендеров своей компании';
