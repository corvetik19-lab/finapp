import { notFound } from "next/navigation";
import { SupplierCard } from "@/components/suppliers/SupplierCard";
import {
  getSupplierById,
  getSupplierContacts,
  getSupplierNotes,
  getSupplierFiles,
  getSupplierTenders,
  getSupplierCalls,
  getSupplierCategories,
} from "@/lib/suppliers/service";
import { getSupplierTasks, getSupplierActivities } from "@/lib/suppliers/tasks-service";
import { getSupplierContracts } from "@/lib/suppliers/contracts-service";
import { getEmailTemplates, getSupplierEmails } from "@/lib/suppliers/email-service";
import { getSupplierPricelists } from "@/lib/suppliers/pricelist-service";
import { getSupplierReviews } from "@/lib/suppliers/reviews-service";

interface SupplierPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierRoute({ params }: SupplierPageProps) {
  const { id } = await params;
  
  const supplier = await getSupplierById(id);

  if (!supplier) {
    notFound();
  }

  const [contacts, notes, files, tenders, calls, tasks, activities, contracts, emailTemplates, emails, pricelists, reviews, categories] = await Promise.all([
    getSupplierContacts(id),
    getSupplierNotes(id),
    getSupplierFiles(id),
    getSupplierTenders(id),
    getSupplierCalls(id),
    getSupplierTasks(id),
    getSupplierActivities(id),
    getSupplierContracts(id),
    getEmailTemplates(),
    getSupplierEmails(id),
    getSupplierPricelists(id),
    getSupplierReviews(id),
    getSupplierCategories(),
  ]);

  return (
    <SupplierCard
      supplier={supplier}
      contacts={contacts}
      notes={notes}
      files={files}
      tenders={tenders}
      calls={calls}
      tasks={tasks}
      activities={activities}
      contracts={contracts}
      emailTemplates={emailTemplates}
      emails={emails}
      pricelists={pricelists}
      reviews={reviews}
      categories={categories}
    />
  );
}
