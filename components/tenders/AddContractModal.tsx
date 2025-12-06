'use client';

import { useState, useEffect } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, FileCheck, ChevronRight } from 'lucide-react';

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tender: Tender) => void;
  companyId: string;
}

export function AddContractModal({ isOpen, onClose, onSelect, companyId }: AddContractModalProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReadyTenders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyId]);

  const loadReadyTenders = async () => {
    try {
      setLoading(true);
      const stagesResponse = await fetch(`/api/tenders/stages?company_id=${companyId}`);
      if (!stagesResponse.ok) throw new Error('Ошибка загрузки этапов');
      const stagesData = await stagesResponse.json();
      const allStages = stagesData.data || [];
      const readyStages = allStages.filter((stage: { name: string; id: string }) => 
        stage.name === 'Договор подписан' || stage.name === 'ЗМО: Договор подписан'
      );
      if (readyStages.length === 0) { setTenders([]); return; }
      const stageIds = readyStages.map((s: { id: string }) => s.id);
      const params = new URLSearchParams({ company_id: companyId, limit: '1000' });
      const tendersResponse = await fetch(`/api/tenders?${params}`);
      if (!tendersResponse.ok) throw new Error('Ошибка загрузки тендеров');
      const tendersData = await tendersResponse.json();
      const filteredTenders = (tendersData || []).filter((t: Tender) => stageIds.includes(t.stage_id));
      setTenders(filteredTenders);
    } catch (error) {
      console.error('Error loading ready tenders:', error);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenders = tenders.filter(tender =>
    tender.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tender.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tender.purchase_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить контракт в реализацию</DialogTitle>
          <p className="text-sm text-gray-500">Выберите закупку из этапа &quot;Договор подписан&quot;</p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по заказчику, предмету или номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Загрузка...</p>
            </div>
          ) : filteredTenders.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">Нет закупок для добавления</h3>
              <p className="text-sm text-gray-500">{searchQuery ? 'По вашему запросу ничего не найдено' : 'Нет закупок на этапе "Договор подписан"'}</p>
            </div>
          ) : (
            filteredTenders.map((tender) => (
              <Card key={tender.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(tender)}>
                <CardContent className="p-3 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate">{tender.customer}</span>
                    {tender.type?.name && <Badge variant="outline">{tender.type.name}</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{tender.subject}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span><span className="text-gray-500">НМЦК:</span> <span className="font-medium">{(tender.nmck / 100).toLocaleString('ru-RU')} ₽</span></span>
                    {tender.contract_price && tender.contract_price > 0 && (
                      <span><span className="text-gray-500">Контракт:</span> <span className="font-medium text-green-600">{(tender.contract_price / 100).toLocaleString('ru-RU')} ₽</span></span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-gray-500">
                    <span>№ ЕИС {tender.purchase_number}</span>
                    {tender.platform && <span>{tender.platform}</span>}
                  </div>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
