"use client";

import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing } from "lucide-react";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setIsOpen(!isOpen)} aria-label="Уведомления">
        {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
      </Button>
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
