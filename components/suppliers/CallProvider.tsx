"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { IncomingCallPopup } from "./IncomingCallPopup";

interface SupplierInfo {
  id: string;
  name: string;
  short_name?: string;
  category?: {
    name: string;
    color: string;
  };
}

interface ContactInfo {
  id: string;
  name: string;
  position?: string;
}

interface IncomingCallData {
  phone: string;
  supplier: SupplierInfo | null;
  contact: ContactInfo | null;
}

interface CallContextType {
  currentCall: IncomingCallData | null;
  isEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;
}

const CallContext = createContext<CallContextType>({
  currentCall: null,
  isEnabled: false,
  requestNotificationPermission: async () => false,
});

export function useCallContext() {
  return useContext(CallContext);
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const [currentCall, setCurrentCall] = useState<IncomingCallData | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // Запрос разрешения на уведомления
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Подписка на события звонков через Supabase Realtime
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Проверяем наличие настроек телефонии
    const checkTelephonySettings = async () => {
      const { data } = await supabase
        .from("mango_settings")
        .select("is_enabled")
        .single();

      setIsEnabled(data?.is_enabled ?? false);
    };

    checkTelephonySettings();

    // Подписываемся на новые входящие звонки
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_history",
          filter: "direction=eq.inbound",
        },
        async (payload) => {
          const call = payload.new as {
            from_number: string;
            supplier_id?: string;
            contact_id?: string;
            status: string;
          };

          // Только для звонков со статусом "ringing"
          if (call.status !== "ringing") return;

          // Получаем информацию о поставщике
          let supplier: SupplierInfo | null = null;
          let contact: ContactInfo | null = null;

          if (call.supplier_id) {
            const { data: supplierData } = await supabase
              .from("suppliers")
              .select(`
                id, name, short_name,
                category:supplier_categories(name, color)
              `)
              .eq("id", call.supplier_id)
              .single();

            if (supplierData) {
              supplier = supplierData as unknown as SupplierInfo;
            }
          }

          if (call.contact_id) {
            const { data: contactData } = await supabase
              .from("supplier_contacts")
              .select("id, name, position")
              .eq("id", call.contact_id)
              .single();

            if (contactData) {
              contact = contactData as ContactInfo;
            }
          }

          setCurrentCall({
            phone: call.from_number,
            supplier,
            contact,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_history",
          filter: "direction=eq.inbound",
        },
        (payload) => {
          const call = payload.new as { status: string };

          // Скрываем popup когда звонок завершён или отвечен
          if (["answered", "completed", "missed", "busy"].includes(call.status)) {
            setCurrentCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClosePopup = useCallback(() => {
    setCurrentCall(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        currentCall,
        isEnabled,
        requestNotificationPermission,
      }}
    >
      {children}
      <IncomingCallPopup call={currentCall} onClose={handleClosePopup} />
    </CallContext.Provider>
  );
}
