"use server";

import { revalidatePath } from "next/cache";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/lib/accounting/bank-service";

interface BankAccountActionData {
  name: string;
  account_number: string;
  bank_name: string;
  bank_bik: string;
  bank_corr_account?: string;
  bank_swift?: string;
  account_type?: string;
  currency?: string;
  is_primary?: boolean;
  opened_at?: string;
}

export async function createBankAccountAction(data: BankAccountActionData) {
  try {
    const account = await createBankAccount(data);
    revalidatePath("/tenders/accounting/bank-accounts");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error creating bank account:", error);
    return { success: false, error: "Не удалось создать счёт" };
  }
}

export async function updateBankAccountAction(id: string, data: BankAccountActionData) {
  try {
    const account = await updateBankAccount(id, data);
    revalidatePath("/tenders/accounting/bank-accounts");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error updating bank account:", error);
    return { success: false, error: "Не удалось обновить счёт" };
  }
}

export async function deleteBankAccountAction(id: string) {
  try {
    await deleteBankAccount(id);
    revalidatePath("/tenders/accounting/bank-accounts");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return { success: false, error: "Не удалось удалить счёт" };
  }
}
