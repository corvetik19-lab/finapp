# AI/RAG/KAG Архитектура для улучшенной CRM

## Концепция интеграции нейросетей

### 1. Архитектура AI-системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Тендеры  │  │  Задачи  │  │ Отчеты   │  │ Поиск    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────┼─────────────┼─────────────┼─────────────┼──────────┐
│       │      API Routes (Server Actions)        │          │
│  ┌────▼─────┐  ┌───▼──────┐  ┌──▼───────┐  ┌──▼───────┐  │
│  │Categorize│  │ Predict  │  │ Summarize│  │ Search   │  │
│  └────┬─────┘  └───┬──────┘  └──┬───────┘  └──┬───────┘  │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│              AI Service Layer (lib/ai/)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   OpenAI     │  │  Embeddings  │  │   Prompts    │     │
│  │   Client     │  │   Generator  │  │   Templates  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
└─────────┼──────────────────┼──────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼──────────────────────────────┐
│                 Supabase Database                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  tenders     │  │ ai_summaries │  │  embeddings  │    │
│  │  (pgvector)  │  │              │  │   (vector)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────────────────────────────────┘
```

### 2. RAG (Retrieval-Augmented Generation)

**Назначение:** Поиск релевантной информации из базы знаний для генерации ответов

**Компоненты:**

1. **Vector Store (pgvector в Supabase)**
   ```sql
   CREATE TABLE tender_embeddings (
     id UUID PRIMARY KEY,
     tender_id UUID REFERENCES tenders(id),
     content TEXT,
     embedding VECTOR(1536), -- OpenAI ada-002
     metadata JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX ON tender_embeddings 
   USING ivfflat (embedding vector_cosine_ops);
   ```

2. **Embedding Pipeline**
   ```typescript
   // lib/ai/embeddings.ts
   export async function generateEmbedding(text: string) {
     const response = await openai.embeddings.create({
       model: "text-embedding-ada-002",
       input: text
     });
     return response.data[0].embedding;
   }
   
   export async function indexTender(tender: Tender) {
     const content = `
       ${tender.title}
       ${tender.description}
       ${tender.customer}
       ${tender.category}
     `.trim();
     
     const embedding = await generateEmbedding(content);
     
     await supabase.from('tender_embeddings').insert({
       tender_id: tender.id,
       content,
       embedding,
       metadata: {
         nmck: tender.nmck,
         status: tender.status,
         created_at: tender.created_at
       }
     });
   }
   ```

3. **Semantic Search**
   ```typescript
   // lib/ai/search.ts
   export async function semanticSearch(query: string, limit = 10) {
     const queryEmbedding = await generateEmbedding(query);
     
     const { data } = await supabase.rpc('match_tenders', {
       query_embedding: queryEmbedding,
       match_threshold: 0.78,
       match_count: limit
     });
     
     return data;
   }
   ```

### 3. KAG (Knowledge-Augmented Generation)

**Назначение:** Использование структурированных знаний (графы, онтологии) для улучшения генерации

**Компоненты:**

1. **Knowledge Graph Schema**
   ```typescript
   interface TenderKnowledgeGraph {
     entities: {
       tender: TenderNode;
       customer: CustomerNode;
       category: CategoryNode;
       supplier: SupplierNode;
       employee: EmployeeNode;
     };
     relations: {
       tender_belongs_to_category: Relation[];
       tender_has_customer: Relation[];
       tender_assigned_to_employee: Relation[];
       similar_tenders: Relation[];
     };
   }
   ```

2. **Graph Construction**
   ```typescript
   // lib/ai/knowledge-graph.ts
   export async function buildTenderGraph(tenderId: string) {
     const tender = await getTender(tenderId);
     const similar = await findSimilarTenders(tender);
     const history = await getCustomerHistory(tender.customer_id);
     
     return {
       nodes: [
         { id: tender.id, type: 'tender', data: tender },
         ...similar.map(t => ({ id: t.id, type: 'tender', data: t })),
         { id: tender.customer_id, type: 'customer', data: history }
       ],
       edges: [
         { from: tender.id, to: tender.customer_id, type: 'has_customer' },
         ...similar.map(t => ({ 
           from: tender.id, 
           to: t.id, 
           type: 'similar_to',
           weight: t.similarity_score 
         }))
       ]
     };
   }
   ```

3. **Context Enrichment**
   ```typescript
   // lib/ai/context.ts
   export async function enrichContext(tenderId: string) {
     const graph = await buildTenderGraph(tenderId);
     const embeddings = await semanticSearch(graph.nodes[0].data.title);
     
     return {
       current_tender: graph.nodes[0].data,
       similar_tenders: embeddings.slice(0, 5),
       customer_history: graph.nodes.find(n => n.type === 'customer'),
       success_patterns: await analyzeSuccessPatterns(graph)
     };
   }
   ```

### 4. AI-функции для CRM

#### 4.1. Автокатегоризация тендеров

```typescript
// app/api/ai/categorize/route.ts
export async function POST(req: Request) {
  const { title, description } = await req.json();
  
  const context = await getCategorizationContext();
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Ты эксперт по категоризации тендеров.
        Доступные категории: ${context.categories.join(', ')}.
        Анализируй название и описание, выбери наиболее подходящую категорию.`
      },
      {
        role: "user",
        content: `Название: ${title}\nОписание: ${description}`
      }
    ],
    response_format: { type: "json_object" }
  });
  
  return Response.json(JSON.parse(completion.choices[0].message.content));
}
```

#### 4.2. Прогноз вероятности победы

```typescript
// lib/ai/predict-win.ts
export async function predictWinProbability(tender: Tender) {
  const historicalData = await getHistoricalWins({
    category: tender.category,
    customer: tender.customer_id,
    nmck_range: [tender.nmck * 0.8, tender.nmck * 1.2]
  });
  
  const features = {
    nmck: tender.nmck,
    competition_level: await getCompetitionLevel(tender),
    our_experience: historicalData.total_wins,
    customer_loyalty: historicalData.customer_win_rate,
    price_competitiveness: tender.our_price / tender.nmck
  };
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Ты аналитик тендеров. Оцени вероятность победы от 0 до 100%.
        Учитывай исторические данные, конкуренцию, опыт с заказчиком.`
      },
      {
        role: "user",
        content: JSON.stringify(features)
      }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

#### 4.3. Генерация саммари

```typescript
// lib/ai/summary.ts
export async function generateTenderSummary(tenderId: string) {
  const context = await enrichContext(tenderId);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Создай краткое резюме тендера (3-5 предложений).
        Включи: ключевые параметры, риски, рекомендации.`
      },
      {
        role: "user",
        content: JSON.stringify(context)
      }
    ]
  });
  
  await supabase.from('ai_summaries').insert({
    tender_id: tenderId,
    summary: completion.choices[0].message.content,
    model: "gpt-4-turbo-preview",
    created_at: new Date()
  });
  
  return completion.choices[0].message.content;
}
```

#### 4.4. Интеллектуальный поиск

```typescript
// app/api/ai/search/route.ts
export async function POST(req: Request) {
  const { query } = await req.json();
  
  // Hybrid search: semantic + keyword
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(query, 20),
    keywordSearch(query, 20)
  ]);
  
  // Re-rank with AI
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Отранжируй результаты по релевантности запросу.
        Верни массив ID в порядке убывания релевантности.`
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          results: [...semanticResults, ...keywordResults]
        })
      }
    ],
    response_format: { type: "json_object" }
  });
  
  const ranked = JSON.parse(completion.choices[0].message.content);
  return Response.json(ranked);
}
```

### 5. Интерактивный AI-ассистент

```typescript
// components/ai-assistant.tsx
'use client';

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...messages, userMessage],
        context: {
          current_page: window.location.pathname,
          user_role: session.user.role
        }
      })
    });
    
    const { message } = await response.json();
    setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    setInput('');
  };
  
  return (
    <div className="ai-assistant">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Спросите AI-ассистента..."
        />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}
```

### 6. Оптимизация и кэширование

```typescript
// lib/ai/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function cachedCompletion(
  key: string,
  fn: () => Promise<string>,
  ttl = 3600
) {
  const cached = await redis.get(key);
  if (cached) return cached as string;
  
  const result = await fn();
  await redis.setex(key, ttl, result);
  
  return result;
}

// Использование
const summary = await cachedCompletion(
  `summary:${tenderId}`,
  () => generateTenderSummary(tenderId),
  86400 // 24 часа
);
```

### 7. Мониторинг AI-запросов

```typescript
// lib/ai/monitoring.ts
export async function trackAIUsage(
  operation: string,
  model: string,
  tokens: number,
  latency: number
) {
  await supabase.from('ai_usage_logs').insert({
    operation,
    model,
    tokens_used: tokens,
    latency_ms: latency,
    user_id: session.user.id,
    created_at: new Date()
  });
}
```

## Следующий документ

**PART 3**: Техническая спецификация и схема БД
