import { notFound } from "next/navigation";

import ConversationDetailPage from "@/components/dashboard/ConversationDetailPage";

const ConversationDetailRoute = ({
  params,
}: {
  params: { contactId?: string | string[] };
}) => {
  const rawId = params.contactId;
  const contactId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!contactId) {
    notFound();
  }

  return <ConversationDetailPage contactId={contactId} />;
};

export default ConversationDetailRoute;
