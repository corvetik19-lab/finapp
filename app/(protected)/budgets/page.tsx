import { redirect } from "next/navigation";

export default function BudgetsRedirect() {
  redirect("/finance/budgets");
}
