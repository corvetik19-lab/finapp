import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { loanRepaymentSchema } from "@/lib/loans/schema";

// POST /api/loans/repay - погасить кредит
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = loanRepaymentSchema.parse(body);

    // Получаем информацию о кредите
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("id, name, bank, currency, principal_paid")
      .eq("id", validatedData.loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: "Кредит не найден" }, { status: 404 });
    }

    const amountMinor = Math.round(validatedData.amount * 100);
    const principalAmountMinor = Math.round((validatedData.principalAmount || validatedData.amount) * 100);
    const interestAmountMinor = Math.round((validatedData.interestAmount || 0) * 100);
    const commissionMinor = Math.round((validatedData.commission || 0) * 100);

    // Создать запись платежа
    const { data: payment, error: paymentError } = await supabase
      .from("loan_payments")
      .insert({
        user_id: user.id,
        loan_id: validatedData.loanId,
        payment_date: validatedData.paymentDate,
        amount: amountMinor,
        principal_amount: principalAmountMinor,
        interest_amount: interestAmountMinor,
        note: validatedData.note || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment:", paymentError);
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }

    // Обновить сумму выплат в кредите и дату последнего платежа
    await supabase
      .from("loans")
      .update({
        principal_paid: (loan.principal_paid || 0) + principalAmountMinor,
        last_payment_date: validatedData.paymentDate,
      })
      .eq("id", validatedData.loanId);

    // Найти категорию "Погашение кредита" или создать её
    let categoryId: string | null = null;
    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("name", "Погашение кредита")
      .eq("user_id", user.id)
      .single();
    
    if (categories) {
      categoryId = categories.id;
    } else {
      // Создать категорию если её нет
      const { data: newCategory } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: "Погашение кредита",
          kind: "expense",
        })
        .select("id")
        .single();
      
      if (newCategory) {
        categoryId = newCategory.id;
      }
    }

    // Получить первый активный счёт пользователя для привязки транзакции
    const { data: firstAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .single();

    // Создать транзакцию расхода для отображения в списке транзакций
    if (firstAccount) {
      const { error: txnError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: firstAccount.id, // Используем первый доступный счёт
          direction: "expense",
          amount: amountMinor,
          currency: loan.currency || "RUB",
          occurred_at: validatedData.paymentDate,
          counterparty: `${loan.name} (${loan.bank})`,
          note: validatedData.note || `Погашение кредита`,
          category_id: categoryId,
        });

      if (txnError) {
        console.error("Failed to create transaction:", txnError);
        // Не возвращаем ошибку, так как платёж уже создан
      }

      // Создать отдельную транзакцию для комиссии, если она указана
      if (commissionMinor > 0) {
        // Найти категорию "Комиссия" или создать её
        let commissionCategoryId: string | null = null;
        
        const { data: existingCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("name", "Комиссия")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (existingCategory) {
          // Категория уже существует
          commissionCategoryId = existingCategory.id;
        } else {
          // Создаём новую категорию
          const { data: newCategory, error: categoryCreateError } = await supabase
            .from("categories")
            .insert({
              user_id: user.id,
              name: "Комиссия",
              kind: "expense",
            })
            .select("id")
            .single();
          
          if (newCategory && !categoryCreateError) {
            commissionCategoryId = newCategory.id;
          } else {
            console.error("Failed to create commission category:", categoryCreateError);
          }
        }

        // Создаём транзакцию комиссии
        const { error: commissionTxnError } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            account_id: firstAccount.id,
            direction: "expense",
            amount: commissionMinor,
            currency: loan.currency || "RUB",
            occurred_at: validatedData.paymentDate,
            counterparty: `${loan.name} (${loan.bank})`,
            note: `Комиссия за погашение кредита`,
            category_id: commissionCategoryId,
          });

        if (commissionTxnError) {
          console.error("Failed to create commission transaction:", commissionTxnError);
        }
      }
    }

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("POST /api/loans/repay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
