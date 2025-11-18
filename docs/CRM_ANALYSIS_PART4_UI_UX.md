# UI/UX Концепция улучшенной CRM

## Дизайн-система

### Цветовая палитра

```typescript
// lib/design-tokens.ts
export const colors = {
  // Статусы
  status: {
    success: '#10b981',    // зеленый
    warning: '#f59e0b',    // желтый
    error: '#ef4444',      // красный
    info: '#3b82f6',       // синий
    neutral: '#6b7280',    // серый
  },
  
  // Приоритеты
  priority: {
    urgent: '#dc2626',     // темно-красный
    high: '#f97316',       // оранжевый
    medium: '#eab308',     // желтый
    low: '#22c55e',        // зеленый
  },
  
  // Этапы тендеров
  stages: {
    analysis: '#8b5cf6',   // фиолетовый
    checking: '#ec4899',   // розовый
    submission: '#3b82f6', // синий
    auction: '#f59e0b',    // желтый
    won: '#10b981',        // зеленый
    lost: '#6b7280',       // серый
  }
};
```

### Типографика

```typescript
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
  }
};
```

## Компонентная архитектура

### Структура компонентов

```
components/
├── ui/                    # Базовые UI-компоненты (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
├── layout/                # Компоненты макета
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── breadcrumbs.tsx
│   └── page-container.tsx
├── tenders/               # Компоненты тендеров
│   ├── tender-card.tsx
│   ├── tender-table.tsx
│   ├── tender-kanban.tsx
│   ├── tender-form.tsx
│   ├── tender-filters.tsx
│   └── tender-import-modal.tsx
├── tasks/                 # Компоненты задач
│   ├── task-list.tsx
│   ├── task-card.tsx
│   ├── task-form.tsx
│   └── task-calendar.tsx
├── charts/                # Графики и визуализация
│   ├── line-chart.tsx
│   ├── bar-chart.tsx
│   ├── pie-chart.tsx
│   ├── funnel-chart.tsx
│   └── dashboard-widget.tsx
├── ai/                    # AI-компоненты
│   ├── ai-assistant.tsx
│   ├── ai-suggestions.tsx
│   ├── ai-categorization.tsx
│   └── ai-prediction-badge.tsx
└── shared/                # Общие компоненты
    ├── data-table.tsx
    ├── search-bar.tsx
    ├── filter-panel.tsx
    ├── status-badge.tsx
    ├── priority-badge.tsx
    ├── user-avatar.tsx
    └── file-upload.tsx
```

## Ключевые UI-паттерны

### 1. Умная таблица с настройками

```typescript
// components/shared/data-table.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  defaultVisibleColumns?: string[];
  enableColumnResize?: boolean;
  enableRowSelection?: boolean;
  enableExport?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  defaultVisibleColumns,
  enableColumnResize = true,
  enableRowSelection = false,
  enableExport = true,
}: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = useState({});
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  
  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      sorting,
      columnFilters,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar onSearch={handleSearch} />
        <div className="flex gap-2">
          <ColumnVisibilityDropdown table={table} />
          {enableExport && <ExportButton data={data} />}
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {/* Сортировка, фильтры, resize */}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {/* Строки таблицы */}
          </TableBody>
        </Table>
      </div>
      
      <Pagination table={table} />
    </div>
  );
}
```

### 2. Kanban с drag-and-drop

```typescript
// components/tenders/tender-kanban.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';

export function TenderKanban() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const tenderId = active.id as string;
    const newStageId = over.id as string;
    
    // Оптимистичное обновление UI
    setTenders(prev => 
      prev.map(t => 
        t.id === tenderId 
          ? { ...t, stage_id: newStageId }
          : t
      )
    );
    
    // Обновление на сервере
    await updateTenderStage(tenderId, newStageId);
    
    setActiveId(null);
  };
  
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            tenders={tenders.filter(t => t.stage_id === stage.id)}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeId && (
          <TenderCard tender={tenders.find(t => t.id === activeId)!} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

### 3. Дашборд с виджетами

```typescript
// app/(protected)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI-карточки */}
      <KPICard
        title="Активных тендеров"
        value={42}
        change={+12}
        icon={<FileText />}
      />
      <KPICard
        title="Выиграно в месяц"
        value={8}
        change={+3}
        icon={<Trophy />}
      />
      <KPICard
        title="Конверсия"
        value="24%"
        change={+5}
        icon={<TrendingUp />}
      />
      <KPICard
        title="Прибыль"
        value="₽2.4M"
        change={+18}
        icon={<DollarSign />}
      />
      
      {/* Графики */}
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Воронка конверсии</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>
      </div>
      
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Тренд побед</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={trendData} />
          </CardContent>
        </Card>
      </div>
      
      {/* Недавние тендеры */}
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Недавние тендеры</CardTitle>
          </CardHeader>
          <CardContent>
            <TenderList tenders={recentTenders} compact />
          </CardContent>
        </Card>
      </div>
      
      {/* Задачи на сегодня */}
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Задачи на сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList tasks={todayTasks} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 4. AI-ассистент (плавающая панель)

```typescript
// components/ai/ai-assistant.tsx
export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            page: window.location.pathname,
            user_role: session.user.role,
          }
        })
      });
      
      const { message } = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Кнопка открытия */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <Sparkles className="w-6 h-6 mx-auto" />
      </button>
      
      {/* Панель чата */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>AI-Ассистент</SheetTitle>
            <SheetDescription>
              Задайте вопрос о тендерах, задачах или отчетах
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Сообщения */}
            <ScrollArea className="flex-1 pr-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "mb-4 p-3 rounded-lg",
                    msg.role === 'user' 
                      ? "bg-primary text-white ml-8" 
                      : "bg-muted mr-8"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI думает...</span>
                </div>
              )}
            </ScrollArea>
            
            {/* Форма ввода */}
            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Напишите сообщение..."
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### 5. Умные фильтры с сохранением

```typescript
// components/shared/filter-panel.tsx
export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  
  const handleSaveFilter = async () => {
    const name = prompt('Название фильтра:');
    if (!name) return;
    
    await saveFilter({ name, filters });
    loadSavedFilters();
  };
  
  const handleLoadFilter = (saved: SavedFilter) => {
    setFilters(saved.filters);
    onFilterChange(saved.filters);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Фильтры</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveFilter}>
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="w-4 h-4 mr-2" />
              Сбросить
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Сохраненные фильтры */}
        {savedFilters.length > 0 && (
          <div>
            <Label>Сохраненные фильтры</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {savedFilters.map(saved => (
                <Button
                  key={saved.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleLoadFilter(saved)}
                >
                  {saved.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Поля фильтров */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Менеджер</Label>
            <Select
              value={filters.manager_id}
              onValueChange={v => updateFilter('manager_id', v)}
            >
              {/* Опции */}
            </Select>
          </div>
          
          <div>
            <Label>Статус</Label>
            <Select
              value={filters.status}
              onValueChange={v => updateFilter('status', v)}
            >
              {/* Опции */}
            </Select>
          </div>
          
          <div>
            <Label>Дата от</Label>
            <DatePicker
              value={filters.date_from}
              onChange={v => updateFilter('date_from', v)}
            />
          </div>
          
          <div>
            <Label>Дата до</Label>
            <DatePicker
              value={filters.date_to}
              onChange={v => updateFilter('date_to', v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Адаптивность и мобильная версия

### Breakpoints

```typescript
export const breakpoints = {
  sm: '640px',   // Мобильные
  md: '768px',   // Планшеты
  lg: '1024px',  // Ноутбуки
  xl: '1280px',  // Десктопы
  '2xl': '1536px', // Большие экраны
};
```

### Мобильная навигация

```typescript
// components/layout/mobile-nav.tsx
export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <div className="flex justify-around py-2">
        <NavItem href="/dashboard" icon={<Home />} label="Главная" />
        <NavItem href="/tenders" icon={<FileText />} label="Тендеры" />
        <NavItem href="/tasks" icon={<CheckSquare />} label="Задачи" />
        <NavItem href="/reports" icon={<BarChart />} label="Отчеты" />
      </div>
    </nav>
  );
}
```

## Следующий документ

**PART 5**: План разработки, roadmap и оценка трудозатрат
