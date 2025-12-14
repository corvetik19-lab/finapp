"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Merge,
  Building2,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { DuplicateGroup, mergeSuppliers } from "@/lib/suppliers/duplicates-service";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SuppliersDuplicatesProps {
  duplicates: DuplicateGroup[];
  stats: {
    totalGroups: number;
    byInn: number;
    byPhone: number;
    byEmail: number;
    byName: number;
  };
}

const REASON_LABELS = {
  inn: { label: "По ИНН", icon: FileText, color: "text-red-600 bg-red-100" },
  phone: { label: "По телефону", icon: Phone, color: "text-orange-600 bg-orange-100" },
  email: { label: "По email", icon: Mail, color: "text-yellow-600 bg-yellow-100" },
  name: { label: "По названию", icon: Building2, color: "text-blue-600 bg-blue-100" },
};

export function SuppliersDuplicates({ duplicates, stats }: SuppliersDuplicatesProps) {
  const router = useRouter();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [targetId, setTargetId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleOpenMerge = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setTargetId(group.suppliers[0].id);
    setMergeOpen(true);
  };

  const handleMerge = async () => {
    if (!selectedGroup || !targetId) return;

    const sourceIds = selectedGroup.suppliers
      .filter((s) => s.id !== targetId)
      .map((s) => s.id);

    if (sourceIds.length === 0) return;

    setLoading(true);
    try {
      const result = await mergeSuppliers(targetId, sourceIds);
      if (result.success) {
        setMergeOpen(false);
        setSelectedGroup(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "—";
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-gray-500">Групп дубликатов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.byInn}</div>
            <p className="text-xs text-gray-500">По ИНН</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{stats.byPhone}</div>
            <p className="text-xs text-gray-500">По телефону</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.byEmail}</div>
            <p className="text-xs text-gray-500">По email</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.byName}</div>
            <p className="text-xs text-gray-500">По названию</p>
          </CardContent>
        </Card>
      </div>

      {/* Список дубликатов */}
      {duplicates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Copy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Дубликаты не найдены</p>
            <p className="text-sm">Все поставщики уникальны</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group, idx) => {
            const { label, icon: Icon, color } = REASON_LABELS[group.reason];

            return (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Совпадение: <strong>{group.key}</strong>
                      </span>
                    </div>
                    <Button size="sm" onClick={() => handleOpenMerge(group)}>
                      <Merge className="h-4 w-4 mr-1" />
                      Объединить
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.suppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-gray-400" />
                          <div>
                            <Link
                              href={`/tenders/suppliers/${supplier.id}`}
                              className="font-medium hover:text-blue-600"
                            >
                              {supplier.name}
                            </Link>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {supplier.inn && <span>ИНН: {supplier.inn}</span>}
                              {supplier.phone && <span>{formatPhone(supplier.phone)}</span>}
                              {supplier.email && <span>{supplier.email}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {supplier.status === "active" ? "Активен" : supplier.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог слияния */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Объединение поставщиков
            </DialogTitle>
            <DialogDescription>
              Выберите основную карточку. Остальные будут удалены, а их данные перенесены.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Внимание!</p>
                    <p className="text-yellow-700">
                      Это действие нельзя отменить. Все контакты, заметки, файлы,
                      договоры и другие данные будут перенесены в выбранную карточку.
                    </p>
                  </div>
                </div>
              </div>

              <RadioGroup value={targetId} onValueChange={setTargetId}>
                {selectedGroup.suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      targetId === supplier.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <RadioGroupItem value={supplier.id} id={supplier.id} />
                    <Label htmlFor={supplier.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-gray-500">
                        {supplier.inn && <span>ИНН: {supplier.inn}</span>}
                        {supplier.phone && <span className="ml-2">{supplier.phone}</span>}
                      </div>
                    </Label>
                    {targetId === supplier.id && (
                      <Badge variant="default">Основная</Badge>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleMerge} disabled={loading || !targetId}>
              {loading ? "Объединение..." : "Объединить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
