-- Таблица для хранения одноразовых кодов привязки Telegram
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT code_length CHECK (char_length(code) = 6)
);

-- Индексы
CREATE INDEX idx_telegram_link_codes_user_id ON telegram_link_codes(user_id);
CREATE INDEX idx_telegram_link_codes_code ON telegram_link_codes(code) WHERE used_at IS NULL;
CREATE INDEX idx_telegram_link_codes_expires ON telegram_link_codes(expires_at) WHERE used_at IS NULL;

-- RLS политики
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own link codes"
  ON telegram_link_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own link codes"
  ON telegram_link_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Функция для очистки истекших кодов (можно вызывать через CRON)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE telegram_link_codes IS 'Одноразовые коды для привязки Telegram аккаунта';
COMMENT ON COLUMN telegram_link_codes.code IS '6-символьный уникальный код';
COMMENT ON COLUMN telegram_link_codes.expires_at IS 'Срок действия кода (обычно 10 минут)';
COMMENT ON COLUMN telegram_link_codes.used_at IS 'Когда код был использован';

-- Добавляем поле telegram_chat_id в notification_preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;

COMMENT ON COLUMN notification_preferences.telegram_chat_id IS 'Telegram Chat ID для отправки сообщений';
