import type {
  Contact,
  Flow,
  Session as PrismaSession,
} from "@prisma/client";

// ===== Types =====

export type SessionWithRelations = PrismaSession & {
  flow: Flow;
  contact: Contact;
};

export type WAMessageType =
  | "text"
  | "interactive"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "unknown";

export interface WAButtonReply {
  id: string;
  title: string;
}

export interface WAListReply {
  id: string;
  title: string;
  description?: string;
}

export interface WAInteractive {
  type: "button" | "list";
  button_reply?: WAButtonReply;
  list_reply?: WAListReply;
}

export interface WAMedia {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

export type WAImage = WAMedia;
export type WAVideo = WAMedia;
export interface WAAudio extends WAMedia {
  voice?: boolean;
}
export interface WADocument extends WAMedia {
  filename?: string;
}
export type WASticker = WAMedia;

export interface WAMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: WAMessageType;
  text?: { body?: string };
  interactive?: WAInteractive;
  image?: WAImage;
  video?: WAVideo;
  audio?: WAAudio;
  document?: WADocument;
  sticker?: WASticker;
}

export interface WAStatusError {
  code?: number | string;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

export interface WAStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: WAStatusError[];
}

export interface WAContactProfile {
  name?: string;
}

export interface WAContact {
  wa_id?: string;
  profile?: WAContactProfile;
}

export interface WAChangeValue {
  messaging_product?: string;
  messagingProduct?: string;
  messages?: WAMessage[];
  statuses?: WAStatus[];
  metadata: {
    phone_number_id: string;
  };
  contacts?: WAContact[];
}

export interface WAEntryChange {
  field?: string;
  value?: WAChangeValue;
}

export interface WAEntry {
  changes?: WAEntryChange[];
}

export interface MetaWebhookEvent {
  object?: string;
  entry?: WAEntry[];
}

export type SendMessagePayload =
  | { type: "text"; text: string }
  | {
      type: "media";
      mediaType: "image" | "video" | "audio" | "document";
      id?: string;
      url?: string;
      caption?: string;
    }
  | { type: "options"; text: string; options: string[] }
  | {
      type: "list";
      text: string;
      button: string;
      sections: Array<{ title: string; rows: Array<{ id: string; title: string }> }>;
    }
  | {
      type: "flow";
      flow: {
        name?: string | null;
        id: string;
        token: string;
        version?: string | null;
        header?: string | null;
        body: string;
        footer?: string | null;
        cta?: string | null;
        mode?: string | null;
        action?: string | null;
        action_payload?: Record<string, unknown> | null;
      };
    }
  | {
      type: "template";
      template: {
        name: string;
        language: string;
        components?: Array<{
          type: string;
          subType?: string | null;
          index?: number | null;
          parameters?: Array<{ type: "text"; text: string }>;
        }>;
      };
    };

export type SendMessageResult =
  | { success: true; messageId?: string | null }
  | { success: false; error?: string; status?: number; details?: unknown };

export type ManualFlowTriggerOptions = {
  flowId: string;
  from: string;
  message: string;
  name?: string | null;
  variables?: Record<string, unknown> | null;
  incomingMeta?: {
    type?: string | null;
    rawText?: string | null;
    interactive?: {
      type?: string | null;
      id?: string | null;
      title?: string | null;
    } | null;
  } | null;
};

export type ManualFlowTriggerResult =
  | {
      success: true;
      flowId: string;
      contactId: string;
      sessionId: string;
    }
  | {
      success: false;
      error: string;
      status?: number;
    };