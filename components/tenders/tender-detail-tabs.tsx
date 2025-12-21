'use client';

import { useState, useCallback, useRef } from 'react';
import type { Tender, TenderType, TenderStageTemplate, TenderStage } from '@/lib/tenders/types';
import { TenderInfoTab } from './tender-info-tab';
import { TenderTasksTab } from './tender-tasks-tab';
import { TenderFilesTab } from './tender-files-tab';
import { TenderCostsTab } from './tender-costs-tab';
import { TenderContactsTab } from './tender-contacts-tab';
import { TenderCommentsSection } from './TenderCommentsSection';
import { TenderHistory } from './tender-history';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, ListTodo, Paperclip, Receipt, Users, MessageSquare, History } from 'lucide-react';

interface TenderDetailTabsProps {
  tender: Tender;
  stages: TenderStage[];
  types: TenderType[];
  templates?: TenderStageTemplate[];
  employees?: Array<{ id: string; full_name: string; role?: string; role_name?: string }>;
  onUpdate: () => void;
}

const ARCHIVED_STAGE_NAMES = [
  'Не участвуем',
  'Не прошло проверку',
  'Не подано',
  'Проиграли',
  'Договор не заключен',
];

const normalizeStageName = (name?: string | null) => (name || '').trim().toLowerCase();

export function TenderDetailTabs({ tender, stages, types, templates = [], employees = [], onUpdate }: TenderDetailTabsProps) {
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('info');
  const scrollPositionRef = useRef<number>(0);

  const isArchivedStage = ARCHIVED_STAGE_NAMES
    .map(name => normalizeStageName(name))
    .includes(normalizeStageName(tender.stage?.name));

  // Сохраняем позицию скролла и переключаем вкладку
  const handleTabChange = useCallback((value: string) => {
    // Сохраняем текущую позицию скролла
    scrollPositionRef.current = window.scrollY;
    
    // Переключаем вкладку
    setActiveTab(value);
    
    // Восстанавливаем позицию скролла после рендера
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  }, []);

  return (
    <div className="bg-white rounded-lg border">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-gray-50/50 p-0 h-auto flex-wrap">
          <TabsTrigger 
            value="info" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <FileText className="h-4 w-4 mr-2" />
            Основная информация
          </TabsTrigger>
          
          {!isArchivedStage && (
            <>
              <TabsTrigger 
                value="tasks"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                <ListTodo className="h-4 w-4 mr-2" />
                Задачи
              </TabsTrigger>
              
              <TabsTrigger 
                value="files"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Файлы
              </TabsTrigger>
              
              <TabsTrigger 
                value="costs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Затраты
              </TabsTrigger>
              
              <TabsTrigger 
                value="contacts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                <Users className="h-4 w-4 mr-2" />
                Контакты
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger 
            value="comments"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Комментарии
            {commentsCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {commentsCount}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="history"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <History className="h-4 w-4 mr-2" />
            История
          </TabsTrigger>
        </TabsList>

        <div className="p-6">
          <TabsContent value="info" className="mt-0" forceMount hidden={activeTab !== 'info'}>
            <TenderInfoTab
              tender={tender}
              types={types}
              templates={templates}
              employees={employees}
              onUpdate={onUpdate}
              isArchived={isArchivedStage}
            />
          </TabsContent>
          
          {!isArchivedStage && (
            <>
              <TabsContent value="tasks" className="mt-0" forceMount hidden={activeTab !== 'tasks'}>
                <TenderTasksTab tender={tender} />
              </TabsContent>
              
              <TabsContent value="files" className="mt-0" forceMount hidden={activeTab !== 'files'}>
                <TenderFilesTab tender={tender} />
              </TabsContent>
              
              <TabsContent value="costs" className="mt-0" forceMount hidden={activeTab !== 'costs'}>
                <TenderCostsTab tender={tender} onUpdate={onUpdate} />
              </TabsContent>
              
              <TabsContent value="contacts" className="mt-0" forceMount hidden={activeTab !== 'contacts'}>
                <TenderContactsTab tender={tender} onUpdate={onUpdate} />
              </TabsContent>
            </>
          )}
          
          <TabsContent value="comments" className="mt-0" forceMount hidden={activeTab !== 'comments'}>
            <TenderCommentsSection
              tenderId={tender.id}
              onCountChange={setCommentsCount}
            />
          </TabsContent>
          
          <TabsContent value="history" className="mt-0" forceMount hidden={activeTab !== 'history'}>
            <TenderHistory tenderId={tender.id} stages={stages} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
