import { redirect } from 'next/navigation';
import { createRSCClient } from '@/lib/supabase/helpers';
import { MessageSquare } from 'lucide-react';
import { ChatClient } from '@/components/team/chat/ChatClient';
import { getTenders } from '@/lib/tenders/service';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get company_id from company_members (same as tenders dashboard)
  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1);

  const companyId = memberships?.[0]?.company_id;

  if (!companyId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <h2 className="text-lg font-medium">Компания не найдена</h2>
        <p>Выберите или создайте компанию в настройках.</p>
      </div>
    );
  }

  // Get chat rooms for the company
  const { data: rooms } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  // Get employees for the company from employees table (with department info via join)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, user_id, full_name, email, department_id, departments:department_id(id, name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active');

  const employeesList = (employees || []).map((e) => {
    // departments is returned as object from join (not array)
    const dept = e.departments as { id: string; name: string } | { id: string; name: string }[] | null;
    const deptName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
    return {
      id: e.user_id || e.id,
      name: e.full_name || e.email || 'Неизвестный',
      email: e.email || '',
      department: deptName || null,
    };
  });

  // Get departments for the company
  const { data: departmentsData } = await supabase
    .from('departments')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');

  const departmentsList = (departmentsData || []).map(d => ({ name: d.name }));

  // Get tenders for the company using service (handles permissions correctly)
  const tendersResult = await getTenders(companyId, { limit: 100 });
  
  const tendersList = (tendersResult.data || []).map(t => ({
    id: t.id,
    name: t.purchase_number ? `№${t.purchase_number} - ${t.customer}` : t.customer,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Командный чат
        </h1>
        <p className="text-muted-foreground mt-1">
          Обсуждения по тендерам и командная коммуникация
        </p>
      </div>

      {/* Chat Client */}
      <ChatClient
        companyId={companyId}
        userId={user.id}
        initialRooms={rooms || []}
        employees={employeesList}
        tenders={tendersList}
        departments={departmentsList}
      />
    </div>
  );
}
