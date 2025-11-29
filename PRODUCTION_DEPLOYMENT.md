# Production Deployment Guide

## Complete End-to-End WhatsApp Chatbot System

This guide covers the complete production deployment of the Finnegans WhatsApp Chatbot platform with real-time conversations.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Cloud API                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Webhook Backend (Separate Project)                 │
│  • Receives WhatsApp messages                                   │
│  • Executes flow logic                                          │
│  • WebSocket server for real-time updates                       │
│  • Sends messages via Meta API                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database (PostgreSQL)                       │
│  • Shared between frontend and webhook backend                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Application (This Project)                │
│  • Next.js 15 with React 19                                     │
│  • Flow builder UI                                              │
│  • Campaign management                                          │
│  • Real-time conversation viewer                                │
│  • Polling for message updates                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

### This Project (Frontend/Dashboard)
- **Purpose**: Company dashboard for creating flows, managing campaigns, viewing conversations
- **Tech**: Next.js 15, React 19, Prisma, PostgreSQL
- **Deployment**: Vercel, Netlify, or any Node.js hosting

### Webhook Backend (Separate Project)
- **Purpose**: Handle incoming WhatsApp messages, execute flows, WebSocket server
- **Tech**: Node.js/Express, Socket.io, Prisma
- **Deployment**: VPS, EC2, Railway, Render
- **See**: `WEBHOOK_INTEGRATION.md` for detailed implementation guide

## Database Setup

### 1. PostgreSQL Database

Both projects share the same database. Recommended: PostgreSQL 14+

```bash
# Create database
createdb finnegans_chatbots

# Set environment variables
DATABASE_URL="postgresql://user:password@localhost:5432/finnegans_chatbots"
DIRECT_URL="postgresql://user:password@localhost:5432/finnegans_chatbots"
```

### 2. Run Migrations

```bash
# In this project
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed Data (Optional)

```bash
npx prisma db seed
```

## Frontend Application (This Project)

### 1. Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Optional: WebSocket URL (if webhook backend implements WebSockets)
NEXT_PUBLIC_WEBHOOK_WS_URL="wss://your-webhook-backend.com"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Deploy

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 5. Post-Deployment

- Set up environment variables in hosting provider
- Configure custom domain
- Enable HTTPS
- Set up monitoring

## Webhook Backend Setup

See `WEBHOOK_INTEGRATION.md` for complete implementation guide.

### Key Requirements:

1. **Flow Execution**
   - Import and use `executeFlow` from this project
   - Handle incoming WhatsApp messages
   - Match triggers and execute flows
   - Save messages to shared database

2. **WebSocket Server** (For real-time updates)
   - Use Socket.io
   - Implement room-based messaging
   - Emit events for new messages, typing, status updates

3. **Environment Variables**
```env
DATABASE_URL="postgresql://..."
FRONTEND_URL="https://your-dashboard.com"
WEBSOCKET_PORT=3001
META_WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"
```

## Meta WhatsApp Configuration

### 1. Create Meta App

1. Go to https://developers.facebook.com/
2. Create a new Business App
3. Add WhatsApp product
4. Get Phone Number ID and Access Token

### 2. Configure Webhook

1. In Meta Dashboard → WhatsApp → Configuration
2. Set Webhook URL: `https://your-webhook-backend.com/webhook`
3. Set Verify Token: (match your backend)
4. Subscribe to:
   - `messages`
   - `message_status`
   - `message_template_status_update`

### 3. Get Permanent Token

```bash
# Exchange temporary token for permanent one
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
  grant_type=fb_exchange_token&\
  client_id=YOUR_APP_ID&\
  client_secret=YOUR_APP_SECRET&\
  fb_exchange_token=YOUR_TEMPORARY_TOKEN"
```

### 4. Save Credentials

In the frontend dashboard:
1. Go to Settings
2. Enter:
   - Verify Token
   - App Secret
   - Access Token (permanent)
   - Phone Number ID
   - Business Account ID

## Real-Time Conversation Features

### Frontend (This Project)

✅ **Polling**: Automatically refreshes messages every 3 seconds
✅ **Manual Refresh**: Users can manually refresh conversations
✅ **Send Messages**: POST `/api/conversations/:contactId` to send messages
✅ **Message Persistence**: All messages saved to database
✅ **Auto-scroll**: New messages appear automatically
✅ **Message Status**: Shows sent, delivered, read status

### Webhook Backend (To Implement)

Follow `WEBHOOK_INTEGRATION.md` for:
- WebSocket server setup
- Emitting `message:new` events
- Emitting `typing:start` and `typing:stop`
- Emitting `message:status` updates

## Campaign/Broadcast System

### How It Works

1. **Create Broadcast** (Frontend)
   - Select flow to execute
   - Choose recipients
   - Enter optional custom message

2. **Execute Flows** (Automatic)
   - System creates sessions for each contact
   - Calls `executeFlow()` with trigger keyword
   - Sends all flow messages automatically
   - Tracks delivery status

3. **Track Results**
   - View success/failure counts
   - See individual recipient status
   - Access full message history

### Production Optimizations

- Broadcasts process sequentially to avoid rate limits
- Token expiry detection stops broadcast early
- Message persistence for full traceability
- Error logging per recipient

## Monitoring & Logging

### Recommended Tools

- **Application**: Sentry, LogRocket
- **Database**: PgHero, DataDog
- **Uptime**: UptimeRobot, Pingdom
- **Performance**: New Relic, AppSignal

### Key Metrics to Track

- Flow execution success rate
- Message delivery rate
- Average response time
- WebSocket connection count
- Database query performance
- API error rates

### Logs to Monitor

```typescript
// Frontend
- Flow validation errors
- Message send failures
- API authentication errors

// Webhook Backend
- Incoming message volume
- Flow execution errors
- WebSocket connection/disconnection
- Meta API rate limits
- Database connection issues
```

## Security Checklist

### Frontend
- [ ] HTTPS enabled
- [ ] JWT secret is strong and random
- [ ] Environment variables not committed
- [ ] CORS configured properly
- [ ] Input validation on all forms
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection enabled
- [ ] Rate limiting on API endpoints

### Webhook Backend
- [ ] Webhook signature verification enabled
- [ ] Meta App Secret properly configured
- [ ] WebSocket authentication implemented
- [ ] HTTPS for WebSocket connections
- [ ] Rate limiting configured
- [ ] Message deduplication (check waMessageId)
- [ ] Database connection pooling
- [ ] Error handling for all endpoints

### Database
- [ ] Strong passwords
- [ ] Connection encryption (SSL)
- [ ] Regular backups configured
- [ ] Access restricted to application IPs
- [ ] Query logging enabled
- [ ] Performance monitoring active

## Scaling Considerations

### Database
- Use connection pooling (Prisma Accelerate)
- Index frequently queried columns
- Archive old messages periodically
- Consider read replicas for reporting

### Application
- Use CDN for static assets
- Enable Next.js caching
- Implement Redis for session storage
- Queue long-running operations

### Webhook Backend
- Horizontal scaling with load balancer
- Stateless design for WebSocket clustering
- Message queue for flow execution (Bull, BullMQ)
- Separate worker processes for heavy tasks

## Backup & Disaster Recovery

### Database Backups

```bash
# Daily backup script
pg_dump -h localhost -U user -d finnegans_chatbots > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U user -d finnegans_chatbots < backup_20250128.sql
```

### Application Backups

- Git repository (code)
- Environment variables (secure vault)
- Flow definitions (database)
- Message history (database)

## Testing

### Pre-Production Testing

1. **Flow Execution**
   ```bash
   # Test flow execution
   npm run test:flows
   ```

2. **API Endpoints**
   ```bash
   # Test all API endpoints
   npm run test:api
   ```

3. **Integration Tests**
   ```bash
   # Test full flow from webhook to frontend
   npm run test:integration
   ```

4. **Load Testing**
   ```bash
   # Test with Artillery or k6
   artillery quick --count 100 --num 1000 https://your-api.com/webhook
   ```

### Production Health Checks

```typescript
// GET /api/health
{
  "status": "ok",
  "database": "connected",
  "uptime": 86400,
  "version": "1.0.0"
}
```

## Deployment Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Meta webhook configured
- [ ] Permanent access token obtained
- [ ] Test flows created
- [ ] Test broadcast sent successfully
- [ ] WebSocket server running (webhook backend)
- [ ] Monitoring tools configured
- [ ] Backup strategy implemented

### Post-Launch
- [ ] Monitor error logs for 24 hours
- [ ] Test real WhatsApp message flow
- [ ] Verify message delivery
- [ ] Check real-time updates working
- [ ] Validate broadcast functionality
- [ ] Review performance metrics
- [ ] Test conversation UI responsiveness
- [ ] Verify database backups working

## Troubleshooting

### Messages Not Sending

1. Check Meta access token validity
2. Verify Phone Number ID is correct
3. Check user's metaAccessToken in database
4. Review logs for Meta API errors
5. Verify phone number format (E.164)

### Flow Not Executing

1. Check flow status is "Active"
2. Verify trigger keyword matches
3. Review flow-executor logs
4. Check session status in database
5. Validate flow definition JSON

### Real-Time Updates Not Working

1. Verify polling is enabled (3-second interval)
2. Check API endpoint accessibility
3. Review browser console for errors
4. Test WebSocket connection (if implemented)
5. Check firewall rules

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check database server is running
3. Review connection pool settings
4. Check firewall allows connections
5. Verify SSL settings if required

## Support & Maintenance

### Regular Maintenance

- **Daily**: Monitor error logs, check uptime
- **Weekly**: Review performance metrics, analyze slow queries
- **Monthly**: Update dependencies, review security alerts
- **Quarterly**: Load testing, capacity planning

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update non-breaking changes
npm update

# Update major versions carefully
npm install package@latest
```

## Documentation Links

- **Webhook Integration**: `WEBHOOK_INTEGRATION.md`
- **Flow Builder Guide**: `/src/components/flow-builder/README.md` (if exists)
- **API Documentation**: Auto-generated from code
- **Database Schema**: `prisma/schema.prisma`

## Contact & Support

For production issues:
1. Check logs first
2. Review this documentation
3. Check database for session/message status
4. Review Meta Developer Console
5. Contact development team

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
