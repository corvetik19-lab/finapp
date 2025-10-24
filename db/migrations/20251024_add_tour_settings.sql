-- Migration: Add tour settings to user_preferences
-- Created: 2025-10-24
-- Description: Adds tour_enabled and tour_completed fields for tour management

-- Add tour_enabled field (boolean, default true)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS tour_enabled BOOLEAN DEFAULT true;

-- Add tour_completed field (jsonb, stores completed tour status for each section)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS tour_completed JSONB DEFAULT '{"dashboard": false, "transactions": false, "reports": false, "plans": false, "settings": false, "loans": false, "cards": false}'::jsonb;

-- Add comments
COMMENT ON COLUMN user_preferences.tour_enabled IS 'Включены ли туры по приложению (глобально)';
COMMENT ON COLUMN user_preferences.tour_completed IS 'Статус прохождения туров по разделам (JSON объект)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_tour_enabled ON user_preferences(tour_enabled);
