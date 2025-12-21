"use server";

// =====================================================
// Валидация ИНН (формат + контрольная сумма)
// =====================================================

export interface INNValidationResult {
  isValid: boolean;
  type?: "individual" | "legal"; // ИП или ЮЛ
  error?: string;
}

/**
 * Валидация ИНН с проверкой контрольной суммы
 * ИНН юрлица - 10 цифр, ИП - 12 цифр
 */
export function validateINN(inn: string): INNValidationResult {
  if (!inn) {
    return { isValid: false, error: "ИНН не указан" };
  }

  // Убираем пробелы и проверяем что только цифры
  const cleanINN = inn.replace(/\s/g, "");
  
  if (!/^\d+$/.test(cleanINN)) {
    return { isValid: false, error: "ИНН должен содержать только цифры" };
  }

  if (cleanINN.length === 10) {
    // ИНН юридического лица
    return validateLegalINN(cleanINN);
  } else if (cleanINN.length === 12) {
    // ИНН индивидуального предпринимателя / физлица
    return validateIndividualINN(cleanINN);
  } else {
    return { 
      isValid: false, 
      error: `ИНН должен содержать 10 или 12 цифр (получено ${cleanINN.length})` 
    };
  }
}

/**
 * Валидация ИНН юридического лица (10 цифр)
 */
function validateLegalINN(inn: string): INNValidationResult {
  const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const digits = inn.split("").map(Number);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checkDigit = (sum % 11) % 10;
  
  if (checkDigit !== digits[9]) {
    return { 
      isValid: false, 
      type: "legal",
      error: "Неверная контрольная сумма ИНН юридического лица" 
    };
  }
  
  return { isValid: true, type: "legal" };
}

/**
 * Валидация ИНН физического лица / ИП (12 цифр)
 */
function validateIndividualINN(inn: string): INNValidationResult {
  const weights1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const weights2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const digits = inn.split("").map(Number);
  
  // Проверка первой контрольной цифры (11-я позиция)
  let sum1 = 0;
  for (let i = 0; i < 10; i++) {
    sum1 += digits[i] * weights1[i];
  }
  const checkDigit1 = (sum1 % 11) % 10;
  
  if (checkDigit1 !== digits[10]) {
    return { 
      isValid: false, 
      type: "individual",
      error: "Неверная первая контрольная цифра ИНН" 
    };
  }
  
  // Проверка второй контрольной цифры (12-я позиция)
  let sum2 = 0;
  for (let i = 0; i < 11; i++) {
    sum2 += digits[i] * weights2[i];
  }
  const checkDigit2 = (sum2 % 11) % 10;
  
  if (checkDigit2 !== digits[11]) {
    return { 
      isValid: false, 
      type: "individual",
      error: "Неверная вторая контрольная цифра ИНН" 
    };
  }
  
  return { isValid: true, type: "individual" };
}

// =====================================================
// Валидация КПП
// =====================================================

export function validateKPP(kpp: string): { isValid: boolean; error?: string } {
  if (!kpp) {
    return { isValid: true }; // КПП необязателен
  }

  const cleanKPP = kpp.replace(/\s/g, "");
  
  if (!/^\d{9}$/.test(cleanKPP)) {
    return { isValid: false, error: "КПП должен содержать 9 цифр" };
  }
  
  // 5-6 символы - код причины постановки (01-99)
  const reasonCode = parseInt(cleanKPP.substring(4, 6), 10);
  if (reasonCode < 1 || reasonCode > 99) {
    return { isValid: false, error: "Неверный код причины постановки в КПП" };
  }
  
  return { isValid: true };
}

// =====================================================
// Валидация ОГРН
// =====================================================

export function validateOGRN(ogrn: string): { isValid: boolean; type?: "legal" | "individual"; error?: string } {
  if (!ogrn) {
    return { isValid: true }; // ОГРН необязателен
  }

  const cleanOGRN = ogrn.replace(/\s/g, "");
  
  if (!/^\d+$/.test(cleanOGRN)) {
    return { isValid: false, error: "ОГРН должен содержать только цифры" };
  }

  if (cleanOGRN.length === 13) {
    // ОГРН юридического лица
    const number = BigInt(cleanOGRN.substring(0, 12));
    const checkDigit = Number(number % BigInt(11)) % 10;
    
    if (checkDigit !== parseInt(cleanOGRN[12], 10)) {
      return { isValid: false, type: "legal", error: "Неверная контрольная сумма ОГРН" };
    }
    
    return { isValid: true, type: "legal" };
  } else if (cleanOGRN.length === 15) {
    // ОГРНИП индивидуального предпринимателя
    const number = BigInt(cleanOGRN.substring(0, 14));
    const checkDigit = Number(number % BigInt(13)) % 10;
    
    if (checkDigit !== parseInt(cleanOGRN[14], 10)) {
      return { isValid: false, type: "individual", error: "Неверная контрольная сумма ОГРНИП" };
    }
    
    return { isValid: true, type: "individual" };
  } else {
    return { isValid: false, error: "ОГРН должен содержать 13 или 15 цифр" };
  }
}

// =====================================================
// Валидация телефона
// =====================================================

export function validatePhone(phone: string): { isValid: boolean; formatted?: string; error?: string } {
  if (!phone) {
    return { isValid: true };
  }

  // Убираем всё кроме цифр и +
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  
  // Нормализуем российский номер
  let normalized = cleanPhone;
  if (normalized.startsWith("8") && normalized.length === 11) {
    normalized = "+7" + normalized.substring(1);
  } else if (normalized.startsWith("7") && normalized.length === 11) {
    normalized = "+" + normalized;
  } else if (!normalized.startsWith("+") && normalized.length === 10) {
    normalized = "+7" + normalized;
  }
  
  // Проверяем длину
  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { isValid: false, error: "Неверный формат телефона" };
  }
  
  // Форматируем для отображения
  if (normalized.startsWith("+7") && digitsOnly.length === 11) {
    const formatted = `+7 (${digitsOnly.substring(1, 4)}) ${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7, 9)}-${digitsOnly.substring(9)}`;
    return { isValid: true, formatted };
  }
  
  return { isValid: true, formatted: normalized };
}

// =====================================================
// Валидация email
// =====================================================

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: true };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Неверный формат email" };
  }
  
  return { isValid: true };
}

// =====================================================
// Комплексная валидация поставщика
// =====================================================

export interface SupplierValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export function validateSupplierData(data: {
  name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  phone?: string;
  email?: string;
}): SupplierValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  // Обязательные поля
  if (!data.name?.trim()) {
    errors.push({ field: "name", message: "Название компании обязательно" });
  }

  // ИНН
  if (data.inn) {
    const innResult = validateINN(data.inn);
    if (!innResult.isValid) {
      errors.push({ field: "inn", message: innResult.error! });
    }
  }

  // КПП
  if (data.kpp) {
    const kppResult = validateKPP(data.kpp);
    if (!kppResult.isValid) {
      errors.push({ field: "kpp", message: kppResult.error! });
    }
  }

  // ОГРН
  if (data.ogrn) {
    const ogrnResult = validateOGRN(data.ogrn);
    if (!ogrnResult.isValid) {
      errors.push({ field: "ogrn", message: ogrnResult.error! });
    }
  }

  // Телефон
  if (data.phone) {
    const phoneResult = validatePhone(data.phone);
    if (!phoneResult.isValid) {
      warnings.push({ field: "phone", message: phoneResult.error! });
    }
  }

  // Email
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) {
      warnings.push({ field: "email", message: emailResult.error! });
    }
  }

  // Предупреждения
  if (!data.inn) {
    warnings.push({ field: "inn", message: "ИНН не указан - рекомендуется заполнить" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
