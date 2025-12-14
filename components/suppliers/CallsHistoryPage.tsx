"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  X,
  Play,
  Building2,
} from "lucide-react";
import Link from "next/link";
import {
  CallHistory,
  Supplier,
  CALL_DIRECTIONS,
  CALL_STATUSES,
  CallDirection,
  CallStatus,
  formatPhoneNumber,
  formatDuration,
} from "@/lib/suppliers/types";

interface CallsHistoryPageProps {
  calls: CallHistory[];
  suppliers: Supplier[];
}

export function CallsHistoryPage({ calls, suppliers }: CallsHistoryPageProps) {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          call.from_number?.includes(search) ||
          call.to_number?.includes(search) ||
          call.supplier?.name.toLowerCase().includes(searchLower) ||
          call.contact?.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (directionFilter !== "all" && call.direction !== directionFilter) {
        return false;
      }

      if (statusFilter !== "all" && call.status !== statusFilter) {
        return false;
      }

      if (supplierFilter !== "all" && call.supplier_id !== supplierFilter) {
        return false;
      }

      return true;
    });
  }, [calls, search, directionFilter, statusFilter, supplierFilter]);

  const clearFilters = () => {
    setSearch("");
    setDirectionFilter("all");
    setStatusFilter("all");
    setSupplierFilter("all");
  };

  const hasFilters =
    search ||
    directionFilter !== "all" ||
    statusFilter !== "all" ||
    supplierFilter !== "all";

  const getDirectionIcon = (direction: CallDirection) => {
    return direction === "inbound" ? (
      <PhoneIncoming className="h-4 w-4 text-green-600" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
    );
  };

  const getStatusBadge = (status: CallStatus) => {
    const info = CALL_STATUSES[status];
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      green: "default",
      red: "destructive",
      blue: "outline",
      orange: "secondary",
      gray: "secondary",
    };
    return <Badge variant={variants[info.color] || "secondary"}>{info.name}</Badge>;
  };

  // Статистика
  const stats = useMemo(() => {
    const total = calls.length;
    const inbound = calls.filter((c) => c.direction === "inbound").length;
    const outbound = calls.filter((c) => c.direction === "outbound").length;
    const missed = calls.filter((c) => c.status === "missed").length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.talk_duration || 0), 0);

    return { total, inbound, outbound, missed, totalDuration };
  }, [calls]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">История звонков</h1>
        <p className="text-muted-foreground">
          Журнал всех звонков с поставщиками
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <PhoneIncoming className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inbound}</p>
                <p className="text-xs text-muted-foreground">Входящих</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PhoneOutgoing className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outbound}</p>
                <p className="text-xs text-muted-foreground">Исходящих</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <PhoneMissed className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.missed}</p>
                <p className="text-xs text-muted-foreground">Пропущенных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Phone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(stats.totalDuration)}
                </p>
                <p className="text-xs text-muted-foreground">Общее время</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру или поставщику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Направление" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(CALL_DIRECTIONS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(CALL_STATUSES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Поставщик" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все поставщики</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardHeader>
          <CardTitle>
            Журнал звонков
            {hasFilters && (
              <Badge variant="secondary" className="ml-2">
                {filteredCalls.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Нет звонков</h3>
              <p className="text-muted-foreground mt-1">
                {hasFilters
                  ? "Попробуйте изменить параметры фильтра"
                  : "История звонков пуста"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Дата/время</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{getDirectionIcon(call.direction)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(call.started_at).toLocaleDateString("ru-RU")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(call.started_at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatPhoneNumber(
                        call.direction === "inbound"
                          ? call.from_number
                          : call.to_number
                      )}
                    </TableCell>
                    <TableCell>
                      {call.supplier ? (
                        <Link
                          href={`/tenders/suppliers/${call.supplier_id}`}
                          className="hover:underline"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {call.supplier.name}
                              </div>
                              {call.contact && (
                                <div className="text-xs text-muted-foreground">
                                  {call.contact.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.talk_duration ? (
                        formatDuration(call.talk_duration)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell>
                      {call.recording_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Play className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
