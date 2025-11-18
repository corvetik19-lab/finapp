# Техническая спецификация улучшенной CRM

## Стек технологий

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: TailwindCSS 3+
- **Charts**: Chart.js + react-chartjs-2
- **Forms**: React Hook Form + Zod
- **State**: Zustand (для глобального состояния)
- **Drag & Drop**: @dnd-kit/core
- **Tables**: TanStack Table v8
- **Calendar**: FullCalendar или react-big-calendar

### Backend
- **Database**: Supabase (PostgreSQL 15+)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Vector DB**: pgvector extension
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Functions (Deno)

### AI/ML
- **LLM**: OpenAI GPT-4 Turbo
- **Embeddings**: text-embedding-ada-002
- **Vector Search**: pgvector + HNSW index
- **Cache**: Upstash Redis

### DevOps
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Analytics**: Vercel Analytics

## Схема базы данных

### Основные таблицы

```sql
-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Пользователи (расширение Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT[],
  telegram TEXT,
  birth_date DATE,
  roles TEXT[] NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тендеры
CREATE TABLE tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Основная информация
  purchase_number TEXT NOT NULL UNIQUE,
  project_name TEXT,
  subject TEXT NOT NULL,
  method TEXT,
  type_id UUID REFERENCES tender_types(id),
  customer TEXT NOT NULL,
  city TEXT,
  platform TEXT,
  
  -- Финансы
  nmck BIGINT NOT NULL, -- в копейках
  our_price BIGINT,
  contract_price BIGINT,
  application_security BIGINT,
  contract_security BIGINT,
  
  -- Даты
  submission_deadline TIMESTAMPTZ NOT NULL,
  auction_date TIMESTAMPTZ,
  results_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  
  -- Ответственные
  manager_id UUID REFERENCES profiles(id),
  specialist_id UUID REFERENCES profiles(id),
  investor_id UUID REFERENCES profiles(id),
  executor_id UUID REFERENCES profiles(id),
  
  -- Статус и этап
  stage_id UUID NOT NULL REFERENCES tender_stages(id),
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Метаданные
  comment TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Полнотекстовый поиск
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('russian', 
      coalesce(purchase_number, '') || ' ' ||
      coalesce(project_name, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(customer, '')
    )
  ) STORED
);

-- Индексы для тендеров
CREATE INDEX idx_tenders_user_id ON tenders(user_id);
CREATE INDEX idx_tenders_stage_id ON tenders(stage_id);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_manager_id ON tenders(manager_id);
CREATE INDEX idx_tenders_submission_deadline ON tenders(submission_deadline);
CREATE INDEX idx_tenders_search_vector ON tenders USING GIN(search_vector);

-- Этапы тендеров
CREATE TABLE tender_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'tender_dept', 'realization', 'archive'
  order_index INTEGER NOT NULL,
  color TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Типы тендеров
CREATE TABLE tender_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- История переходов тендера
CREATE TABLE tender_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES tender_stages(id),
  to_stage_id UUID NOT NULL REFERENCES tender_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вложения
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL, -- 'tender', 'application', 'task', 'claim'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- Заявки (реализация)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tender_id UUID NOT NULL REFERENCES tenders(id),
  
  number INTEGER NOT NULL,
  stage_id UUID NOT NULL REFERENCES application_stages(id),
  
  -- Финансы
  sale_price BIGINT,
  expenses BIGINT DEFAULT 0,
  profit BIGINT,
  
  -- Логистика
  delivery_date DATE,
  delivery_address TEXT,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tender_id, number)
);

-- Этапы заявок
CREATE TABLE application_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Задачи
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Связь с сущностями
  tender_id UUID REFERENCES tenders(id),
  application_id UUID REFERENCES applications(id),
  
  -- Основная информация
  title TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'call', 'document', 'payment', 'meeting', 'check'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Ответственные
  created_by UUID NOT NULL REFERENCES profiles(id),
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  
  -- Статус и время
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Комментарии
  comment TEXT,
  executor_comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Логистика
CREATE TABLE logistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  application_id UUID NOT NULL REFERENCES applications(id),
  
  -- Маршрут
  loading_address TEXT NOT NULL,
  loading_contact TEXT,
  loading_phone TEXT,
  unloading_address TEXT NOT NULL,
  unloading_contact TEXT,
  unloading_phone TEXT,
  
  -- Груз
  cargo_weight TEXT,
  cargo_volume TEXT,
  cargo_description TEXT,
  
  -- Исполнение
  delivery_date DATE NOT NULL,
  driver_name TEXT,
  vehicle_number TEXT,
  cost BIGINT,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'in_transit', 'delivered', 'delayed'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Взыскание долгов
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tender_id UUID NOT NULL REFERENCES tenders(id),
  application_id UUID NOT NULL REFERENCES applications(id),
  
  -- Стороны
  plaintiff_id UUID REFERENCES legal_entities(id),
  defendant TEXT NOT NULL,
  lawyer_id UUID REFERENCES profiles(id),
  
  -- Финансы
  principal_debt BIGINT NOT NULL,
  penalty BIGINT DEFAULT 0,
  court_costs BIGINT DEFAULT 0,
  
  -- Этап
  stage_id UUID NOT NULL REFERENCES claim_stages(id),
  
  -- Даты
  claim_date DATE,
  court_date DATE,
  resolution_date DATE,
  
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Этапы взыскания
CREATE TABLE claim_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Юридические лица
CREATE TABLE legal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  inn TEXT,
  kpp TEXT,
  ogrn TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Поставщики
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  full_name TEXT,
  position TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  company TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI: Embeddings для семантического поиска
CREATE TABLE tender_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tender_embeddings_vector 
ON tender_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- AI: Саммари
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI: Прогнозы
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'win_probability', 'optimal_price'
  result JSONB NOT NULL,
  confidence DECIMAL(5,2),
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI: Логи использования
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  latency_ms INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
```

## RLS (Row Level Security) политики

```sql
-- Включаем RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Политики для tenders
CREATE POLICY "Users can view own tenders"
  ON tenders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tenders"
  ON tenders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tenders"
  ON tenders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tenders"
  ON tenders FOR DELETE
  USING (user_id = auth.uid());

-- Аналогично для остальных таблиц...
```

## API Routes структура

```
app/api/
├── tenders/
│   ├── route.ts              # GET, POST
│   ├── [id]/
│   │   ├── route.ts          # GET, PATCH, DELETE
│   │   ├── stage/route.ts    # PATCH (смена этапа)
│   │   └── attachments/route.ts
│   └── import/route.ts       # POST (импорт из ЕИС)
├── applications/
│   ├── route.ts
│   └── [id]/route.ts
├── tasks/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── complete/route.ts # POST
├── ai/
│   ├── categorize/route.ts   # POST
│   ├── predict/route.ts      # POST
│   ├── summarize/route.ts    # POST
│   ├── search/route.ts       # POST
│   └── chat/route.ts         # POST (AI-ассистент)
└── reports/
    ├── tender-dept/route.ts
    ├── realization/route.ts
    └── payments/route.ts
```

## Следующий документ

**PART 4**: UI/UX концепция и компонентная архитектура
