import { ReactNode } from "react";

export const metadata = {
  title: "Портал Инвестора | Вход",
  description: "Вход в личный кабинет инвестора",
};

export default function InvestorPortalPublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
