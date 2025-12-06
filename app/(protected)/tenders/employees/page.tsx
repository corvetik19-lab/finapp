import { EmployeesList } from '@/components/employees/employees-list';
import { getCurrentCompanyId } from '@/lib/platform/organization';

export default async function TenderEmployeesPage() {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Компания не найдена</h1>
        <p className="text-slate-600 mt-2">
          Для работы с сотрудниками необходимо быть привязанным к компании.
        </p>
      </div>
    );
  }

  return <EmployeesList companyId={companyId} />;
}
