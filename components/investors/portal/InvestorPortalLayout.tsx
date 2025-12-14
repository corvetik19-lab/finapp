"use client";

import { ReactNode } from "react";

interface InvestorPortalLayoutProps {
  children: ReactNode;
}

export function InvestorPortalLayout({ children }: InvestorPortalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
