import { ReactNode } from "react";
import AdminSettingsNav from "@/components/settings/AdminSettingsNav";
import { Building2 } from "lucide-react";
import { getCurrentOrganization } from "@/lib/platform/organization";

export default async function AdminSettingsLayout({ children }: { children: ReactNode }) {
  const organization = await getCurrentOrganization();
  const allowedModes = organization?.allowed_modes || [];
  
  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 hidden lg:flex flex-col bg-white border-r border-gray-100">
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
              <p className="text-sm text-gray-500">Управление организацией</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AdminSettingsNav allowedModes={allowedModes} />
        </div>
      </aside>
      
      {/* Content */}
      <main className="flex-1 min-w-0 px-4 md:px-8 pt-4 pb-8 overflow-y-auto bg-white">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
