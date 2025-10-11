import { Metadata } from "next";
import SmartNotificationsList from "@/components/notifications/SmartNotificationsList";

export const metadata: Metadata = {
  title: "Уведомления — FinApp",
  description: "Умные уведомления и инсайты",
};

export default function NotificationsPage() {
  return <SmartNotificationsList />;
}
