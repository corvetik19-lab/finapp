'use client';

import { useState } from 'react';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Loader2, AlertTriangle, Lightbulb, Pencil, HelpCircle } from 'lucide-react';

interface TenderSearchEISModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenderFound: (tenderData: EISTenderData) => void;
  onManualAdd: () => void;
  companyId: string;
}

export function TenderSearchEISModal({ isOpen, onClose, onTenderFound, onManualAdd, companyId }: TenderSearchEISModalProps) {
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notFoundNumber, setNotFoundNumber] = useState('');

  const handleSearch = async () => {
    if (!purchaseNumber.trim()) { setError('Введите номер закупки'); return; }
    setSearching(true);
    setError(null);
    setDuplicateWarning(null);
    try {
      const checkResponse = await fetch(`/api/tenders?company_id=${companyId}&purchase_number=${encodeURIComponent(purchaseNumber.trim())}`, { cache: 'no-store' });
      if (checkResponse.ok) {
        const existingTenders = await checkResponse.json();
        if (existingTenders && existingTenders.length > 0) {
          setDuplicateWarning(`Тендер с номером "${purchaseNumber}" уже загружен в систему!`);
          setSearching(false);
          return;
        }
      }
      const response = await fetch(`/api/tenders/search-eis?purchase_number=${encodeURIComponent(purchaseNumber)}&include_documents=true`);
      if (!response.ok) {
        if (response.status === 404) { setNotFoundNumber(purchaseNumber.trim()); setShowConfirmModal(true); }
        else { setError('Ошибка при поиске тендера'); }
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        onTenderFound(result.data);
        onClose();
        setPurchaseNumber('');
        setError(null);
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Error searching tender:', err);
      setError('Ошибка при поиске тендера в ЕИС');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !searching) handleSearch(); };
  const handleManualAdd = () => { setPurchaseNumber(''); setError(null); setDuplicateWarning(null); onManualAdd(); };
  const handleClose = () => { setPurchaseNumber(''); setError(null); setDuplicateWarning(null); setShowConfirmModal(false); setNotFoundNumber(''); onClose(); };
  const handleConfirmAdd = () => { setShowConfirmModal(false); setPurchaseNumber(''); setNotFoundNumber(''); onManualAdd(); };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить закупку</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Номер тендера из ЕИС..."
                disabled={searching}
                autoFocus
              />
              <Button onClick={handleSearch} disabled={searching || !purchaseNumber.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {duplicateWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Тендер уже в системе</AlertTitle>
                <AlertDescription>{duplicateWarning}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800">Введите номер закупки из ЕИС (например: 32515383401)</p>
                  <p className="text-blue-600 text-xs mt-1">Система автоматически заполнит все поля формы</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Отмена</Button>
            <Button variant="secondary" onClick={handleManualAdd}><Pencil className="h-4 w-4 mr-2" />Добавить вручную</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmModal} onOpenChange={(open: boolean) => !open && setShowConfirmModal(false)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-2"><HelpCircle className="h-12 w-12 text-amber-500" /></div>
            <DialogTitle>Закупка не найдена в ЕИС</DialogTitle>
            <DialogDescription>
              Закупка с номером <strong>&ldquo;{notFoundNumber}&rdquo;</strong> отсутствует в системе ЕИС. Хотите добавить эту закупку вручную?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Отменить</Button>
            <Button onClick={handleConfirmAdd}>Добавить закупку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
