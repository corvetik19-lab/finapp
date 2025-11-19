"use server";

import { createRSCClient } from "@/lib/supabase/server";

export interface Receipt {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  created_at: string;
}

export async function getRecentReceipts(limit: number = 10): Promise<Receipt[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('attachments')
    .select('id, file_name, file_path, mime_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }

  return data || [];
}
