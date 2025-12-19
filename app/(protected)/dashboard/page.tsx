import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";
import { getCachedUser } from "@/lib/supabase/server";

export default async function DashboardRedirect() {
  // const { data: { user } } = await getCachedUser(); // user не используется в оставшейся логике, но был в коде. Оставлю запрос, если он нужен для сайд-эффектов getCachedUser, но переменную уберу если не нужна.
  // А, getCachedUser просто читает куки.
  // В оригинале: const { data: { user } } = await getCachedUser();
  // Дальше: if (user) { ... запрос profile ... }
  // Так как запрос profile удаляем, user тоже может стать не нужен, если он не используется ниже.
  // Ниже user не используется.
  
  // Однако, getCachedUser() может быть важен для обновления сессии? Нет, это GET.
  // Я уберу всё лишнее.

  await getCachedUser(); // На случай если там есть логика валидации (хотя обычно нет)

  // Убрали редирект для супер-админа, чтобы он мог заходить в режимы без организации

  // Проверяем доступ к режимам в порядке приоритета
  // ai-studio проверяем первым, если это единственный доступный режим
  if (await hasUserModeAccess("ai-studio")) {
    // Проверяем есть ли доступ к другим режимам
    const hasFinance = await hasUserModeAccess("finance");
    const hasTenders = await hasUserModeAccess("tenders");
    const hasInvestments = await hasUserModeAccess("investments");
    const hasPersonal = await hasUserModeAccess("personal");
    
    // Если ai-studio единственный доступный режим - редиректим туда
    if (!hasFinance && !hasTenders && !hasInvestments && !hasPersonal) {
      redirect("/ai-studio");
    }
  }

  if (await hasUserModeAccess("finance")) {
    redirect("/finance/dashboard");
  }
  
  if (await hasUserModeAccess("tenders")) {
    redirect("/tenders/dashboard");
  }

  if (await hasUserModeAccess("investments")) {
    redirect("/investments/dashboard");
  }

  if (await hasUserModeAccess("personal")) {
    redirect("/personal/dashboard");
  }

  // Если только ai-studio доступен (fallback)
  if (await hasUserModeAccess("ai-studio")) {
    redirect("/ai-studio");
  }

  // Если нет доступа ни к одному модулю
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Нет доступных модулей</h1>
      <p className="text-slate-600 mb-4">
        У вашей учетной записи нет доступа к функциональным модулям организации.
      </p>
      <p className="text-slate-500 text-sm">
        Обратитесь к администратору для получения прав доступа.
      </p>
    </div>
  );
}
