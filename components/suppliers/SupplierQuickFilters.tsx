"use client";

import { Badge } from "@/components/ui/badge";
import {
  Star,
  Trophy,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";

// =====================================================
// Быстрые фильтры (1 клик)
// =====================================================

export interface QuickFilter {
  id: string;
  name: string;
  icon: React.ReactNode;
  filter: Record<string, unknown>;
  color?: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "top_rated",
    name: "Топ рейтинг",
    icon: <Star className="h-3 w-3" />,
    filter: { ratingMin: 4.5 },
    color: "text-yellow-600",
  },
  {
    id: "winners",
    name: "Победители тендеров",
    icon: <Trophy className="h-3 w-3" />,
    filter: { tenderWinsMin: 1 },
    color: "text-amber-600",
  },
  {
    id: "verified",
    name: "Проверенные",
    icon: <CheckCircle className="h-3 w-3" />,
    filter: { hasInn: true, statuses: ["active"] },
    color: "text-green-600",
  },
  {
    id: "active",
    name: "Активные",
    icon: <TrendingUp className="h-3 w-3" />,
    filter: { statuses: ["active"] },
    color: "text-blue-600",
  },
  {
    id: "new",
    name: "Новые (30 дней)",
    icon: <Clock className="h-3 w-3" />,
    filter: { 
      createdFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    },
    color: "text-purple-600",
  },
  {
    id: "with_contacts",
    name: "С контактами",
    icon: <Users className="h-3 w-3" />,
    filter: { hasPhone: true, hasEmail: true },
    color: "text-teal-600",
  },
  {
    id: "warning",
    name: "Требуют внимания",
    icon: <AlertTriangle className="h-3 w-3" />,
    filter: { statuses: ["inactive"] },
    color: "text-orange-600",
  },
];

interface SupplierQuickFiltersProps {
  activeFilterId?: string;
  onFilterSelect: (filter: QuickFilter) => void;
  onClear: () => void;
}

export function SupplierQuickFilters({
  activeFilterId,
  onFilterSelect,
  onClear,
}: SupplierQuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Быстрые фильтры:</span>
      
      {QUICK_FILTERS.map((filter) => (
        <Badge
          key={filter.id}
          variant={activeFilterId === filter.id ? "default" : "outline"}
          className={`cursor-pointer hover:bg-accent gap-1 ${
            activeFilterId === filter.id ? "" : filter.color
          }`}
          onClick={() => {
            if (activeFilterId === filter.id) {
              onClear();
            } else {
              onFilterSelect(filter);
            }
          }}
        >
          {filter.icon}
          {filter.name}
        </Badge>
      ))}
    </div>
  );
}

export { QUICK_FILTERS };
