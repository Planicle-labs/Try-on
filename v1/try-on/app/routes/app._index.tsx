import { useState, useCallback, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, useSubmit } from "react-router";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Divider,
  Badge,
  ProgressBar,
  ColorPicker,
  FormLayout,
  TextField,
  Select,
  Grid,
  RangeSlider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";
import { eq } from "drizzle-orm";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { HeadersFunction } from "react-router";

type ColorState = {
  hue: number;
  saturation: number;
  brightness: number;
  alpha?: number;
};

type ButtonContentType = "text" | "emoji" | "image";
type ButtonIconPosition = "none" | "before" | "after";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const hsbToHex = ({ hue, saturation, brightness }: ColorState) => {
  const h = ((hue % 360) + 360) % 360 / 60;
  const s = clamp(saturation, 0, 1);
  const v = clamp(brightness, 0, 1);

  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (h >= 0 && h < 1) {
    red = c;
    green = x;
  } else if (h < 2) {
    red = x;
    green = c;
  } else if (h < 3) {
    green = c;
    blue = x;
  } else if (h < 4) {
    green = x;
    blue = c;
  } else if (h < 5) {
    red = x;
    blue = c;
  } else {
    red = c;
    blue = x;
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const hexToHsb = (hex: string): ColorState => {
  const normalized = hex.replace("#", "").trim();
  if (!normalized) {
    return { hue: 0, saturation: 0, brightness: 1 };
  }

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  const red = parseInt(expanded.slice(0, 2), 16) / 255;
  const green = parseInt(expanded.slice(2, 4), 16) / 255;
  const blue = parseInt(expanded.slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  const saturation = max === 0 ? 0 : delta / max;
  const brightness = max;

  return { hue, saturation, brightness };
};

const normalizeButtonContentType = (value: string | null | undefined): ButtonContentType => {
  if (value === "image" || value === "emoji" || value === "text") {
    return value;
  }

  return "text";
};

const normalizeButtonIconPosition = (value: string | null | undefined): ButtonIconPosition => {
  if (value === "before" || value === "after" || value === "none") {
    return value;
  }

  return "none";
};

const normalizeButtonIcon = (value: string | null | undefined) => {
  const trimmed = (value || "").trim();
  return trimmed || "none";
};

const getButtonMetrics = (size: number, radius: number, isIconOnly: boolean) => {
  const normalizedSize = clamp(size, 0, 100);
  const scale = normalizedSize / 100;
  const fontSize = Math.round(14 + scale * 8);
  const paddingY = Math.round(10 + scale * 6);
  const paddingX = Math.round(14 + scale * 14);
  const iconOnlySize = Math.round(34 + scale * 28);
  const height = isIconOnly ? iconOnlySize : Math.max(fontSize + paddingY * 2, 40);
  const width = isIconOnly ? iconOnlySize : "auto";
  const borderRadius = Math.round((Math.min(height, isIconOnly ? iconOnlySize : height) / 2) * (clamp(radius, 0, 100) / 100));

  return {
    fontSize,
    paddingY,
    paddingX,
    iconOnlySize,
    height,
    width,
    borderRadius,
  };
};

const resolveButtonRenderMode = (
  contentType: ButtonContentType,
  radius: number,
  size: number,
  icon: string
) => {
  const iconOnly = contentType !== "text";
  const effectiveContentType = contentType;
  const metrics = getButtonMetrics(size, radius, iconOnly);

  return {
    iconOnly,
    effectiveContentType,
    metrics,
    icon,
  };
};

const normalizeButtonConfig = (merchantRecord: typeof merchant.$inferSelect) => {
  const radius = clamp(merchantRecord.widgetButtonRadius ?? 12, 0, 100);
  const size = clamp(merchantRecord.widgetButtonSize ?? 56, 0, 100);
  const contentType = normalizeButtonContentType(
    merchantRecord.widgetButtonContentType
  );
  const icon = normalizeButtonIcon(merchantRecord.widgetButtonIcon);
  const iconPosition = normalizeButtonIconPosition(merchantRecord.widgetButtonIconPosition);

  return {
    buttonText: merchantRecord.widgetButtonText || "Try It On",
    buttonEmoji: merchantRecord.widgetButtonEmoji || "👀",
    buttonImageUrl: merchantRecord.widgetButtonImageUrl || "",
    buttonIcon: icon,
    buttonIconPosition: icon === "none" ? "none" : iconPosition === "none" ? "after" : iconPosition,
    buttonRadius: radius,
    buttonSize: size,
    buttonContentType: contentType,
    buttonTextColor: merchantRecord.widgetButtonTextColor || "#FFFFFF",
    buttonColor: {
      hue: merchantRecord.widgetBtnColorHue ?? 120,
      saturation: merchantRecord.widgetBtnColorSaturation ?? 1,
      brightness: merchantRecord.widgetBtnColorBrightness ?? 1,
    },
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let currentMerchant = await db.query.merchant.findFirst({
    where: eq(merchant.shopDomain, shop),
  });

  if (!currentMerchant) {
    // If not exists, insert a default one for this demo/setup phase
    const [inserted] = await db.insert(merchant).values({
      shopDomain: shop,
      accessToken: session.accessToken || "",
      plan: "free",
      isActive: true,
      updatedAt: new Date()
    }).returning();
    currentMerchant = inserted;
  }

  // Mocked stats for the design prototype
  return { 
    merchant: currentMerchant, 
    stats: {
      usedGenerations: 12,
      totalGenerations: 50,
      daysLeftInTrial: 5
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const hue = parseInt(formData.get("btnColorHue") as string, 10);
  const saturation = parseFloat(formData.get("btnColorSaturation") as string);
  const brightness = parseFloat(formData.get("btnColorBrightness") as string);
  const position = formData.get("position") as string;
  const isEnabled = formData.get("isEnabled") === "true";
  const buttonText = (formData.get("buttonText") as string) || "Try It On";
  const buttonEmoji = (formData.get("buttonEmoji") as string) || "👀";
  const buttonImageUrl = (formData.get("buttonImageUrl") as string) || null;
  const buttonContentTypeInput = normalizeButtonContentType(
    formData.get("buttonContentType") as string | null
  );
  const buttonIcon = normalizeButtonIcon(formData.get("buttonIcon") as string | null);
  const buttonIconPosition = normalizeButtonIconPosition(
    formData.get("buttonIconPosition") as string | null
  );
  const buttonSize = clamp(parseInt(formData.get("buttonSize") as string, 10), 0, 100);
  const buttonRadius = clamp(parseInt(formData.get("buttonRadius") as string, 10), 0, 100);
  const buttonTextColor = (formData.get("buttonTextColor") as string) || "#FFFFFF";

  await db.update(merchant)
    .set({
      widgetBtnColorHue: hue,
      widgetBtnColorSaturation: Number.isFinite(saturation) ? saturation : 1,
      widgetBtnColorBrightness: Number.isFinite(brightness) ? brightness : 1,
      widgetPosition: position,
      isWidgetEnabled: isEnabled,
      widgetButtonText: buttonText,
      widgetButtonEmoji: buttonEmoji,
      widgetButtonImageUrl: buttonImageUrl,
      widgetButtonContentType: buttonContentTypeInput,
      widgetButtonIcon: buttonIcon,
      widgetButtonIconPosition: buttonIconPosition,
      widgetButtonSize: Number.isFinite(buttonSize) ? buttonSize : 56,
      widgetButtonRadius: Number.isFinite(buttonRadius) ? buttonRadius : 12,
      widgetButtonTextColor: buttonTextColor,
      updatedAt: new Date(),
    })
    .where(eq(merchant.shopDomain, session.shop));

  return { success: true };
};

export default function Index() {
  const { merchant, stats } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const isSaving = navigation.state === "submitting";
  const merchantButtonConfig = normalizeButtonConfig(merchant);

  // Widget settings state
  const [btnColor, setBtnColor] = useState({
    hue: merchantButtonConfig.buttonColor.hue,
    brightness: merchantButtonConfig.buttonColor.brightness,
    saturation: merchantButtonConfig.buttonColor.saturation,
  });
  const [position, setPosition] = useState(merchant.widgetPosition ?? "bottom-right");
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(merchant.isWidgetEnabled ?? false);
  const [buttonText, setButtonText] = useState(merchantButtonConfig.buttonText);
  const [buttonEmoji, setButtonEmoji] = useState(merchantButtonConfig.buttonEmoji);
  const [buttonImageUrl, setButtonImageUrl] = useState(merchantButtonConfig.buttonImageUrl);
  const [buttonContentType, setButtonContentType] = useState(merchantButtonConfig.buttonContentType);
  const [buttonIcon, setButtonIcon] = useState(merchantButtonConfig.buttonIcon);
  const [buttonIconPosition, setButtonIconPosition] = useState(merchantButtonConfig.buttonIconPosition);
  const [buttonImageSource, setButtonImageSource] = useState(
    merchantButtonConfig.buttonImageUrl.startsWith("data:") ? "upload" : "url"
  );
  const [buttonSize, setButtonSize] = useState(merchantButtonConfig.buttonSize ?? 56);
  const [buttonRadius, setButtonRadius] = useState(merchantButtonConfig.buttonRadius ?? 12);
  const [buttonTextColor, setButtonTextColor] = useState(hexToHsb(merchantButtonConfig.buttonTextColor));

  const persistSettings = useCallback((enabledOverride?: boolean) => {
    const formData = new FormData();
    formData.append("btnColorHue", btnColor.hue.toString());
    formData.append("btnColorSaturation", btnColor.saturation.toString());
    formData.append("btnColorBrightness", btnColor.brightness.toString());
    formData.append("position", position);
    formData.append("isEnabled", (enabledOverride ?? isWidgetEnabled).toString());
    formData.append("buttonText", buttonText);
    formData.append("buttonEmoji", buttonEmoji);
    formData.append("buttonImageUrl", buttonImageUrl);
    formData.append("buttonContentType", buttonContentType);
    formData.append("buttonIcon", buttonIcon);
    formData.append("buttonIconPosition", buttonIconPosition);
    formData.append("buttonSize", buttonSize.toString());
    formData.append("buttonRadius", buttonRadius.toString());
    formData.append("buttonTextColor", hsbToHex(buttonTextColor));
    submit(formData, { method: "post" });
    shopify.toast.show("Settings saved successfully");
  }, [btnColor.hue, btnColor.saturation, btnColor.brightness, position, isWidgetEnabled, buttonText, buttonEmoji, buttonImageUrl, buttonContentType, buttonIcon, buttonIconPosition, buttonSize, buttonRadius, buttonTextColor, submit, shopify]);

  const handleSaveSettings = useCallback(() => {
    persistSettings();
  }, [persistSettings]);

  const toggleWidget = useCallback(() => {
    const nextValue = !isWidgetEnabled;
    setIsWidgetEnabled(nextValue);
    persistSettings(nextValue);
  }, [isWidgetEnabled, persistSettings]);

  const handleImageUpload = useCallback((file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setButtonImageUrl(String(reader.result || ""));
      setButtonImageSource("upload");
    };
    reader.readAsDataURL(file);
  }, []);

  const progressPercentage = (stats.usedGenerations / stats.totalGenerations) * 100;
  const {
    iconOnly: previewIsIconOnly,
    effectiveContentType: previewContentType,
    metrics: previewMetrics,
  } = resolveButtonRenderMode(buttonContentType, buttonRadius, buttonSize, buttonIcon);
  const previewButtonStyle = {
    backgroundColor: hsbToHex(btnColor),
    borderRadius: `${previewMetrics.borderRadius}px`,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: buttonContentType === "text" && buttonIconPosition !== "none" && !previewIsIconOnly ? "6px" : "0",
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    color: buttonContentType === "text" ? hsbToHex(buttonTextColor) : "inherit",
    padding: previewIsIconOnly
      ? "0"
      : `${previewMetrics.paddingY}px ${previewMetrics.paddingX}px`,
    minWidth: previewIsIconOnly ? `${previewMetrics.iconOnlySize}px` : "fit-content",
    width: previewIsIconOnly ? `${previewMetrics.iconOnlySize}px` : "auto",
    height: previewIsIconOnly ? `${previewMetrics.iconOnlySize}px` : "auto",
    overflow: "hidden",
    fontSize: `${previewMetrics.fontSize}px`,
    lineHeight: 1,
  } as const;

  const previewIconNode =
    buttonIcon !== "none" ? (
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
        {buttonIcon}
      </span>
    ) : null;

  const previewContent =
    previewContentType === "image" ? buttonImageUrl ? (
      <img
        src={buttonImageUrl}
        alt={buttonText || "Button icon"}
        width={Math.max(20, previewMetrics.fontSize)}
        height={Math.max(20, previewMetrics.fontSize)}
        style={{ objectFit: "cover", borderRadius: "9999px", display: "block" }}
      />
    ) : (
      <span aria-hidden="true">{buttonEmoji || "👀"}</span>
    ) : previewContentType === "emoji" ? (
      <span aria-hidden="true">{buttonEmoji || "👀"}</span>
    ) : buttonIconPosition === "before" ? (
      <>
        {previewIconNode && previewIconNode}
        <span>{buttonText || "Try It On"}</span>
      </>
    ) : buttonIconPosition === "after" ? (
      <>
        <span>{buttonText || "Try It On"}</span>
        {previewIconNode && previewIconNode}
      </>
    ) : (
      <span>{buttonText || "Try It On"}</span>
    );

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Layout>
          {/* Welcome & Quota Section */}
          <Layout.Section>
            <BlockStack gap="400">
              <Card roundedAbove="sm">
                <Box paddingBlockEnd="400">
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingXl" as="h2">
                        Welcome to Planicle Try-On! 🎉
                      </Text>
                      {isWidgetEnabled ? (
                        <Badge tone="success">Active on storefront</Badge>
                      ) : (
                        <Badge tone="critical">Disabled on storefront</Badge>
                      )}
                    </InlineStack>
                    <Text variant="bodyLg" as="p" tone="subdued">
                      Your virtual try-on widget is ready to boost your conversions. Customize the appearance below or check your latest generation stats.
                    </Text>
                    <Box paddingBlockStart="200">
                      <InlineStack gap="300">
                        <Button variant="primary" onClick={toggleWidget}>
                          {isWidgetEnabled ? "Disable Widget" : "Enable Widget"}
                        </Button>
                        <Button
                          url={`https://${merchant.shopDomain}?try_on_preview=1`}
                          target="_blank"
                        >
                          Test on Storefront
                        </Button>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </Box>
              </Card>

              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">
                          Monthly Quota
                        </Text>
                        <Badge tone={merchant.plan === "free" ? "attention" : "success"}>
                          {`${merchant.plan.charAt(0).toUpperCase() + merchant.plan.slice(1)} Plan`}
                        </Badge>
                      </InlineStack>
                      <Divider />
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="p">
                          <Text fontWeight="bold" as="span">{stats.usedGenerations}</Text> of {stats.totalGenerations} generations used
                        </Text>
                        <ProgressBar progress={progressPercentage} tone="primary" />
                        {merchant.plan === "free" && (
                          <Box paddingBlockStart="200">
                            <Button variant="primary" fullWidth>Upgrade Plan</Button>
                          </Box>
                        )}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
                
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <Text variant="headingMd" as="h3">
                         Next Steps
                      </Text>
                      <Divider />
                      <BlockStack gap="200">
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          <Badge tone="success">Done</Badge>
                          <Text as="span">Install application</Text>
                        </InlineStack>
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          {isWidgetEnabled ? <Badge tone="success">Done</Badge> : <Badge tone="info">Pending</Badge>}
                          <Text as="span">Enable Try-On widget</Text>
                        </InlineStack>
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          <Badge tone="info">Pending</Badge>
                          <Text as="span">Explore premium plans</Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="400">
              <Card roundedAbove="sm">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h3">
                        Widget Customization
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Shape, color, copy, and media all in one place.
                      </Text>
                    </BlockStack>
                    <Badge tone={isWidgetEnabled ? "success" : "critical"}>
                      {isWidgetEnabled ? "Live on storefront" : "Disabled"}
                    </Badge>
                  </InlineStack>

                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                      <Card roundedAbove="sm">
                        <BlockStack gap="400">
                          <Text variant="headingSm" as="h4">
                            Content
                          </Text>
                          <FormLayout>
                            <Select
                              label="Button Content Type"
                              options={[
                                { label: "Text", value: "text" },
                                { label: "Emoji", value: "emoji" },
                                { label: "Image", value: "image" },
                              ]}
                              onChange={(value) => setButtonContentType(normalizeButtonContentType(value))}
                              value={buttonContentType}
                            />

                            {buttonContentType === "text" && (
                              <BlockStack gap="300">
                                <TextField
                                  label="Button Text"
                                  value={buttonText}
                                  onChange={setButtonText}
                                  autoComplete="off"
                                />
                                <Select
                                  label="Button Icon"
                                  options={[
                                    { label: "No icon", value: "none" },
                                    { label: "Eye", value: "👀" },
                                    { label: "Sparkles", value: "✨" },
                                    { label: "Star", value: "⭐" },
                                    { label: "Heart", value: "💖" },
                                    { label: "Fire", value: "🔥" },
                                    { label: "Bolt", value: "⚡" },
                                    { label: "Arrow", value: "➜" },
                                  ]}
                                  onChange={(value) => {
                                    const nextIcon = normalizeButtonIcon(value);
                                    setButtonIcon(nextIcon);
                                    setButtonIconPosition(nextIcon === "none" ? "none" : buttonIconPosition === "none" ? "after" : buttonIconPosition);
                                  }}
                                  value={buttonIcon}
                                />
                                {buttonIcon !== "none" && (
                                  <Select
                                    label="Icon Position"
                                    options={[
                                      { label: "Before text", value: "before" },
                                      { label: "After text", value: "after" },
                                    ]}
                                    onChange={(value) => setButtonIconPosition(normalizeButtonIconPosition(value))}
                                    value={buttonIconPosition}
                                  />
                                )}
                              </BlockStack>
                            )}

                            {buttonContentType === "text" && (
                              <Box>
                                <BlockStack gap="200">
                                  <Text as="p" variant="bodyMd">
                                    Button Text Color
                                  </Text>
                                  <ColorPicker onChange={setButtonTextColor} color={buttonTextColor} />
                                </BlockStack>
                              </Box>
                            )}

                            {buttonContentType === "emoji" && (
                              <TextField
                                label="Button Emoji"
                                value={buttonEmoji}
                                onChange={setButtonEmoji}
                                autoComplete="off"
                                helpText="Use a single emoji for compact pill buttons."
                              />
                            )}

                            {buttonContentType === "image" && (
                              <BlockStack gap="300">
                                <Select
                                  label="Image Source"
                                  options={[
                                    { label: "Upload file", value: "upload" },
                                    { label: "Use image URL", value: "url" },
                                  ]}
                                  onChange={setButtonImageSource}
                                  value={buttonImageSource}
                                />

                                {buttonImageSource === "upload" ? (
                                  <BlockStack gap="200">
                                    <input
                                      ref={imageInputRef}
                                      type="file"
                                      accept="image/*"
                                      hidden
                                      onChange={(event) => {
                                        const file = event.currentTarget.files?.[0] || null;
                                        handleImageUpload(file);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    <Button onClick={() => imageInputRef.current?.click()}>
                                      Choose image file
                                    </Button>
                                    {buttonImageUrl && (
                                      <Button
                                        variant="plain"
                                        onClick={() => {
                                          setButtonImageUrl("");
                                        }}
                                      >
                                        Clear image
                                      </Button>
                                    )}
                                    <Text variant="bodySm" as="p" tone="subdued">
                                      {buttonImageUrl ? "Uploaded image selected." : "No file selected yet."}
                                    </Text>
                                  </BlockStack>
                                ) : (
                                  <TextField
                                    label="Button Image URL"
                                    value={buttonImageUrl}
                                    onChange={setButtonImageUrl}
                                    autoComplete="off"
                                    helpText="Paste any publicly accessible image URL."
                                  />
                                )}
                              </BlockStack>
                            )}
                          </FormLayout>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>

                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                      <Card roundedAbove="sm">
                        <BlockStack gap="400">
                          <Text variant="headingSm" as="h4">
                            Appearance
                          </Text>
                          <Grid>
                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 7, xl: 7 }}>
                              <BlockStack gap="300">
                                <Select
                                  label="Widget Position"
                                  options={[
                                    { label: "Bottom right", value: "bottom-right" },
                                    { label: "Bottom left", value: "bottom-left" },
                                    { label: "Center left", value: "middle-left" },
                                  ]}
                                  onChange={setPosition}
                                  value={position}
                                />

                                <RangeSlider
                                  label="Button Size"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={buttonSize}
                                  onChange={(value) => setButtonSize(Number(value))}
                                  output
                                />
                                <Text variant="bodySm" as="p" tone="subdued">
                                  {buttonSize <= 20
                                    ? "Compact"
                                    : buttonSize >= 80
                                      ? "Large"
                                      : `${buttonSize}% size`}
                                </Text>

                                <RangeSlider
                                  label="Button Roundness"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={buttonRadius}
                                  onChange={(value) => setButtonRadius(Number(value))}
                                  output
                                />
                                <Text variant="bodySm" as="p" tone="subdued">
                                  {buttonRadius <= 10
                                    ? "Square"
                                    : buttonRadius >= 100
                                      ? "Full round"
                                      : `${buttonRadius}% round`}
                                </Text>
                              </BlockStack>
                            </Grid.Cell>

                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 5, xl: 5 }}>
                              <BlockStack gap="200">
                                <Text as="p" variant="bodyMd">
                                  Primary Button Color
                                </Text>
                                <ColorPicker onChange={setBtnColor} color={btnColor} />
                              </BlockStack>
                            </Grid.Cell>
                          </Grid>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>

                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                      <Card roundedAbove="sm">
                        <BlockStack gap="400">
                          <Text variant="headingSm" as="h4">
                            Final Preview
                          </Text>
                          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="300" inlineAlign="center">
                              <div style={previewButtonStyle}>{previewContent}</div>
                              <Text variant="bodySm" as="p" tone="subdued">
                                Position: {position.replace("-", " ")}
                              </Text>
                              <Text variant="bodySm" as="p" tone="subdued">
                                Size: {buttonSize <= 20 ? "Compact" : buttonSize >= 80 ? "Large" : `${buttonSize}%`}
                              </Text>
                              <Text variant="bodySm" as="p" tone="subdued">
                                {previewContentType === "text"
                                  ? "Text button"
                                  : previewContentType === "emoji"
                                    ? "Emoji button"
                                    : "Image button"}
                              </Text>
                              {previewIsIconOnly && buttonContentType === "text" && (
                                <Text variant="bodySm" as="p" tone="critical">
                                  Full round mode uses icon-only rendering.
                                </Text>
                              )}
                            </BlockStack>
                          </Box>

                          <Button
                            onClick={handleSaveSettings}
                            variant="primary"
                            loading={isSaving}
                          >
                            Save settings
                          </Button>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                  </Grid>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
