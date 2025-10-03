This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

Create a `.env.local` file in the project root (or configure the variables in your hosting provider) with at least the following keys:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # Optional, used for Prisma accelerated connections
JWT_SECRET="a-long-random-string"
```

WhatsApp Business credentials (`metaVerifyToken`, `metaAppSecret`, `metaAccessToken`, and `metaPhoneNumberId`) are stored per user through the dashboard settings UI. These values are required for both webhook verification and message delivery, so make sure to fill them in before connecting your Meta app.

## Getting started locally

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## WhatsApp webhook setup

1. Deploy the project (locally or to a provider such as Vercel).
2. Configure the verify token in your Meta App dashboard and set the same value in **Dashboard → Settings → WhatsApp Cloud**.
3. Point the WhatsApp callback URL to `<your-domain>/api/webhook`.
4. Once the webhook is verified, confirm that the WhatsApp Business API credentials are filled in **Dashboard → Settings** so incoming messages can be processed.

The webhook route is forced to run on the Node.js runtime and marked as dynamic so it works correctly in serverless environments like Vercel.

Incoming messages automatically create/update contacts, resume the corresponding flow session and persist a snapshot of the conversation context in the `Log` table so the dashboard metrics and activity feeds stay up to date.
