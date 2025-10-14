import { notFound } from "next/navigation";

import NotesPageClient from "@/components/notes/NotesPageClient";
import { listNotes, listNoteLabels } from "@/lib/notes/service";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  labels?: string;
}>;

export default async function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  const paramsObj = await searchParams;
  const params = paramsObj ?? {};
  const query = params?.q?.trim() ?? "";
  const pageParam = Number.parseInt(params?.page ?? "1", 10);
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const labelIds = (params?.labels ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (currentPage < 1) {
    notFound();
  }

  const { data: notes, count } = await listNotes({
    page: currentPage,
    pageSize: PAGE_SIZE,
    query,
    labelIds,
  });

  const labels = await listNoteLabels();

  return (
    <NotesPageClient
      notes={notes}
      labels={labels}
      totalCount={count}
      pageSize={PAGE_SIZE}
      currentPage={currentPage}
      initialQuery={query}
      initialLabelIds={labelIds}
    />
  );
}
