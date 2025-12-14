"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, Star } from "lucide-react";
import {
  Supplier,
  SupplierCategory,
  SupplierStatus,
  SUPPLIER_STATUSES,
} from "@/lib/suppliers/types";
import { createSupplier, updateSupplier } from "@/lib/suppliers/service";

const supplierSchema = z.object({
  name: z.string().min(1, "Введите название компании"),
  short_name: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  ogrn: z.string().optional(),
  legal_address: z.string().optional(),
  actual_address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  website: z.string().optional(),
  category_id: z.string().optional(),
  status: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  description: z.string().optional(),
});

type SupplierFormInput = z.input<typeof supplierSchema>;

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  categories: SupplierCategory[];
}

export function SupplierForm({
  open,
  onOpenChange,
  supplier,
  categories,
}: SupplierFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form: UseFormReturn<SupplierFormInput> = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      short_name: supplier?.short_name ?? "",
      inn: supplier?.inn ?? "",
      kpp: supplier?.kpp ?? "",
      ogrn: supplier?.ogrn ?? "",
      legal_address: supplier?.legal_address ?? "",
      actual_address: supplier?.actual_address ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      website: supplier?.website ?? "",
      category_id: supplier?.category_id ?? "",
      status: supplier?.status ?? "active",
      rating: supplier?.rating ?? undefined,
      description: supplier?.description ?? "",
    },
  });

  const handleSubmit = async (data: SupplierFormInput) => {
    setIsLoading(true);
    try {
      const input = {
        name: data.name,
        short_name: data.short_name || undefined,
        inn: data.inn || undefined,
        kpp: data.kpp || undefined,
        ogrn: data.ogrn || undefined,
        legal_address: data.legal_address || undefined,
        actual_address: data.actual_address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        category_id: data.category_id || undefined,
        status: (data.status as SupplierStatus) || "active",
        rating: data.rating,
        description: data.description || undefined,
      };

      if (supplier) {
        await updateSupplier(supplier.id, input);
      } else {
        await createSupplier(input);
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving supplier:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [selectedRating, setSelectedRating] = useState<number | undefined>(
    supplier?.rating
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {supplier ? "Редактировать поставщика" : "Новый поставщик"}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? "Измените данные поставщика"
              : "Заполните информацию о новом поставщике"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Основная информация */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Основная информация
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Название компании *</FormLabel>
                      <FormControl>
                        <Input placeholder="ООО «Поставщик»" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="short_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Краткое название</FormLabel>
                      <FormControl>
                        <Input placeholder="Поставщик" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Категория</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Реквизиты */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Реквизиты
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="inn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ИНН</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" maxLength={12} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kpp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>КПП</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789" maxLength={9} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ogrn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ОГРН</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890123" maxLength={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Адреса */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Адреса</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="legal_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Юридический адрес</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456, г. Москва, ул. Примерная, д. 1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actual_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фактический адрес</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456, г. Москва, ул. Примерная, д. 1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Контакты */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Контакты
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input placeholder="+7 (999) 123-45-67" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="info@company.ru"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сайт</FormLabel>
                      <FormControl>
                        <Input placeholder="https://company.ru" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Статус и рейтинг */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Статус и рейтинг
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SUPPLIER_STATUSES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Рейтинг</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-1 pt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                const newRating =
                                  selectedRating === star ? undefined : star;
                                setSelectedRating(newRating);
                                field.onChange(newRating);
                              }}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  selectedRating && star <= selectedRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300 hover:text-yellow-300"
                                }`}
                              />
                            </button>
                          ))}
                          {selectedRating && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRating(undefined);
                                field.onChange(undefined);
                              }}
                              className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Сбросить
                            </button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Описание */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация о поставщике..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {supplier ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
