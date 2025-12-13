-- =====================================================
-- МИГРАЦИЯ: Блок "Командная работа"
-- Дата: 12.12.2024
-- Описание: Создание таблиц для командной работы
-- =====================================================

-- =====================================================
-- 1. ЧАТ И КОММУНИКАЦИИ
-- =====================================================

-- Комнаты чатов
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('tender', 'team', 'private', 'general')),
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сообщения чата
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники чата
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Индексы для чата
CREATE INDEX IF NOT EXISTS idx_chat_rooms_company ON chat_rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_tender ON chat_rooms(tender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);

-- =====================================================
-- 2. ВИДЕОКОНФЕРЕНЦИИ (Jitsi)
-- =====================================================

-- Конференции
CREATE TABLE IF NOT EXISTS conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  jitsi_room_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  recording_url TEXT,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники конференций
CREATE TABLE IF NOT EXISTS conference_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'joined', 'left')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(conference_id, user_id)
);

-- Индексы для конференций
CREATE INDEX IF NOT EXISTS idx_conferences_company ON conferences(company_id);
CREATE INDEX IF NOT EXISTS idx_conferences_host ON conferences(host_id);
CREATE INDEX IF NOT EXISTS idx_conferences_scheduled ON conferences(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_conferences_status ON conferences(status);
CREATE INDEX IF NOT EXISTS idx_conference_participants_conference ON conference_participants(conference_id);
CREATE INDEX IF NOT EXISTS idx_conference_participants_user ON conference_participants(user_id);

-- =====================================================
-- 3. КАНБАН-ДОСКИ
-- =====================================================

-- Доски
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  background_color TEXT DEFAULT '#f8fafc',
  is_template BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Колонки досок
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6366f1',
  wip_limit INTEGER,
  is_done_column BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Карточки
CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assignee_ids UUID[] DEFAULT '{}',
  due_date DATE,
  due_time TIME,
  labels TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  checklist JSONB DEFAULT '[]',
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  estimated_hours NUMERIC(5,2),
  spent_hours NUMERIC(5,2) DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники досок
CREATE TABLE IF NOT EXISTS kanban_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Комментарии к карточкам
CREATE TABLE IF NOT EXISTS kanban_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- История карточек
CREATE TABLE IF NOT EXISTS kanban_card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для канбана
CREATE INDEX IF NOT EXISTS idx_kanban_boards_company ON kanban_boards(company_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON kanban_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON kanban_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assignees ON kanban_cards USING GIN(assignee_ids);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_tender ON kanban_cards(tender_id);
CREATE INDEX IF NOT EXISTS idx_kanban_board_members_board ON kanban_board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_board_members_user ON kanban_board_members(user_id);

-- =====================================================
-- 4. СПРИНТЫ И ПЛАНИРОВАНИЕ
-- =====================================================

-- Спринты
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'review', 'completed', 'cancelled')),
  velocity INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Элементы спринта
CREATE TABLE IF NOT EXISTS sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('task', 'tender', 'card')),
  item_id UUID NOT NULL,
  story_points INTEGER,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sprint_id, item_type, item_id)
);

-- Ретроспективы
CREATE TABLE IF NOT EXISTS sprint_retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  what_went_well TEXT[] DEFAULT '{}',
  what_to_improve TEXT[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sprint_id)
);

-- Индексы для спринтов
CREATE INDEX IF NOT EXISTS idx_sprints_company ON sprints(company_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_assigned ON sprint_items(assigned_to);

-- =====================================================
-- 5. ЗАГРУЗКА СОТРУДНИКОВ
-- =====================================================

-- Распределение загрузки
CREATE TABLE IF NOT EXISTS workload_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  allocated_hours INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  notes TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настройки мощности сотрудников
CREATE TABLE IF NOT EXISTS capacity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  weekly_hours INTEGER DEFAULT 40,
  daily_hours INTEGER DEFAULT 8,
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  vacation_days JSONB DEFAULT '[]',
  sick_days JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Индексы для загрузки
CREATE INDEX IF NOT EXISTS idx_workload_company ON workload_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_workload_user ON workload_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_workload_dates ON workload_allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_workload_status ON workload_allocations(status);
CREATE INDEX IF NOT EXISTS idx_workload_tender ON workload_allocations(tender_id);
CREATE INDEX IF NOT EXISTS idx_capacity_company_user ON capacity_settings(company_id, user_id);

-- =====================================================
-- 6. РЕЙТИНГ И АНАЛИТИКА
-- =====================================================

-- Метрики производительности
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  tenders_won INTEGER DEFAULT 0,
  tenders_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  avg_completion_days NUMERIC(5,2),
  quality_score NUMERIC(3,2),
  on_time_percentage NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id, period_type, period_start)
);

-- Peer-review оценки
CREATE TABLE IF NOT EXISTS peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id UUID NOT NULL REFERENCES auth.users(id),
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  skills JSONB DEFAULT '[]',
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reviewer_id != reviewee_id)
);

-- Индексы для рейтинга
CREATE INDEX IF NOT EXISTS idx_performance_company ON performance_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_user ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_period ON performance_metrics(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee ON peer_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_sprint ON peer_reviews(sprint_id);

-- =====================================================
-- 7. КАЛЕНДАРЬ ЗАНЯТОСТИ
-- =====================================================

-- События календаря
CREATE TABLE IF NOT EXISTS team_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'deadline', 'vacation', 'sick', 'conference', 'task', 'other')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  conference_id UUID REFERENCES conferences(id) ON DELETE SET NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  recurrence_rule TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники событий
CREATE TABLE IF NOT EXISTS team_calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES team_calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  is_required BOOLEAN DEFAULT TRUE,
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Индексы для календаря
CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON team_calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON team_calendar_events(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON team_calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event ON team_calendar_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_user ON team_calendar_attendees(user_id);

-- =====================================================
-- 8. RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_retrospectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_calendar_attendees ENABLE ROW LEVEL SECURITY;

-- RLS для chat_rooms
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "chat_rooms_update" ON chat_rooms FOR UPDATE USING (
  created_by = auth.uid() OR 
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "chat_rooms_delete" ON chat_rooms FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для chat_messages
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (
  room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())
);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())
  AND user_id = auth.uid()
);
CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE USING (user_id = auth.uid());

-- RLS для chat_participants
CREATE POLICY "chat_participants_select" ON chat_participants FOR SELECT USING (
  room_id IN (SELECT id FROM chat_rooms WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "chat_participants_insert" ON chat_participants FOR INSERT WITH CHECK (
  room_id IN (SELECT id FROM chat_rooms WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "chat_participants_update" ON chat_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "chat_participants_delete" ON chat_participants FOR DELETE USING (
  room_id IN (SELECT id FROM chat_rooms WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для conferences
CREATE POLICY "conferences_select" ON conferences FOR SELECT USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "conferences_insert" ON conferences FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "conferences_update" ON conferences FOR UPDATE USING (
  host_id = auth.uid() OR 
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "conferences_delete" ON conferences FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для conference_participants
CREATE POLICY "conference_participants_select" ON conference_participants FOR SELECT USING (
  conference_id IN (SELECT id FROM conferences WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "conference_participants_insert" ON conference_participants FOR INSERT WITH CHECK (
  conference_id IN (SELECT id FROM conferences WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "conference_participants_update" ON conference_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conference_participants_delete" ON conference_participants FOR DELETE USING (
  conference_id IN (SELECT id FROM conferences WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для kanban_boards
CREATE POLICY "kanban_boards_select" ON kanban_boards FOR SELECT USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "kanban_boards_insert" ON kanban_boards FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "kanban_boards_update" ON kanban_boards FOR UPDATE USING (
  created_by = auth.uid() OR 
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "kanban_boards_delete" ON kanban_boards FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для kanban_columns
CREATE POLICY "kanban_columns_select" ON kanban_columns FOR SELECT USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "kanban_columns_insert" ON kanban_columns FOR INSERT WITH CHECK (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "kanban_columns_update" ON kanban_columns FOR UPDATE USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "kanban_columns_delete" ON kanban_columns FOR DELETE USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для kanban_cards
CREATE POLICY "kanban_cards_select" ON kanban_cards FOR SELECT USING (
  column_id IN (SELECT id FROM kanban_columns WHERE board_id IN (
    SELECT board_id FROM kanban_board_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM kanban_boards WHERE company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  ))
);
CREATE POLICY "kanban_cards_insert" ON kanban_cards FOR INSERT WITH CHECK (
  column_id IN (SELECT id FROM kanban_columns WHERE board_id IN (
    SELECT board_id FROM kanban_board_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    UNION
    SELECT id FROM kanban_boards WHERE company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  ))
);
CREATE POLICY "kanban_cards_update" ON kanban_cards FOR UPDATE USING (
  column_id IN (SELECT id FROM kanban_columns WHERE board_id IN (
    SELECT board_id FROM kanban_board_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    UNION
    SELECT id FROM kanban_boards WHERE company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  ))
);
CREATE POLICY "kanban_cards_delete" ON kanban_cards FOR DELETE USING (
  created_by = auth.uid() OR
  column_id IN (SELECT id FROM kanban_columns WHERE board_id IN (
    SELECT id FROM kanban_boards WHERE company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  ))
);

-- RLS для kanban_board_members
CREATE POLICY "kanban_board_members_select" ON kanban_board_members FOR SELECT USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "kanban_board_members_insert" ON kanban_board_members FOR INSERT WITH CHECK (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "kanban_board_members_update" ON kanban_board_members FOR UPDATE USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "kanban_board_members_delete" ON kanban_board_members FOR DELETE USING (
  board_id IN (SELECT id FROM kanban_boards WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для kanban_card_comments
CREATE POLICY "kanban_card_comments_select" ON kanban_card_comments FOR SELECT USING (
  card_id IN (SELECT id FROM kanban_cards WHERE column_id IN (
    SELECT id FROM kanban_columns WHERE board_id IN (
      SELECT board_id FROM kanban_board_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kanban_boards WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
      )
    )
  ))
);
CREATE POLICY "kanban_card_comments_insert" ON kanban_card_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kanban_card_comments_update" ON kanban_card_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "kanban_card_comments_delete" ON kanban_card_comments FOR DELETE USING (user_id = auth.uid());

-- RLS для kanban_card_history
CREATE POLICY "kanban_card_history_select" ON kanban_card_history FOR SELECT USING (
  card_id IN (SELECT id FROM kanban_cards WHERE column_id IN (
    SELECT id FROM kanban_columns WHERE board_id IN (
      SELECT board_id FROM kanban_board_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kanban_boards WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
      )
    )
  ))
);
CREATE POLICY "kanban_card_history_insert" ON kanban_card_history FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS для sprints
CREATE POLICY "sprints_select" ON sprints FOR SELECT USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "sprints_insert" ON sprints FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "sprints_update" ON sprints FOR UPDATE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "sprints_delete" ON sprints FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для sprint_items
CREATE POLICY "sprint_items_select" ON sprint_items FOR SELECT USING (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "sprint_items_insert" ON sprint_items FOR INSERT WITH CHECK (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "sprint_items_update" ON sprint_items FOR UPDATE USING (
  assigned_to = auth.uid() OR
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "sprint_items_delete" ON sprint_items FOR DELETE USING (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для sprint_retrospectives
CREATE POLICY "sprint_retrospectives_select" ON sprint_retrospectives FOR SELECT USING (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "sprint_retrospectives_insert" ON sprint_retrospectives FOR INSERT WITH CHECK (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "sprint_retrospectives_update" ON sprint_retrospectives FOR UPDATE USING (
  sprint_id IN (SELECT id FROM sprints WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- RLS для workload_allocations
CREATE POLICY "workload_allocations_select" ON workload_allocations FOR SELECT USING (
  user_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "workload_allocations_insert" ON workload_allocations FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "workload_allocations_update" ON workload_allocations FOR UPDATE USING (
  user_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "workload_allocations_delete" ON workload_allocations FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для capacity_settings
CREATE POLICY "capacity_settings_select" ON capacity_settings FOR SELECT USING (
  user_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "capacity_settings_insert" ON capacity_settings FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "capacity_settings_update" ON capacity_settings FOR UPDATE USING (
  user_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для performance_metrics
CREATE POLICY "performance_metrics_select" ON performance_metrics FOR SELECT USING (
  user_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "performance_metrics_insert" ON performance_metrics FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "performance_metrics_update" ON performance_metrics FOR UPDATE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для peer_reviews
CREATE POLICY "peer_reviews_select" ON peer_reviews FOR SELECT USING (
  reviewer_id = auth.uid() OR
  reviewee_id = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "peer_reviews_insert" ON peer_reviews FOR INSERT WITH CHECK (
  reviewer_id = auth.uid() AND
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);

-- RLS для team_calendar_events
CREATE POLICY "team_calendar_events_select" ON team_calendar_events FOR SELECT USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "team_calendar_events_insert" ON team_calendar_events FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "team_calendar_events_update" ON team_calendar_events FOR UPDATE USING (
  created_by = auth.uid() OR
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);
CREATE POLICY "team_calendar_events_delete" ON team_calendar_events FOR DELETE USING (
  company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
);

-- RLS для team_calendar_attendees
CREATE POLICY "team_calendar_attendees_select" ON team_calendar_attendees FOR SELECT USING (
  event_id IN (SELECT id FROM team_calendar_events WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active'
  ))
);
CREATE POLICY "team_calendar_attendees_insert" ON team_calendar_attendees FOR INSERT WITH CHECK (
  event_id IN (SELECT id FROM team_calendar_events WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);
CREATE POLICY "team_calendar_attendees_update" ON team_calendar_attendees FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "team_calendar_attendees_delete" ON team_calendar_attendees FOR DELETE USING (
  event_id IN (SELECT id FROM team_calendar_events WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  ))
);

-- =====================================================
-- 9. ВКЛЮЧЕНИЕ REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE conference_participants;

-- =====================================================
-- КОНЕЦ МИГРАЦИИ
-- =====================================================
