import ContactDetails from "@/components/dashboard/ContactDetails";

export default function ContactDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return <ContactDetails contactId={params.id} />;
}
