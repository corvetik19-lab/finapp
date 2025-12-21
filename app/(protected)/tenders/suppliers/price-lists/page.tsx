"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Calendar,
  Building2
} from "lucide-react";

interface PriceList {
  id: string;
  supplier: { id: string; name: string };
  name: string;
  uploaded_at: string;
  valid_until: string | null;
  items_count: number;
  file_url: string;
  status: "active" | "expired" | "processing";
}

export default function PriceListsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Демо данные
  const priceLists: PriceList[] = [
    {
      id: "1",
      supplier: { id: "s1", name: "ООО Альфа-Снаб" },
      name: "Прайс-лист канцтовары 2024",
      uploaded_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      valid_until: new Date(Date.now() + 86400000 * 60).toISOString(),
      items_count: 1250,
      file_url: "#",
      status: "active",
    },
    {
      id: "2",
      supplier: { id: "s2", name: "ООО БетаТрейд" },
      name: "Оргтехника Q4 2024",
      uploaded_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      valid_until: new Date(Date.now() - 86400000 * 5).toISOString(),
      items_count: 340,
      file_url: "#",
      status: "expired",
    },
    {
      id: "3",
      supplier: { id: "s3", name: "ИП Сидоров" },
      name: "Расходные материалы",
      uploaded_at: new Date().toISOString(),
      valid_until: null,
      items_count: 0,
      file_url: "#",
      status: "processing",
    },
  ];

  const filteredLists = priceLists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pl.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: PriceList["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Активен</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Истёк</Badge>;
      case "processing":
        return <Badge className="bg-yellow-100 text-yellow-800">Обработка</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Прайс-листы</h1>
          <p className="text-muted-foreground">
            Управление прайс-листами поставщиков
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Загрузить прайс
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или поставщику..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{pl.name}</div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {pl.supplier.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(pl.uploaded_at).toLocaleDateString("ru")}
                      </span>
                      {pl.items_count > 0 && (
                        <span>{pl.items_count} позиций</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(pl.status)}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
