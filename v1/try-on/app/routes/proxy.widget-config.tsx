import type { LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";

const defaultConfig = {
  hue: 120,
  saturation: 1,
  brightness: 1,
  position: "bottom-right",
  isEnabled: false,
  buttonText: "Try It On",
  buttonEmoji: "👀",
  buttonImageUrl: "",
  buttonIcon: "none",
  buttonIconPosition: "none",
  buttonSize: 56,
  buttonContentType: "text",
  buttonRadius: 12,
  buttonTextColor: "#FFFFFF",
};

const normalizeContentType = (value: string | null | undefined) => {
  if (value === "text" || value === "emoji" || value === "image") {
    return value;
  }

  return "text";
};

const normalizeIcon = (value: string | null | undefined) => {
  const trimmed = (value || "").trim();
  return trimmed || "none";
};

const normalizeIconPosition = (icon: string, value: string | null | undefined) => {
  if (icon === "none") {
    return "none";
  }

  if (value === "before" || value === "after") {
    return value;
  }

  return "after";
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
          ...defaultConfig,
          hue: currentMerchant.widgetBtnColorHue ?? defaultConfig.hue,
          saturation: currentMerchant.widgetBtnColorSaturation ?? defaultConfig.saturation,
          brightness: currentMerchant.widgetBtnColorBrightness ?? defaultConfig.brightness,
          position: currentMerchant.widgetPosition || defaultConfig.position,
          isEnabled: currentMerchant.isWidgetEnabled ?? defaultConfig.isEnabled,
          buttonText: currentMerchant.widgetButtonText || defaultConfig.buttonText,
          buttonEmoji: currentMerchant.widgetButtonEmoji || defaultConfig.buttonEmoji,
          buttonImageUrl: currentMerchant.widgetButtonImageUrl || defaultConfig.buttonImageUrl,
          buttonIcon: normalizeIcon(currentMerchant.widgetButtonIcon),
          buttonIconPosition: normalizeIconPosition(
            normalizeIcon(currentMerchant.widgetButtonIcon),
            currentMerchant.widgetButtonIconPosition
          ),
          buttonSize: currentMerchant.widgetButtonSize ?? defaultConfig.buttonSize,
          buttonContentType: normalizeContentType(currentMerchant.widgetButtonContentType),
          buttonRadius: currentMerchant.widgetButtonRadius ?? defaultConfig.buttonRadius,
          buttonTextColor: currentMerchant.widgetButtonTextColor || defaultConfig.buttonTextColor,
        }
      : defaultConfig,
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
};
