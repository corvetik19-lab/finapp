'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Briefcase, Phone, Mail, FileText, Loader2 } from 'lucide-react';

interface TenderContact {
  id: string;
  name: string;
  company?: string;
  position?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
}

interface TenderContactsTabProps {
  tender: Tender;
  onUpdate: () => void;
}

export function TenderContactsTab({ tender, onUpdate }: TenderContactsTabProps) {
  const [contacts, setContacts] = useState<TenderContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    company: string;
    position: string;
    phone: string;
    email: string;
    notes: string;
  }>({
    name: '',
    company: '',
    position: '',
    phone: '',
    email: '',
    notes: '',
  });

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tender.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [tender.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Укажите имя контакта');
      return;
    }

    try {
      const url = editingId
        ? `/api/tenders/${tender.id}/contacts/${editingId}`
        : `/api/tenders/${tender.id}/contacts`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        resetForm();
        loadContacts();
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleEdit = (contact: TenderContact) => {
    setFormData({
      name: contact.name,
      company: contact.company || '',
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setEditingId(contact.id);
    setShowModal(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Удалить контакт?')) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadContacts();
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      position: '',
      phone: '',
      email: '',
      notes: '',
    });
    setShowModal(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-500">Загрузка контактов...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Контакты контрагентов ({contacts.length})
        </h3>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить контакт
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-1">Контактов пока нет</p>
          <p className="text-gray-500">Добавьте первый контакт для этого тендера</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    {contact.company && <span className="text-sm text-gray-500">{contact.company}</span>}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {contact.position && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span>{contact.position}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>{contact.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                    <Pencil className="h-4 w-4 mr-1" />Редактировать
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="h-4 w-4 mr-1 text-red-500" />Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать контакт' : 'Добавить контакт'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>ФИО контакта *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Иванов Иван Иванович" />
              </div>
              <div className="space-y-2">
                <Label>Компания</Label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="ООО «Компания»" />
              </div>
              <div className="space-y-2">
                <Label>Должность</Label>
                <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Директор" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+7 (900) 123-45-67" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@company.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Примечания</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Дополнительная информация" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Отмена</Button>
              <Button type="submit">{editingId ? 'Сохранить' : 'Добавить'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
