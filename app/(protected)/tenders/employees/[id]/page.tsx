import { EmployeeProfileClient } from './employee-profile-client';

interface EmployeeProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const { id } = await params;
  return <EmployeeProfileClient employeeId={id} />;
}
