"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, ChevronUp, CheckCircle, PlusCircle } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
}

interface OrganizationSwitcherProps {
  currentOrganization: Organization;
  organizations?: Organization[];
}

export default function OrganizationSwitcher({
  currentOrganization,
  organizations = [],
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSwitch = async (orgId: string) => {
    // TODO: API call to switch organization
    void orgId; // Reserved for future API call
    setIsOpen(false);
    router.refresh();
  };

  const planBadges: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "#6c757d" },
    pro: { label: "Pro", color: "#6366f1" },
    enterprise: { label: "Enterprise", color: "#10b981" },
  };

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} className="gap-2"><Building2 className="h-4 w-4" /><span className="max-w-[120px] truncate">{currentOrganization.name}</span>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50">
            <div className="p-4 border-b"><h3 className="font-semibold">Организации</h3><p className="text-sm text-muted-foreground">Переключение между рабочими пространствами</p></div>
            <div className="max-h-64 overflow-y-auto p-2">
              {organizations.map((org) => {
                const isActive = org.id === currentOrganization.id;
                const planInfo = planBadges[org.subscription_plan] || planBadges.free;
                return (
                  <button key={org.id} className={cn("w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors", isActive ? "bg-primary/10" : "hover:bg-muted")} onClick={() => handleSwitch(org.id)} disabled={isActive}>
                    <Building2 className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0"><div className="font-medium truncate">{org.name}</div><div className="text-xs text-muted-foreground">@{org.slug}</div></div>
                    <div className="flex items-center gap-2"><Badge variant="secondary" style={{ background: `${planInfo.color}20`, color: planInfo.color }}>{planInfo.label}</Badge>{isActive && <CheckCircle className="h-5 w-5 text-green-500" />}</div>
                  </button>
                );
              })}
            </div>
            <div className="p-2 border-t"><Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { setIsOpen(false); router.push("/settings/organization/new"); }}><PlusCircle className="h-4 w-4" />Создать организацию</Button></div>
          </div>
        </>
      )}
    </div>
  );
}
