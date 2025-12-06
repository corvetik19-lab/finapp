"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ImportCsvModal from "@/components/transactions/ImportCsvModal";
import { importTransactionsAction } from "@/app/(protected)/finance/transactions/actions";
import type { CsvNormalizedRow } from "@/lib/csv/import-schema";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function ImportCsvTrigger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleImport = useCallback(async ({ rows }: { rows: CsvNormalizedRow[]; fileName: string }) => {
    const result = await importTransactionsAction(rows);
    if (result.ok) router.refresh();
    return { ok: result.ok, message: result.message };
  }, [router]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" />
        Импорт
      </Button>
      <ImportCsvModal open={open} onClose={() => setOpen(false)} onImport={({ rows, fileName }) => handleImport({ rows, fileName })} />
    </>
  );
}
