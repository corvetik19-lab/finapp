"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Briefcase, Users } from "lucide-react";
import { PayrollPosition } from "@/lib/accounting/payroll/types";

interface PayrollPositionsPageProps {
  positions: PayrollPosition[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function PayrollPositionsPage({ positions }: PayrollPositionsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredPositions = positions.filter((pos) =>
    pos.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pos.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const totalHeadcount = positions.reduce((sum, p) => sum + p.headcount, 0);
  const filledCount = positions.reduce((sum, p) => sum + p.filled_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Штатное расписание</h1>
          <p className="text-muted-foreground">
            Должности и штатные единицы
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить должность
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая должность</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название должности *</Label>
                <Input placeholder="Менеджер по продажам" />
              </div>
              <div className="space-y-2">
                <Label>Отдел</Label>
                <Input placeholder="Отдел продаж" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Оклад (руб.)</Label>
                  <Input type="number" placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label>Штатных единиц</Label>
                  <Input type="number" placeholder="1" defaultValue="1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Районный коэффициент (%)</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Северная надбавка (%)</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Добавить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Должностей</div>
                <div className="text-2xl font-bold">{positions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Штатных единиц</div>
            <div className="text-2xl font-bold">{totalHeadcount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Занято / Свободно</div>
            <div className="text-2xl font-bold">
              <span className="text-emerald-600">{filledCount}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-orange-600">{totalHeadcount - filledCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по должности или отделу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Штатное расписание
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Должность</TableHead>
                <TableHead>Отдел</TableHead>
                <TableHead className="text-right">Оклад</TableHead>
                <TableHead className="text-center">Штатных</TableHead>
                <TableHead className="text-center">Занято</TableHead>
                <TableHead>Надбавки</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((pos) => (
                <TableRow key={pos.id}>
                  <TableCell className="font-medium">{pos.name}</TableCell>
                  <TableCell>{pos.department || "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(pos.base_salary)} ₽
                  </TableCell>
                  <TableCell className="text-center">{pos.headcount}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className={pos.filled_count >= pos.headcount ? "text-emerald-600" : ""}>
                        {pos.filled_count}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {pos.regional_bonus_percent > 0 && (
                        <Badge variant="outline" className="text-xs">
                          РК {pos.regional_bonus_percent}%
                        </Badge>
                      )}
                      {pos.northern_bonus_percent > 0 && (
                        <Badge variant="outline" className="text-xs">
                          СН {pos.northern_bonus_percent}%
                        </Badge>
                      )}
                      {pos.regional_bonus_percent === 0 && pos.northern_bonus_percent === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPositions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Должности не найдены</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
