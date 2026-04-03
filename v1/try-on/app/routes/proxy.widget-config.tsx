import type { LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";

const defaultConfig = {
  hue: 120,
  position: "bottom-right",
  isEnabled: false,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json(defaultConfig, {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const currentMerchant = await db.query.merchant.findFirst({
    where: eq(merchant.shopDomain, shop),
  });

  return Response.json(
    currentMerchant
      ? {
          hue: currentMerchant.widgetBtnColorHue,
          position: currentMerchant.widgetPosition,
          isEnabled: currentMerchant.isWidgetEnabled,
        }
      : defaultConfig,
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
};
