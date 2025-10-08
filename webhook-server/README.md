# Webhook Server

This is a standalone Express server for handling WhatsApp webhooks. It is designed to be deployed on a separate platform from the main Next.js application.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. Navigate to the `webhook-server` directory:
   ```bash
   cd webhook-server
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Server

To start the server, run the following command from within the `webhook-server` directory:

```bash
npm start
```

The server will start on port 3001 by default. You can change the port by setting the `PORT` environment variable.

## Building for Production

To compile the TypeScript code to JavaScript, run the following command:

```bash
npm run build
```

The compiled code will be placed in the `dist` directory. You can then run the server from the compiled code:

```bash
node dist/index.js
```