"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ImportCsvModal from "@/components/transactions/ImportCsvModal";
import { importTransactionsAction } from "@/app/(protected)/finance/transactions/actions";
import type { CsvNormalizedRow } from "@/lib/csv/import-schema";

type Props = {
  className?: string;
};

export default function ImportCsvTrigger({ className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleImport = useCallback(async ({ rows }: { rows: CsvNormalizedRow[]; fileName: string }) => {
    const result = await importTransactionsAction(rows);
    if (result.ok) {
      router.refresh();
    }
    return { ok: result.ok, message: result.message };
  }, [router]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        <span className="material-icons" aria-hidden>file_upload</span>
        Импорт
      </button>
      <ImportCsvModal
        open={open}
        onClose={() => setOpen(false)}
        onImport={({ rows, fileName }) => handleImport({ rows, fileName })}
      />
    </>
  );
}
