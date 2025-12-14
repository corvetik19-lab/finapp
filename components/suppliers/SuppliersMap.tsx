"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  Building2,
} from "lucide-react";
import { SupplierLocation } from "@/lib/suppliers/geolocation-service";
import { calculateDistance } from "@/lib/suppliers/geo-utils";
import Link from "next/link";

interface SuppliersMapProps {
  suppliers: SupplierLocation[];
  stats: {
    total: number;
    geocoded: number;
    pending: number;
    percentage: number;
  };
}

export function SuppliersMap({ suppliers, stats }: SuppliersMapProps) {
  const [searchRadius, setSearchRadius] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLon, setCenterLon] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState<(SupplierLocation & { distance?: number })[]>(suppliers);

  const handleSearch = () => {
    const lat = parseFloat(centerLat);
    const lon = parseFloat(centerLon);
    const radius = parseFloat(searchRadius);

    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const withDistance = suppliers
      .filter((s) => s.latitude && s.longitude)
      .map((s) => ({
        ...s,
        distance: calculateDistance(lat, lon, s.latitude!, s.longitude!),
      }))
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    setFilteredSuppliers(withDistance);
  };

  const handleReset = () => {
    setCenterLat("");
    setCenterLon("");
    setSearchRadius("");
    setFilteredSuppliers(suppliers);
  };

  const openInMaps = (lat: number, lon: number, name: string) => {
    const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=15&l=map&text=${encodeURIComponent(name)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">Всего поставщиков</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.geocoded}</div>
            <p className="text-xs text-gray-500">С координатами</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            <p className="text-xs text-gray-500">Без координат</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.percentage}%</div>
            <p className="text-xs text-gray-500">Геокодировано</p>
          </CardContent>
        </Card>
      </div>

      {/* Поиск по радиусу */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Поиск в радиусе
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Широта</label>
              <Input
                placeholder="55.7558"
                value={centerLat}
                onChange={(e) => setCenterLat(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Долгота</label>
              <Input
                placeholder="37.6173"
                value={centerLon}
                onChange={(e) => setCenterLon(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Радиус (км)</label>
              <Input
                placeholder="50"
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
                className="w-24"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-1" />
              Найти
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Введите координаты центральной точки (например, вашего склада) и радиус поиска
          </p>
        </CardContent>
      </Card>

      {/* Список поставщиков */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Поставщики на карте ({filteredSuppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Нет поставщиков с координатами</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <Link
                        href={`/tenders/suppliers/${supplier.id}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {supplier.name}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {supplier.city && <span>{supplier.city}</span>}
                        {supplier.actual_address && (
                          <span className="ml-1">• {supplier.actual_address}</span>
                        )}
                      </div>
                      {supplier.latitude && supplier.longitude && (
                        <div className="text-xs text-gray-400">
                          {supplier.latitude.toFixed(4)}, {supplier.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {"distance" in supplier && supplier.distance !== undefined && (
                      <Badge variant="secondary">
                        {supplier.distance.toFixed(1)} км
                      </Badge>
                    )}
                    {supplier.latitude && supplier.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInMaps(supplier.latitude!, supplier.longitude!, supplier.name)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
