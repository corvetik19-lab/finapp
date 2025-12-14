import { TelephonySettingsPage } from "@/components/suppliers/TelephonySettingsPage";
import { getMangoSettings } from "@/lib/suppliers/service";

export default async function SettingsRoute() {
  const settings = await getMangoSettings();

  return <TelephonySettingsPage settings={settings} />;
}
