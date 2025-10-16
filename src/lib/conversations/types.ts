export interface ConversationMessage {
  id: string;
  direction: "in" | "out" | "system";
  type: string;
  text: string;
  timestamp: string;
  metadata: string[];
}

export interface ConversationSummary {
  contactId: string;
  contactName: string | null;
  contactPhone: string;
  flows: Array<{ id: string; name: string }>;
  lastActivity: string;
  lastMessage: string;
  unreadCount: number;
  messages: ConversationMessage[];
}
