'use client';

import { useState } from 'react';
import { createOrganization } from '@/lib/admin/organizations';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface CreateOrganizationModalProps {
    users?: {
        id: string;
        email?: string;
        full_name?: string;
        global_role?: string;
    }[];
}

const MODES = [
    { key: 'finance', label: 'Финансы' },
    { key: 'tenders', label: 'Тендеры' },
    { key: 'investments', label: 'Инвестиции' },
    { key: 'personal', label: 'Личные' },
];

export function CreateOrganizationModal({ users = [] }: CreateOrganizationModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedModes, setSelectedModes] = useState<string[]>(['finance', 'tenders']);
    const [ownerId, setOwnerId] = useState<string>('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            // Добавляем режимы и владельца, если они не попали (хотя скрытые инпуты должны сработать)
            // Но надежнее использовать скрытые инпуты внутри формы
            await createOrganization(formData);
            setIsOpen(false);
            router.refresh();
        } catch (error) {
            alert('Ошибка при создании организации');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = (modeKey: string) => {
        setSelectedModes(prev => 
            prev.includes(modeKey) 
                ? prev.filter(k => k !== modeKey)
                : [...prev, modeKey]
        );
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" />Создать организацию</Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Новая организация</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="hidden" name="allowed_modes" value={JSON.stringify(selectedModes)} />
                        <input type="hidden" name="owner_id" value={ownerId} />
                        <div className="space-y-2"><Label>Название организации</Label><Input name="name" required placeholder="ООО Ромашка" /></div>
                        <div className="space-y-2"><Label>Описание</Label><Textarea name="description" placeholder="Краткое описание деятельности..." /></div>
                        <div className="space-y-2">
                            <Label>Владелец</Label>
                            <Select value={ownerId} onValueChange={setOwnerId}><SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger><SelectContent><SelectItem value="">-- Не назначен --</SelectItem>{users.filter(u => u.global_role !== 'super_admin').map(user => <SelectItem key={user.id} value={user.id}>{user.email} {user.full_name ? `(${user.full_name})` : ''}</SelectItem>)}</SelectContent></Select>
                            <p className="text-xs text-muted-foreground">Выбранный пользователь станет администратором.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Доступные режимы</Label>
                            <div className="flex flex-wrap gap-3">{MODES.map(mode => <label key={mode.key} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={selectedModes.includes(mode.key)} onCheckedChange={() => toggleMode(mode.key)} /><span className="text-sm">{mode.label}</span></label>)}</div>
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button><Button type="submit" disabled={loading}>{loading ? 'Создание...' : 'Создать'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
