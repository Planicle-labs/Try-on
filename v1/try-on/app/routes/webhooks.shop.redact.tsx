import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

import { eq } from "drizzle-orm";
import { merchant as merchantTable } from "../db/schema";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // This webhook is triggered 48 hours after app uninstall.
  // We ensure any merchant data associated with the shop is wiped out.
  await db.delete(merchantTable).where(eq(merchantTable.shopDomain, shop));

  return new Response("Webhook processed", { status: 200 });
};
