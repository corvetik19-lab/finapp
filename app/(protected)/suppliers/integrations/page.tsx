import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZakupkiIntegration } from "@/components/suppliers/integrations/ZakupkiIntegration";
import { OneCIntegration } from "@/components/suppliers/integrations/OneCIntegration";
import { EDOIntegration } from "@/components/suppliers/integrations/EDOIntegration";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Database, FileCheck } from "lucide-react";

export const metadata = {
  title: "Интеграции | Поставщики",
  description: "Интеграции с внешними системами для работы с поставщиками",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}

export default function SuppliersIntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Интеграции</h1>
        <p className="text-muted-foreground">
          Подключение внешних систем для автоматизации работы с поставщиками
        </p>
      </div>

      <Tabs defaultValue="zakupki" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="zakupki" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Госзакупки
          </TabsTrigger>
          <TabsTrigger value="1c" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            1С
          </TabsTrigger>
          <TabsTrigger value="edo" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            ЭДО
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zakupki">
          <Suspense fallback={<LoadingSkeleton />}>
            <ZakupkiIntegration />
          </Suspense>
        </TabsContent>

        <TabsContent value="1c">
          <Suspense fallback={<LoadingSkeleton />}>
            <OneCIntegration />
          </Suspense>
        </TabsContent>

        <TabsContent value="edo">
          <Suspense fallback={<LoadingSkeleton />}>
            <EDOIntegration />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
