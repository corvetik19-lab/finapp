import { getSources } from "@/lib/investors/service";
import { SourcesPage } from "@/components/investors/SourcesPage";

export default async function Page() {
  const sources = await getSources();
  return <SourcesPage sources={sources} />;
}
