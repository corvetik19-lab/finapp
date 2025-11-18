import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listNotes, listNoteLabels } from "@/lib/notes/service";
import NotesPageClient from "@/components/notes/NotesPageClient";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PersonalNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const labelIdsParam = params.labels;
  const labelIds = Array.isArray(labelIdsParam)
    ? labelIdsParam
    : typeof labelIdsParam === "string"
    ? [labelIdsParam]
    : [];
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const [notesResult, labelsResult] = await Promise.all([
    listNotes({ query, labelIds, page }),
    listNoteLabels(),
  ]);

  return (
    <NotesPageClient
      notes={notesResult.data}
      labels={labelsResult}
      totalCount={notesResult.count}
      pageSize={10}
      currentPage={page}
      initialQuery={query}
      initialLabelIds={labelIds}
    />
  );
}
