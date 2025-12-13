import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Проверяем права - только админ имеет полный доступ
  const permissions = await getCurrentUserPermissions();
  const isAdmin = canViewAllTenders(permissions);

  if (!isAdmin) {
    // Сотрудники перенаправляются на ограниченный доступ
    // Они могут видеть только свои доски и задачи
  }

  return <>{children}</>;
}
