# WebSocket Real-Time Setup

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
NEXT_PUBLIC_WEBHOOK_WS_URL="ws://localhost:3001"
```

- Use `ws://` for local development
- Use `wss://` for production (SSL)
- Point to your webhook backend WebSocket server

### 3. How It Works

**Frontend (This Project)**:
- ✅ Socket.io client installed
- ✅ Custom hook `useConversationSocket` created
- ✅ Integrated into conversation UI
- ✅ Auto-connects when viewing conversations
- ✅ Shows connection status badge
- ✅ Displays typing indicators
- ✅ Updates messages instantly
- ✅ Polling fallback (30s when connected, 5s when not)

**What Happens**:
1. User opens conversation → WebSocket connects
2. Joins room: `conversation:${contactId}`
3. Listens for events:
   - `message:new` - New message arrives
   - `message:status` - Message status updated
   - `typing:start` - Bot is typing
   - `typing:stop` - Bot stopped typing
4. Updates UI in real-time
5. Auto-reconnects on disconnect

### 4. Features

#### Real-Time Message Updates
Messages appear instantly without refresh when:
- Bot sends automated response
- Manual message sent from other device
- Message status changes (sent → delivered → read)

#### Typing Indicators
Shows "Escribiendo..." badge when bot is processing

#### Connection Status
Shows green "Tiempo real" badge when connected

#### Smart Polling Fallback
- WebSocket connected: Polls every 30s
- WebSocket disconnected: Polls every 5s
- Always has fallback, never breaks

### 5. Webhook Backend Requirements

See `WEBHOOK_INTEGRATION.md` for complete guide.

**Quick Summary**:
```typescript
import { Server } from "socket.io";

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join:conversation", (contactId) => {
    socket.join(`conversation:${contactId}`);
  });
});

// When message arrives
io.to(`conversation:${contactId}`).emit("message:new", {
  message: savedMessage,
  contactId,
});

// When typing
io.to(`conversation:${contactId}`).emit("typing:start", { contactId });
io.to(`conversation:${contactId}`).emit("typing:stop", { contactId });
```

### 6. Testing

#### Without WebSocket Backend
Everything still works! The app falls back to polling.

#### With WebSocket Backend
1. Start webhook backend with WebSocket server
2. Set `NEXT_PUBLIC_WEBHOOK_WS_URL`
3. Open conversation
4. See green "Tiempo real" badge
5. Send test message from WhatsApp
6. Watch it appear instantly

### 7. Production

**Environment Variable**:
```env
NEXT_PUBLIC_WEBHOOK_WS_URL="wss://your-webhook-backend.com"
```

**CORS**: Ensure webhook backend allows your frontend domain

**SSL**: Use `wss://` (not `ws://`) in production

**Monitoring**: Check WebSocket connection count, reconnection rate

### 8. Troubleshooting

**Badge doesn't show "Tiempo real"**:
- Check `NEXT_PUBLIC_WEBHOOK_WS_URL` is set
- Verify webhook backend WebSocket server running
- Check browser console for connection errors
- Verify CORS settings on backend

**Messages still delayed**:
- Check WebSocket is actually connected (badge visible)
- Verify backend emits `message:new` events
- Check browser network tab for WebSocket frames
- Ensure contactId matches

**Typing indicator doesn't show**:
- Backend must emit `typing:start` before sending
- Backend must emit `typing:stop` after sending
- Check events include correct `contactId`

### 9. Code Reference

**Hook**: `/src/hooks/useConversationSocket.ts`
**Usage**: `/src/components/dashboard/ConversationDetailPage.tsx`
**Webhook Guide**: `WEBHOOK_INTEGRATION.md`
