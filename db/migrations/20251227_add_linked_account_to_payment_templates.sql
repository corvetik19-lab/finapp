-- Добавляем поля для связи с кредитной картой и кредитом в шаблоны платежей
ALTER TABLE payment_templates
ADD COLUMN IF NOT EXISTS linked_credit_card_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_loan_id uuid REFERENCES loans(id) ON DELETE SET NULL;

-- Комментарии
COMMENT ON COLUMN payment_templates.linked_credit_card_id IS 'Связанная кредитная карта (опционально)';
COMMENT ON COLUMN payment_templates.linked_loan_id IS 'Связанный кредит (опционально)';
