'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import styles from './tender-contacts-tab.module.css';

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
    return <div className={styles.container}>Загрузка контактов...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Контакты контрагентов ({contacts.length})</h3>
        <button className={styles.addButton} onClick={() => setShowModal(true)}>
          <span className={styles.buttonIcon}>+</span>
          Добавить контакт
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>👥 Контактов пока нет</p>
          <p>Добавьте первый контакт для этого тендера</p>
        </div>
      ) : (
        <div className={styles.contactsList}>
          {contacts.map((contact) => (
            <div key={contact.id} className={styles.contactCard}>
              <div className={styles.contactHeader}>
                <div>
                  <h4 className={styles.contactName}>{contact.name}</h4>
                  {contact.company && (
                    <span className={styles.contactCompany}>{contact.company}</span>
                  )}
                </div>
              </div>

              <div className={styles.contactInfo}>
                {contact.position && (
                  <div className={styles.contactInfoItem}>
                    <span>💼</span>
                    <span>{contact.position}</span>
                  </div>
                )}

                {contact.phone && (
                  <div className={styles.contactInfoItem}>
                    <span>📞</span>
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </div>
                )}

                {contact.email && (
                  <div className={styles.contactInfoItem}>
                    <span>📧</span>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </div>
                )}

                {contact.notes && (
                  <div className={styles.contactInfoItem}>
                    <span>📝</span>
                    <span>{contact.notes}</span>
                  </div>
                )}
              </div>

              <div className={styles.contactActions}>
                <button className={styles.button} onClick={() => handleEdit(contact)}>
                  ✏️ Редактировать
                </button>
                <button className={styles.button} onClick={() => handleDelete(contact.id)}>
                  🗑️ Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.formModal} onClick={resetForm}>
          <div className={styles.formContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.formTitle}>
              {editingId ? 'Редактировать контакт' : 'Добавить контакт'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>ФИО контакта *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Компания</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="ООО «Компания»"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Должность</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Директор"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (900) 123-45-67"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Примечания</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={resetForm} className={styles.button}>
                  Отмена
                </button>
                <button type="submit" className={styles.addButton}>
                  {editingId ? '✓ Сохранить' : '✓ Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
