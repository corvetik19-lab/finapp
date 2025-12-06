'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X, Upload, AlertCircle } from 'lucide-react';

interface LossReasonModalProps {
  tenderName: string;
  onSubmit: (reason: string, file: File | null, winnerInfo?: {
    winner_inn?: string;
    winner_name?: string;
    winner_price?: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export function LossReasonModal({ tenderName, onSubmit, onCancel }: LossReasonModalProps) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winnerInn, setWinnerInn] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerPrice, setWinnerPrice] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Размер файла не должен превышать 10 МБ');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Укажите причину проигрыша');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const winnerInfo = {
        winner_inn: winnerInn.trim() || undefined,
        winner_name: winnerName.trim() || undefined,
        winner_price: winnerPrice ? parseFloat(winnerPrice) * 100 : undefined,
      };
      await onSubmit(reason.trim(), file, winnerInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Причина проигрыша</DialogTitle>
          <p className="text-sm text-gray-500 truncate">{tenderName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Причина проигрыша <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опишите причину проигрыша тендера..."
              rows={4}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">Информация о победителе</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="winnerInn" className="text-xs">ИНН победителя</Label>
                <Input id="winnerInn" value={winnerInn} onChange={(e) => setWinnerInn(e.target.value)} placeholder="1234567890" disabled={isSubmitting} maxLength={12} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="winnerPrice" className="text-xs">Цена победы (руб.)</Label>
                <Input type="number" id="winnerPrice" value={winnerPrice} onChange={(e) => setWinnerPrice(e.target.value)} placeholder="1000000.00" disabled={isSubmitting} step="0.01" min="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="winnerName" className="text-xs">Название победителя</Label>
              <Input id="winnerName" value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="ООО «Название компании»" disabled={isSubmitting} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Прикрепить документ</Label>
            <div className="flex items-center gap-2">
              <Input type="file" id="file" onChange={handleFileChange} disabled={isSubmitting} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="flex-1" />
            </div>
            {file && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                <Upload className="h-4 w-4 text-blue-600" />
                <span className="flex-1 truncate">{file.name}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)} disabled={isSubmitting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (макс. 10 МБ)</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
