import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

import { eq } from "drizzle-orm";
import { session as sessionTable, merchant as merchantTable } from "../db/schema";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.delete(sessionTable).where(eq(sessionTable.shop, shop));
  }

  // Delete the merchant record (Generation records will be cascaded)
  await db.delete(merchantTable).where(eq(merchantTable.shopDomain, shop));

  return new Response();
};
