import { redirect } from "next/navigation";

export default function ForecastsRedirect() {
  redirect("/finance/forecasts");
}
