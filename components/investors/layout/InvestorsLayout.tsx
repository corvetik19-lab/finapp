"use client";

import { ReactNode } from "react";
import { InvestorsSidebar } from "./InvestorsSidebar";

interface InvestorsLayoutProps {
  children: ReactNode;
}

export function InvestorsLayout({ children }: InvestorsLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <InvestorsSidebar />
      <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
    </div>
  );
}
