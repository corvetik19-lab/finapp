"use server";

import { revalidatePath } from "next/cache";
import {
  createBankIntegration,
  updateBankIntegration,
  deleteBankIntegration,
} from "@/lib/accounting/bank-service";
import { CreateBankIntegrationDTO, UpdateBankIntegrationDTO } from "@/lib/accounting/bank-types";

export async function createBankIntegrationAction(data: CreateBankIntegrationDTO) {
  try {
    const integration = await createBankIntegration(data);
    revalidatePath("/tenders/accounting/bank-integrations");
    revalidatePath("/tenders/accounting/bank-accounts");
    return { success: true, data: integration };
  } catch (error) {
    console.error("Error creating bank integration:", error);
    return { success: false, error: "Не удалось создать интеграцию" };
  }
}

export async function updateBankIntegrationAction(id: string, data: UpdateBankIntegrationDTO) {
  try {
    const integration = await updateBankIntegration(id, data);
    revalidatePath("/tenders/accounting/bank-integrations");
    return { success: true, data: integration };
  } catch (error) {
    console.error("Error updating bank integration:", error);
    return { success: false, error: "Не удалось обновить интеграцию" };
  }
}

export async function deleteBankIntegrationAction(id: string) {
  try {
    await deleteBankIntegration(id);
    revalidatePath("/tenders/accounting/bank-integrations");
    revalidatePath("/tenders/accounting/bank-accounts");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bank integration:", error);
    return { success: false, error: "Не удалось удалить интеграцию" };
  }
}
