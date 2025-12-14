"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Star,
  User,
  Loader2,
} from "lucide-react";
import {
  SupplierContact,
  formatPhoneNumber,
} from "@/lib/suppliers/types";
import {
  createSupplierContact,
  updateSupplierContact,
  deleteSupplierContact,
} from "@/lib/suppliers/service";

interface SupplierContactsProps {
  supplierId: string;
  contacts: SupplierContact[];
}

export function SupplierContacts({ supplierId, contacts }: SupplierContactsProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isDecisionMaker, setIsDecisionMaker] = useState(false);

  const handleOpenForm = (contact?: SupplierContact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setPosition(contact.position || "");
      setPhone(contact.phone || "");
      setPhoneMobile(contact.phone_mobile || "");
      setEmail(contact.email || "");
      setIsPrimary(contact.is_primary);
      setIsDecisionMaker(contact.is_decision_maker);
    } else {
      setEditingContact(null);
      setName("");
      setPosition("");
      setPhone("");
      setPhoneMobile("");
      setEmail("");
      setIsPrimary(false);
      setIsDecisionMaker(false);
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      if (editingContact) {
        await updateSupplierContact(editingContact.id, supplierId, {
          name,
          position: position || undefined,
          phone: phone || undefined,
          phone_mobile: phoneMobile || undefined,
          email: email || undefined,
          is_primary: isPrimary,
          is_decision_maker: isDecisionMaker,
        });
      } else {
        await createSupplierContact({
          supplier_id: supplierId,
          name,
          position: position || undefined,
          phone: phone || undefined,
          phone_mobile: phoneMobile || undefined,
          email: email || undefined,
          is_primary: isPrimary,
          is_decision_maker: isDecisionMaker,
        });
      }
      handleCloseForm();
      router.refresh();
    } catch (error) {
      console.error("Error saving contact:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить контакт?")) return;

    const success = await deleteSupplierContact(id);
    if (success) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Контакты</h3>
        <Button size="sm" onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Нет контактов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between p-3 border rounded-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  {contact.is_primary && (
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Основной
                    </Badge>
                  )}
                  {contact.is_decision_maker && (
                    <Badge variant="secondary" className="text-xs">
                      ЛПР
                    </Badge>
                  )}
                </div>
                {contact.position && (
                  <p className="text-sm text-muted-foreground">
                    {contact.position}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-sm hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneNumber(contact.phone)}
                    </a>
                  )}
                  {contact.phone_mobile && (
                    <a
                      href={`tel:${contact.phone_mobile}`}
                      className="flex items-center gap-1 text-sm hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneNumber(contact.phone_mobile)}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-sm hover:text-primary"
                    >
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenForm(contact)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(contact.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Форма */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Редактировать контакт" : "Новый контакт"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>ФИО *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Должность</Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Менеджер по продажам"
                />
              </div>
              <div className="space-y-2">
                <Label>Рабочий телефон</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div className="space-y-2">
                <Label>Мобильный телефон</Label>
                <Input
                  value={phoneMobile}
                  onChange={(e) => setPhoneMobile(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivanov@company.ru"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrimary"
                  checked={isPrimary}
                  onCheckedChange={(checked) => setIsPrimary(checked === true)}
                />
                <label htmlFor="isPrimary" className="text-sm">
                  Основной контакт
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDecisionMaker"
                  checked={isDecisionMaker}
                  onCheckedChange={(checked) =>
                    setIsDecisionMaker(checked === true)
                  }
                />
                <label htmlFor="isDecisionMaker" className="text-sm">
                  ЛПР (принимает решения)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingContact ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
