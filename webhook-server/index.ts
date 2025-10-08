import express, { Request, Response, NextFunction } from "express";
import {
  processWebhookGet,
  processWebhookPost,
  processWebhookOptions,
  type WebhookRequest,
  type WebhookResponse,
} from "../src/server/webhook-logic";

const app = express();
const port = process.env.PORT || 3001;

// Middleware to read the raw body, which is needed for signature verification
app.use(express.text({ type: "application/json" }));

async function toWebhookRequest(req: Request): Promise<WebhookRequest> {
  return {
    headers: req.headers,
    query: req.query,
    body: typeof req.body === "string" ? req.body : "",
    url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
  };
}

function fromWebhookResponse(res: Response, webhookResponse: WebhookResponse) {
  if (webhookResponse.headers) {
    res.set(webhookResponse.headers);
  }

  res.status(webhookResponse.status);

  if (webhookResponse.json) {
    res.json(webhookResponse.json);
  } else if (webhookResponse.text) {
    res.send(webhookResponse.text);
  } else {
    res.send();
  }
}

app.get("/api/webhook", async (req: Request, res: Response) => {
  const webhookRequest = await toWebhookRequest(req);
  const webhookResponse = await processWebhookGet(webhookRequest);
  fromWebhookResponse(res, webhookResponse);
});

app.post("/api/webhook", async (req: Request, res: Response) => {
  const webhookRequest = await toWebhookRequest(req);
  const webhookResponse = await processWebhookPost(webhookRequest);
  fromWebhookResponse(res, webhookResponse);
});

app.options("/api/webhook", async (req: Request, res: Response) => {
  const webhookRequest = await toWebhookRequest(req);
  const webhookResponse = await processWebhookOptions(webhookRequest);
  fromWebhookResponse(res, webhookResponse);
});

app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});