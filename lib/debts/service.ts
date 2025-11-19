"use server";

import { z } from "zod";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { Debt } from "@/types/debt";
import { debtFormSchema } from "@/lib/validation/debt";

export type DebtInsertInput = z.infer<typeof debtFormSchema>;

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .is('deleted_at', null)
    .order('date_created', { ascending: false });

  if (error) throw error;
  return data as Debt[];
}

export async function createDebt(input: DebtInsertInput): Promise<Debt> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  // Преобразуем сумму в копейки
  const amountMinor = Math.round(input.amount * 100);

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      type: input.type,
      creditor_debtor_name: input.creditor_debtor_name,
      amount: amountMinor,
      currency: input.currency,
      date_created: input.date_created,
      date_due: input.date_due || null,
      description: input.description || null,
      status: 'active',
      amount_paid: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Debt;
}

export async function updateDebt(id: string, input: Partial<DebtInsertInput> & { status?: Debt['status'], amount_paid?: number }): Promise<Debt> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = { ...input };
  
  if (input.amount !== undefined) {
    updatePayload.amount = Math.round(input.amount * 100);
  }
  
  if (input.amount_paid !== undefined) {
    // amount_paid может приходить уже в копейках если мы вызываем из компонента, который работает с копейками,
    // но если мы используем тот же инпут что и для amount (major), то нужно умножать.
    // Предположим что input.amount_paid приходит в рублях (major units) как и amount.
    updatePayload.amount_paid = Math.round(input.amount_paid * 100);
  }

  // Удаляем поля, которые не должны быть в updatePayload напрямую если они пришли из формы
  // (в данном случае структура совпадает, но на всякий случай)

  const { data, error } = await supabase
    .from('debts')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Debt;
}

export async function deleteDebt(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const { error } = await supabase
    .from('debts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function payDebtPartially(id: string, amountPaidMajor: number): Promise<Debt> {
    const supabase = await createRouteClient();
    const { data: debt } = await supabase.from('debts').select('amount, amount_paid').eq('id', id).single();
    if (!debt) throw new Error('Debt not found');

    const amountPaidMinor = Math.round(amountPaidMajor * 100);
    const newAmountPaid = (debt.amount_paid || 0) + amountPaidMinor;
    
    const newStatus = newAmountPaid >= debt.amount ? 'paid' : 'partially_paid';

    return updateDebt(id, { amount_paid: newAmountPaid / 100, status: newStatus });
}
