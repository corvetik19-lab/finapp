export function formatMoney(
  amountMinor: number | bigint,
  currency: string,
  options: Intl.NumberFormatOptions = {}
) {
  const amount = Number(amountMinor) / 100;
  
  // Для рублей используем простое форматирование без кода валюты
  if (currency === "RUB") {
    const fractionDigits = options.maximumFractionDigits ?? options.minimumFractionDigits ?? 2;
    const formatted = amount.toLocaleString("ru-RU", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${formatted} ₽`;
  }
  
  // Для других валют используем стандартное форматирование
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    const fractionDigits = options.maximumFractionDigits ?? options.minimumFractionDigits ?? 2;
    return `${amount.toFixed(fractionDigits)} ${currency}`;
  }
}
