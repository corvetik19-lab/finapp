import { EmployeeProfileClient } from './employee-profile-client';

interface EmployeeProfilePageProps {
  params: {
    id: string;
  };
}

export default function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  return <EmployeeProfileClient employeeId={params.id} />;
}
