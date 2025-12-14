"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Search, 
  ArrowLeft,
  Building,
  User,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AccountingCounterparty,
  ORGANIZATION_TYPES,
  OrganizationType
} from "@/lib/accounting/types";

interface CounterpartiesListProps {
  counterparties: AccountingCounterparty[];
}

export function CounterpartiesList({ counterparties }: CounterpartiesListProps) {
  const [search, setSearch] = useState("");

  // Фильтрация
  const filteredCounterparties = counterparties.filter(cp => {
    const matchesSearch = 
      cp.name.toLowerCase().includes(search.toLowerCase()) ||
      (cp.inn && cp.inn.includes(search)) ||
      (cp.email && cp.email.toLowerCase().includes(search.toLowerCase()));
    
    return matchesSearch;
  });

  // Статистика
  const stats = {
    total: counterparties.length,
    customers: counterparties.filter(c => c.is_customer).length,
    suppliers: counterparties.filter(c => c.is_supplier).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Контрагенты
            </h1>
            <p className="text-muted-foreground">
              Заказчики и поставщики
            </p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить контрагента
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего контрагентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заказчики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.customers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Поставщики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.suppliers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, ИНН или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardContent className="p-0">
          {filteredCounterparties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Контрагенты не найдены</h3>
              <p className="text-muted-foreground mb-4">
                {counterparties.length === 0
                  ? "Добавьте первого контрагента"
                  : "Попробуйте изменить поиск"
                }
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить контрагента
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Форма</TableHead>
                  <TableHead>ИНН</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCounterparties.map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cp.organization_type === 'ip' ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Building className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium">{cp.name}</div>
                          {cp.short_name && (
                            <div className="text-sm text-muted-foreground">{cp.short_name}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ORGANIZATION_TYPES[cp.organization_type as OrganizationType] || cp.organization_type}
                    </TableCell>
                    <TableCell>
                      {cp.inn || '—'}
                      {cp.kpp && <span className="text-muted-foreground"> / {cp.kpp}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cp.is_customer && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Заказчик
                          </Badge>
                        )}
                        {cp.is_supplier && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Поставщик
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cp.email && <div className="text-sm">{cp.email}</div>}
                      {cp.phone && <div className="text-sm text-muted-foreground">{cp.phone}</div>}
                      {!cp.email && !cp.phone && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
