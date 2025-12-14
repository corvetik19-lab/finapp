"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  ChevronLeft,
  Edit,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Users,
  FileText,
  StickyNote,
  Briefcase,
  PhoneCall,
  Trash2,
  Calculator,
  ListTodo,
  History,
  FileSpreadsheet,
} from "lucide-react";
import {
  Supplier,
  SupplierCategory,
  SupplierContact,
  SupplierNote,
  SupplierFile,
  SupplierTender,
  CallHistory,
  SupplierTask,
  SupplierActivity,
  SupplierContract,
  SupplierPricelist,
  SupplierReview,
  SUPPLIER_STATUSES,
  formatPhoneNumber,
} from "@/lib/suppliers/types";
import { deleteSupplier } from "@/lib/suppliers/service";
import { SupplierForm } from "./SupplierForm";
import { SupplierContacts } from "./SupplierContacts";
import { SupplierNotes } from "./SupplierNotes";
import { SupplierFiles } from "./SupplierFiles";
import { SupplierTenders } from "./SupplierTenders";
import { SupplierCalls } from "./SupplierCalls";
import { SupplierAccounting } from "./SupplierAccounting";
import { SupplierTasks } from "./SupplierTasks";
import { SupplierActivityLog } from "./SupplierActivityLog";
import { SupplierContracts } from "./SupplierContracts";
import { SupplierEmailComposer } from "./SupplierEmailComposer";
import { EmailTemplate, SupplierEmail } from "@/lib/suppliers/email-service";
import { SupplierPricelists } from "./SupplierPricelists";
import { SupplierReviews } from "./SupplierReviews";

interface SupplierCardProps {
  supplier: Supplier;
  contacts: SupplierContact[];
  notes: SupplierNote[];
  files: SupplierFile[];
  tenders: SupplierTender[];
  calls: CallHistory[];
  tasks: SupplierTask[];
  activities: SupplierActivity[];
  contracts: SupplierContract[];
  emailTemplates: EmailTemplate[];
  emails: SupplierEmail[];
  pricelists: SupplierPricelist[];
  reviews: SupplierReview[];
  categories: SupplierCategory[];
}

export function SupplierCard({
  supplier,
  contacts,
  notes,
  files,
  tenders,
  calls,
  tasks,
  activities,
  contracts,
  emailTemplates,
  emails,
  pricelists,
  reviews,
  categories,
}: SupplierCardProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Удалить поставщика? Это действие нельзя отменить.")) return;

    const success = await deleteSupplier(supplier.id);
    if (success) {
      router.push("/tenders/suppliers");
      router.refresh();
    }
  };

  const statusInfo = SUPPLIER_STATUSES[supplier.status];
  const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
    green: "default",
    gray: "secondary",
    red: "destructive",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/suppliers">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <Badge variant={statusVariants[statusInfo.color]}>
                {statusInfo.name}
              </Badge>
            </div>
            {supplier.short_name && (
              <p className="text-muted-foreground">{supplier.short_name}</p>
            )}
            {supplier.category && (
              <Badge
                variant="outline"
                className="mt-2"
                style={{ borderColor: supplier.category.color }}
              >
                {supplier.category.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка - информация */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Реквизиты */}
            {(supplier.inn || supplier.kpp || supplier.ogrn) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Реквизиты
                </h4>
                {supplier.inn && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">ИНН:</span>{" "}
                    {supplier.inn}
                  </p>
                )}
                {supplier.kpp && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">КПП:</span>{" "}
                    {supplier.kpp}
                  </p>
                )}
                {supplier.ogrn && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">ОГРН:</span>{" "}
                    {supplier.ogrn}
                  </p>
                )}
              </div>
            )}

            {/* Контакты компании */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Контакты
              </h4>
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {formatPhoneNumber(supplier.phone)}
                </a>
              )}
              {supplier.email && (
                <a
                  href={`mailto:${supplier.email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {supplier.email}
                </a>
              )}
              {supplier.website && (
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {supplier.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* Адреса */}
            {(supplier.legal_address || supplier.actual_address) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Адреса
                </h4>
                {supplier.legal_address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Юр.:</span>{" "}
                      {supplier.legal_address}
                    </div>
                  </div>
                )}
                {supplier.actual_address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Факт.:</span>{" "}
                      {supplier.actual_address}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Рейтинг */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Рейтинг
              </h4>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      supplier.rating && star <= supplier.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                {!supplier.rating && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Не оценён
                  </span>
                )}
              </div>
            </div>

            {/* Описание */}
            {supplier.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Описание
                </h4>
                <p className="text-sm whitespace-pre-wrap">
                  {supplier.description}
                </p>
              </div>
            )}

            {/* Теги */}
            {supplier.tags && supplier.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Теги
                </h4>
                <div className="flex flex-wrap gap-1">
                  {supplier.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Правая колонка - табы */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="contacts">
            <CardHeader className="pb-0">
              <div className="overflow-x-auto -mx-2 px-2">
                <TabsList className="inline-flex h-auto p-1 gap-1 flex-wrap justify-start min-w-full">
                  <TabsTrigger value="tasks" className="gap-1.5 px-3 py-2 text-xs">
                    <ListTodo className="h-4 w-4" />
                    <span>Задачи</span>
                    {tasks.filter(t => t.status !== "completed").length > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {tasks.filter(t => t.status !== "completed").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1.5 px-3 py-2 text-xs">
                    <History className="h-4 w-4" />
                    <span>История</span>
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="gap-1.5 px-3 py-2 text-xs">
                    <Users className="h-4 w-4" />
                    <span>Контакты</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {contacts.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5 px-3 py-2 text-xs">
                    <StickyNote className="h-4 w-4" />
                    <span>Заметки</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {notes.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-1.5 px-3 py-2 text-xs">
                    <FileText className="h-4 w-4" />
                    <span>Файлы</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {files.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="tenders" className="gap-1.5 px-3 py-2 text-xs">
                    <Briefcase className="h-4 w-4" />
                    <span>Тендеры</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {tenders.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="calls" className="gap-1.5 px-3 py-2 text-xs">
                    <PhoneCall className="h-4 w-4" />
                    <span>Звонки</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {calls.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="gap-1.5 px-3 py-2 text-xs">
                    <FileText className="h-4 w-4" />
                    <span>Договоры</span>
                    {contracts.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {contracts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="email" className="gap-1.5 px-3 py-2 text-xs">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                    {emails.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {emails.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pricelists" className="gap-1.5 px-3 py-2 text-xs">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Прайсы</span>
                    {pricelists.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {pricelists.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="gap-1.5 px-3 py-2 text-xs">
                    <Star className="h-4 w-4" />
                    <span>Отзывы</span>
                    {reviews.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {reviews.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="accounting" className="gap-1.5 px-3 py-2 text-xs">
                    <Calculator className="h-4 w-4" />
                    <span>Бухгалтерия</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="tasks" className="mt-0">
                <SupplierTasks supplierId={supplier.id} tasks={tasks} />
              </TabsContent>
              <TabsContent value="activity" className="mt-0">
                <SupplierActivityLog supplierId={supplier.id} activities={activities} />
              </TabsContent>
              <TabsContent value="contacts" className="mt-0">
                <SupplierContacts
                  supplierId={supplier.id}
                  contacts={contacts}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <SupplierNotes supplierId={supplier.id} notes={notes} />
              </TabsContent>
              <TabsContent value="files" className="mt-0">
                <SupplierFiles supplierId={supplier.id} files={files} />
              </TabsContent>
              <TabsContent value="tenders" className="mt-0">
                <SupplierTenders supplierId={supplier.id} tenders={tenders} />
              </TabsContent>
              <TabsContent value="calls" className="mt-0">
                <SupplierCalls supplierId={supplier.id} calls={calls} />
              </TabsContent>
              <TabsContent value="contracts" className="mt-0">
                <SupplierContracts supplierId={supplier.id} contracts={contracts} />
              </TabsContent>
              <TabsContent value="email" className="mt-0">
                <SupplierEmailComposer supplier={supplier} templates={emailTemplates} emails={emails} />
              </TabsContent>
              <TabsContent value="pricelists" className="mt-0">
                <SupplierPricelists supplierId={supplier.id} pricelists={pricelists} />
              </TabsContent>
              <TabsContent value="reviews" className="mt-0">
                <SupplierReviews supplierId={supplier.id} reviews={reviews} />
              </TabsContent>
              <TabsContent value="accounting" className="mt-0">
                <SupplierAccounting
                  supplierId={supplier.id}
                  counterpartyId={supplier.counterparty_id}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Форма редактирования */}
      <SupplierForm
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={supplier}
        categories={categories}
      />
    </div>
  );
}
