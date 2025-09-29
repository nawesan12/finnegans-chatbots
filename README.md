This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

Create a `.env.local` file in the project root (or configure the variables in your hosting provider) with at least the following keys:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # Optional, used for Prisma accelerated connections
JWT_SECRET="a-long-random-string"
META_VERIFY_TOKEN="the-token-you-configured-in-meta"
# Optional global WhatsApp Cloud API credentials (used as fallbacks)
META_APP_SECRET="your-meta-app-secret"
META_ACCESS_TOKEN="whatsapp-cloud-access-token"
META_PHONE_NUMBER_ID="your-phone-number-id"
META_BUSINESS_ACCOUNT_ID="your-waba-id"
# Alternative variable names also supported (legacy deployments):
# - META_VERIFY_TOKEN: WHATSAPP_VERIFY_TOKEN, VERIFY_TOKEN
# - META_APP_SECRET: WHATSAPP_APP_SECRET, APP_SECRET_KEY
# - META_ACCESS_TOKEN: WHATSAPP_KEY, ACCESS_TOKEN
# - META_PHONE_NUMBER_ID: WHATSAPP_NUMBER_ID
# - META_BUSINESS_ACCOUNT_ID: ACCOUNT_NUMBER_ID
```

The app stores the WhatsApp Business credentials (`metaAppSecret`, `metaAccessToken`, and `metaPhoneNumberId`) per user through the dashboard settings UI. The environment variables above act as a global fallback, which is useful for single-tenant deployments or quick testing without filling the settings UI. If both are provided, the per-user configuration always takes precedence.

## Getting started locally

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## WhatsApp webhook setup

1. Deploy the project (locally or to a provider such as Vercel).
2. Configure the verify token in your Meta App dashboard and set the same value in the `META_VERIFY_TOKEN` environment variable.
3. Point the WhatsApp callback URL to `<your-domain>/api/webhook`.
4. Once the webhook is verified, add the WhatsApp Business API credentials in **Dashboard → Settings** so incoming messages can be processed. Alternatively, you can rely on the global environment variables described above for a single account deployment.

The webhook route is forced to run on the Node.js runtime and marked as dynamic so it works correctly in serverless environments like Vercel.

Incoming messages automatically create/update contacts, resume the corresponding flow session and persist a snapshot of the conversation context in the `Log` table so the dashboard metrics and activity feeds stay up to date.
