# WhatsApp Webhook Backend Integration Guide

## Overview

This document provides complete integration details for the external webhook backend that handles incoming WhatsApp messages. The webhook backend receives messages from Meta's WhatsApp Cloud API and must call the flow executor in this application to process automated responses.

## Architecture

```
WhatsApp Cloud API → Webhook Backend → Flow Executor API → Database
                                    ↓
                              Send Messages via Meta API
```

## Flow Executor Integration

### Endpoint to Call

When the webhook backend receives an incoming WhatsApp message, it should call the flow executor by directly importing and executing the flow.

### Required Information

The webhook backend needs:
1. **User ID** - The owner of the flow (from phone number mapping)
2. **Contact Phone** - The sender's phone number
3. **Message Text** - The text content of the message
4. **Message Metadata** - Type, interactive data, media info

### Integration Method

Since you have access to the same codebase, import and use the flow executor directly:

```typescript
import { executeFlow } from "@/lib/flow-executor";
import { sendMessage } from "@/lib/meta";
import prisma from "@/lib/prisma";

async function handleIncomingMessage(webhookPayload: WhatsAppWebhookPayload) {
  // 1. Extract message data from Meta webhook
  const {
    phoneNumberId,
    from,
    message,
    name,
  } = extractMessageData(webhookPayload);

  // 2. Find the user who owns this WhatsApp phone number
  const user = await prisma.user.findFirst({
    where: { metaPhoneNumberId: phoneNumberId },
  });

  if (!user) {
    console.error(`No user found for phone number ID: ${phoneNumberId}`);
    return;
  }

  // 3. Find or create the contact
  let contact = await prisma.contact.findFirst({
    where: { userId: user.id, phone: from },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: from,
        name: name ?? null,
        userId: user.id,
      },
    });
  }

  // 4. Find active flows that might match this message
  const activeFlows = await prisma.flow.findMany({
    where: {
      userId: user.id,
      status: "Active",
    },
  });

  // 5. For each flow, check if there's an existing session or if the trigger matches
  for (const flow of activeFlows) {
    // Check for existing session
    let session = await prisma.session.findUnique({
      where: {
        contactId_flowId: {
          contactId: contact.id,
          flowId: flow.id,
        },
      },
      include: {
        flow: {
          select: {
            definition: true,
            userId: true,
            name: true,
          },
        },
        contact: {
          select: { phone: true },
        },
      },
    });

    // If session exists or trigger matches, execute the flow
    const shouldExecute =
      session?.status === "Paused" ||
      session?.status === "Active" ||
      matchesTrigger(message.text, flow.trigger);

    if (shouldExecute) {
      // Create session if it doesn't exist
      if (!session) {
        const newSession = await prisma.session.create({
          data: {
            contactId: contact.id,
            flowId: flow.id,
            status: "Active",
            context: {},
          },
          include: {
            flow: {
              select: {
                definition: true,
                userId: true,
                name: true,
              },
            },
            contact: {
              select: { phone: true },
            },
          },
        });
        session = newSession;
      }

      // 6. Save incoming message to database
      await prisma.message.create({
        data: {
          waMessageId: message.id,
          direction: "inbound",
          type: message.type ?? "text",
          content: message.text?.body ?? null,
          payload: message as any,
          status: "Delivered",
          contactId: contact.id,
          userId: user.id,
          sessionId: session.id,
        },
      });

      // 7. Execute the flow
      try {
        await executeFlow(
          session,
          message.text?.body ?? null,
          sendMessage,
          {
            type: message.type,
            rawText: message.text?.body,
            interactive: message.interactive ? {
              type: message.interactive.type,
              id: message.interactive.button_reply?.id ??
                  message.interactive.list_reply?.id,
              title: message.interactive.button_reply?.title ??
                     message.interactive.list_reply?.title,
            } : null,
          },
        );

        console.log(`Flow executed successfully for contact ${contact.phone}`);
      } catch (error) {
        console.error(`Flow execution failed:`, error);

        // Mark session as errored
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "Errored" },
        });
      }

      // Only execute first matching flow
      break;
    }
  }
}
```

## Message Type Handling

### Text Messages
```typescript
{
  type: "text",
  text: {
    body: "Hello"
  }
}
```

### Interactive Button Reply
```typescript
{
  type: "interactive",
  interactive: {
    type: "button_reply",
    button_reply: {
      id: "opt-0",
      title: "Option 1"
    }
  }
}
```

### Interactive List Reply
```typescript
{
  type: "interactive",
  interactive: {
    type: "list_reply",
    list_reply: {
      id: "item-1",
      title: "Selected Item"
    }
  }
}
```

## Trigger Matching Algorithm

Use this function to check if a message matches a flow trigger:

```typescript
function matchesTrigger(messageText: string | null, triggerKeyword: string): boolean {
  if (!messageText || !triggerKeyword) return false;

  const stripDiacritics = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalize = (text: string) => {
    try {
      return stripDiacritics(text.trim()).toLowerCase();
    } catch {
      return text.trim().toLowerCase();
    }
  };

  const normalizedMessage = normalize(messageText);
  const normalizedKeyword = normalize(triggerKeyword);

  // Special case: "default" trigger matches everything
  if (normalizedKeyword === "default") {
    return true;
  }

  // Check exact match or contains
  if (normalizedMessage === normalizedKeyword ||
      normalizedMessage.includes(normalizedKeyword)) {
    return true;
  }

  // Check word boundaries
  const words = normalizedMessage.split(/\s+/);
  return words.includes(normalizedKeyword);
}
```

## Database Schema Reference

### Session Table
```prisma
model Session {
  id            String   @id @default(cuid())
  status        String   @default("Active") // Active, Paused, Completed, Errored
  currentNodeId String?
  context       Json?    // Flow execution context
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  contactId String
  contact   Contact @relation(fields: [contactId], references: [id])
  flowId    String
  flow      Flow    @relation(fields: [flowId], references: [id])
  messages  Message[]

  @@unique([contactId, flowId])
}
```

### Message Table
```prisma
model Message {
  id              String    @id @default(cuid())
  waMessageId     String?   @unique
  direction       String    // "inbound" or "outbound"
  type            String    @default("text")
  content         String?
  payload         Json?
  status          String    @default("Pending")
  error           String?
  statusUpdatedAt DateTime?
  createdAt       DateTime  @default(now())

  contactId String
  contact   Contact @relation(fields: [contactId], references: [id])
  userId    String
  user      User @relation(fields: [userId], references: [id])
  sessionId String?
  session   Session? @relation(fields: [sessionId], references: [id])
}
```

## Message Status Updates

When you receive status updates from Meta (delivered, read, failed):

```typescript
async function handleStatusUpdate(statusUpdate: WhatsAppStatusUpdate) {
  const { id, status, errors } = statusUpdate;

  await prisma.message.updateMany({
    where: { waMessageId: id },
    data: {
      status: mapWhatsAppStatus(status),
      error: errors?.[0]?.title ?? null,
      statusUpdatedAt: new Date(),
    },
  });
}

function mapWhatsAppStatus(waStatus: string): string {
  const statusMap: Record<string, string> = {
    "sent": "Sent",
    "delivered": "Delivered",
    "read": "Read",
    "failed": "Failed",
  };
  return statusMap[waStatus] ?? "Pending";
}
```

## Error Handling

### Flow Execution Errors

The flow executor will throw `FlowSendMessageError` when messages fail to send:

```typescript
import { FlowSendMessageError } from "@/lib/flow-executor";

try {
  await executeFlow(session, messageText, sendMessage, metadata);
} catch (error) {
  if (error instanceof FlowSendMessageError) {
    console.error(`Message send error:`, {
      message: error.message,
      status: error.status,
      sessionId: session.id,
    });

    // Handle token expiry
    if (error.status === 401) {
      // Notify user their token expired
      await notifyUserTokenExpired(session.flow.userId);
    }
  } else {
    console.error(`Unexpected flow error:`, error);
  }
}
```

## Testing

### Test Message Flow

1. Send a test message via Meta API simulator
2. Webhook receives it
3. Call executeFlow with test data
4. Verify message appears in database
5. Check session status is updated correctly

### Example Test
```typescript
// Test trigger matching
const testFlow = await prisma.flow.findFirst({
  where: { trigger: "hola" }
});

const testContact = await prisma.contact.findFirst();

const testSession = await prisma.session.create({
  data: {
    contactId: testContact.id,
    flowId: testFlow.id,
    status: "Active",
  },
  include: {
    flow: {
      select: { definition: true, userId: true, name: true }
    },
    contact: {
      select: { phone: true }
    }
  }
});

await executeFlow(
  testSession,
  "hola",
  sendMessage,
  { type: "text", rawText: "hola", interactive: null }
);
```

## Production Checklist

- [ ] Webhook signature verification enabled
- [ ] Error logging configured
- [ ] Message retry logic implemented
- [ ] Rate limiting configured
- [ ] Database connection pooling set up
- [ ] Monitoring alerts configured
- [ ] Token expiry handling implemented
- [ ] Message deduplication (check waMessageId)
- [ ] Proper timezone handling
- [ ] Load testing completed

## Real-Time Updates with WebSockets

The webhook backend should implement WebSockets to notify the frontend about new messages in real-time.

### WebSocket Server Setup (in Webhook Backend)

```typescript
import { Server } from "socket.io";
import http from "http";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Room naming convention: `conversation:${contactId}`
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join conversation room
  socket.on("join:conversation", (contactId: string) => {
    socket.join(`conversation:${contactId}`);
    console.log(`Socket ${socket.id} joined conversation:${contactId}`);
  });

  // Leave conversation room
  socket.on("leave:conversation", (contactId: string) => {
    socket.leave(`conversation:${contactId}`);
    console.log(`Socket ${socket.id} left conversation:${contactId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

export { io };
```

### Emit Events When Messages Arrive

When the webhook receives a new message and saves it to the database:

```typescript
async function handleIncomingMessage(webhookPayload: WhatsAppWebhookPayload) {
  // ... existing flow execution code ...

  // After saving the incoming message
  const savedMessage = await prisma.message.create({
    data: {
      waMessageId: message.id,
      direction: "inbound",
      type: message.type ?? "text",
      content: message.text?.body ?? null,
      payload: message as any,
      status: "Delivered",
      contactId: contact.id,
      userId: user.id,
      sessionId: session?.id,
    },
  });

  // Emit WebSocket event to notify frontend
  io.to(`conversation:${contact.id}`).emit("message:new", {
    message: savedMessage,
    contactId: contact.id,
  });

  // Execute flow...
  await executeFlow(...);

  // After flow execution, fetch all new messages sent
  const newMessages = await prisma.message.findMany({
    where: {
      sessionId: session.id,
      direction: "outbound",
      createdAt: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
    },
    orderBy: { createdAt: "asc" },
  });

  // Emit each outbound message
  newMessages.forEach((msg) => {
    io.to(`conversation:${contact.id}`).emit("message:new", {
      message: msg,
      contactId: contact.id,
    });
  });
}
```

### Emit Typing Indicators

When flow is executing (before sending messages):

```typescript
// Before flow execution
io.to(`conversation:${contact.id}`).emit("typing:start", {
  contactId: contact.id,
});

// After flow execution
io.to(`conversation:${contact.id}`).emit("typing:stop", {
  contactId: contact.id,
});
```

### Emit Message Status Updates

When Meta sends status updates:

```typescript
async function handleStatusUpdate(statusUpdate: WhatsAppStatusUpdate) {
  const { id, status } = statusUpdate;

  await prisma.message.updateMany({
    where: { waMessageId: id },
    data: {
      status: mapWhatsAppStatus(status),
      statusUpdatedAt: new Date(),
    },
  });

  // Find the message to get contactId
  const message = await prisma.message.findUnique({
    where: { waMessageId: id },
    select: { id: true, contactId: true, status: true },
  });

  if (message) {
    io.to(`conversation:${message.contactId}`).emit("message:status", {
      messageId: message.id,
      waMessageId: id,
      status: mapWhatsAppStatus(status),
      contactId: message.contactId,
    });
  }
}
```

### WebSocket Event Reference

Events the webhook backend should emit:

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ message: Message, contactId: string }` | New message received or sent |
| `message:status` | `{ messageId: string, waMessageId: string, status: string, contactId: string }` | Message status update |
| `typing:start` | `{ contactId: string }` | Bot is typing |
| `typing:stop` | `{ contactId: string }` | Bot stopped typing |
| `session:updated` | `{ sessionId: string, status: string, contactId: string }` | Session status changed |

### Environment Variables (Webhook Backend)

```env
FRONTEND_URL=http://localhost:3000
WEBSOCKET_PORT=3001
DATABASE_URL=postgresql://...
```

### CORS Configuration

Ensure WebSocket CORS allows the frontend domain:

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    credentials: true,
  },
});
```

## Frontend Integration (This Project)

The frontend will connect to the webhook backend's WebSocket server and listen for events.

### WebSocket Connection (Frontend)

The frontend uses polling as a fallback and will integrate WebSockets when available:

```typescript
// Frontend connects to: ws://webhook-backend-url:3001
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_WEBHOOK_WS_URL);
```

## Support

For issues or questions:
- Check session status in database
- Review logs in `prisma.session` and `prisma.message`
- Verify flow definition is valid
- Check user's Meta credentials are active
- Monitor WebSocket connections and emissions

## API Reference Quick Links

- Flow Executor: `/src/lib/flow-executor.ts`
- Send Message: `/src/lib/meta.ts`
- Database Models: `/prisma/schema.prisma`
- Flow Schema: `/src/lib/flow-schema.ts`

## WebSocket Implementation Checklist (Webhook Backend)

- [ ] Install socket.io: `npm install socket.io`
- [ ] Create WebSocket server instance
- [ ] Implement room-based messaging (conversation:${contactId})
- [ ] Emit `message:new` on incoming messages
- [ ] Emit `message:new` after flow execution
- [ ] Emit `message:status` on status updates
- [ ] Emit `typing:start` and `typing:stop` during flow execution
- [ ] Configure CORS for frontend domain
- [ ] Add authentication/authorization for socket connections
- [ ] Test real-time message delivery
- [ ] Monitor WebSocket performance and connections
