import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // The Try-On app does not store any customer-identifiable information
  // (PII like name, email, or address).
  // Acknowledge the webhook successfully.

  return new Response("Webhook processed", { status: 200 });
};
