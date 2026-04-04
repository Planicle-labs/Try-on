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
  Banner,
  Icon,
  InlineGrid,
  ButtonGroup,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ViewIcon,
  ArrowRightIcon,
  WandIcon,
  StarFilledIcon,
  HeartIcon,
  ConfettiIcon,
  MinusCircleIcon,
  EyeglassesIcon,
  ImageMagicIcon,
  CameraFlipIcon,
  TargetIcon,
  MagicIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";
import { eq } from "drizzle-orm";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { HeadersFunction } from "react-router";

/* ──────────────────────────────────────────────────────────
   Color helpers
   ────────────────────────────────────────────────────────── */

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
  const h = (((hue % 360) + 360) % 360) / 60;
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

/* ──────────────────────────────────────────────────────────
   Button normalizers
   ────────────────────────────────────────────────────────── */

const normalizeButtonContentType = (
  value: string | null | undefined
): ButtonContentType => {
  if (value === "image" || value === "emoji" || value === "text") return value;
  return "text";
};

const normalizeButtonIconPosition = (
  value: string | null | undefined
): ButtonIconPosition => {
  if (value === "before" || value === "after" || value === "none") return value;
  return "none";
};

const normalizeButtonIcon = (value: string | null | undefined) => {
  const trimmed = (value || "").trim();
  return trimmed || "none";
};

/* ──────────────────────────────────────────────────────────
   Icon picker options
   ────────────────────────────────────────────────────────── */

const BUTTON_ICON_OPTIONS = [
  { value: "none",       label: "None",       icon: MinusCircleIcon },
  { value: "arrow",      label: "Arrow",      icon: ArrowRightIcon  },
  { value: "tryon",      label: "Try-On",     icon: EyeglassesIcon  },
  { value: "magic",      label: "Magic",      icon: MagicIcon        },
  { value: "wand",       label: "Wand",       icon: WandIcon         },
  { value: "camera",     label: "Mirror",     icon: CameraFlipIcon   },
  { value: "aimagemagic",label: "AI",         icon: ImageMagicIcon   },
  { value: "target",     label: "Target",     icon: TargetIcon       },
];

const getButtonMetrics = (
  size: number,
  radius: number,
  isIconOnly: boolean
) => {
  const normalizedSize = clamp(size, 0, 100);
  const scale = normalizedSize / 100;
  const fontSize = Math.round(14 + scale * 8);
  const paddingY = Math.round(10 + scale * 6);
  const paddingX = Math.round(14 + scale * 14);
  const iconOnlySize = Math.round(34 + scale * 28);
  const height = isIconOnly
    ? iconOnlySize
    : Math.max(fontSize + paddingY * 2, 40);
  const width = isIconOnly ? iconOnlySize : "auto";
  const borderRadius = Math.round(
    (Math.min(height, isIconOnly ? iconOnlySize : height) / 2) *
      (clamp(radius, 0, 100) / 100)
  );

  return { fontSize, paddingY, paddingX, iconOnlySize, height, width, borderRadius };
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
  return { iconOnly, effectiveContentType, metrics, icon };
};

const normalizeButtonConfig = (merchantRecord: typeof merchant.$inferSelect) => {
  const radius = clamp(merchantRecord.widgetButtonRadius ?? 12, 0, 100);
  const size = clamp(merchantRecord.widgetButtonSize ?? 56, 0, 100);
  const contentType = normalizeButtonContentType(
    merchantRecord.widgetButtonContentType
  );
  const icon = normalizeButtonIcon(merchantRecord.widgetButtonIcon);
  const iconPosition = normalizeButtonIconPosition(
    merchantRecord.widgetButtonIconPosition
  );

  return {
    buttonText: merchantRecord.widgetButtonText || "Try It On",
    buttonEmoji: merchantRecord.widgetButtonEmoji || "👀",
    buttonImageUrl: merchantRecord.widgetButtonImageUrl || "",
    buttonIcon: icon,
    buttonIconPosition:
      icon === "none"
        ? "none"
        : iconPosition === "none"
          ? "after"
          : iconPosition,
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

/* ──────────────────────────────────────────────────────────
   Loader / Action
   ────────────────────────────────────────────────────────── */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let currentMerchant = await db.query.merchant.findFirst({
    where: eq(merchant.shopDomain, shop),
  });

  if (!currentMerchant) {
    const [inserted] = await db
      .insert(merchant)
      .values({
        shopDomain: shop,
        accessToken: session.accessToken || "",
        plan: "free",
        isActive: true,
        hasCustomizedWidget: false,
        updatedAt: new Date(),
      })
      .returning();
    currentMerchant = inserted;
  }

  return {
    merchant: currentMerchant,
    stats: {
      usedGenerations: 12,
      totalGenerations: 50,
      daysLeftInTrial: 5,
    },
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
  const buttonIcon = normalizeButtonIcon(
    formData.get("buttonIcon") as string | null
  );
  const buttonIconPosition = normalizeButtonIconPosition(
    formData.get("buttonIconPosition") as string | null
  );
  const buttonSize = clamp(
    parseInt(formData.get("buttonSize") as string, 10),
    0,
    100
  );
  const buttonRadius = clamp(
    parseInt(formData.get("buttonRadius") as string, 10),
    0,
    100
  );
  const buttonTextColor =
    (formData.get("buttonTextColor") as string) || "#FFFFFF";

  await db
    .update(merchant)
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
      hasCustomizedWidget: true,
      updatedAt: new Date(),
    })
    .where(eq(merchant.shopDomain, session.shop));

  return { success: true };
};

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

export default function Index() {
  const { merchant: merchantData, stats } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isSaving = navigation.state === "submitting";
  const merchantButtonConfig = normalizeButtonConfig(merchantData);

  // ── State ──
  const [btnColor, setBtnColor] = useState({
    hue: merchantButtonConfig.buttonColor.hue,
    brightness: merchantButtonConfig.buttonColor.brightness,
    saturation: merchantButtonConfig.buttonColor.saturation,
  });
  const [position, setPosition] = useState(
    merchantData.widgetPosition ?? "bottom-right"
  );
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(
    merchantData.isWidgetEnabled ?? false
  );
  const [buttonText, setButtonText] = useState(merchantButtonConfig.buttonText);
  const [buttonEmoji, setButtonEmoji] = useState(
    merchantButtonConfig.buttonEmoji
  );
  const [buttonImageUrl, setButtonImageUrl] = useState(
    merchantButtonConfig.buttonImageUrl
  );
  const [buttonContentType, setButtonContentType] = useState(
    merchantButtonConfig.buttonContentType
  );
  const [buttonIcon, setButtonIcon] = useState(merchantButtonConfig.buttonIcon);
  const [buttonIconPosition, setButtonIconPosition] = useState(
    merchantButtonConfig.buttonIconPosition
  );
  const [buttonImageSource, setButtonImageSource] = useState(
    merchantButtonConfig.buttonImageUrl.startsWith("data:") ? "upload" : "url"
  );
  const [buttonSize, setButtonSize] = useState(
    merchantButtonConfig.buttonSize ?? 56
  );
  const [buttonRadius, setButtonRadius] = useState(
    merchantButtonConfig.buttonRadius ?? 12
  );
  const [buttonTextColor, setButtonTextColor] = useState(
    hexToHsb(merchantButtonConfig.buttonTextColor)
  );

  // ── Callbacks ──
  const persistSettings = useCallback(
    (enabledOverride?: boolean) => {
      const formData = new FormData();
      formData.append("btnColorHue", btnColor.hue.toString());
      formData.append("btnColorSaturation", btnColor.saturation.toString());
      formData.append("btnColorBrightness", btnColor.brightness.toString());
      formData.append("position", position);
      formData.append(
        "isEnabled",
        (enabledOverride ?? isWidgetEnabled).toString()
      );
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
      shopify.toast.show("Settings saved");
    },
    [
      btnColor,
      position,
      isWidgetEnabled,
      buttonText,
      buttonEmoji,
      buttonImageUrl,
      buttonContentType,
      buttonIcon,
      buttonIconPosition,
      buttonSize,
      buttonRadius,
      buttonTextColor,
      submit,
      shopify,
    ]
  );

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

  // ── Derived ──
  const progressPercentage =
    (stats.usedGenerations / stats.totalGenerations) * 100;
  const planLabel =
    merchantData.plan.charAt(0).toUpperCase() + merchantData.plan.slice(1);

  const {
    iconOnly: previewIsIconOnly,
    effectiveContentType: previewContentType,
    metrics: previewMetrics,
  } = resolveButtonRenderMode(
    buttonContentType,
    buttonRadius,
    buttonSize,
    buttonIcon
  );

  const previewButtonBg = hsbToHex(btnColor);
  const previewButtonStyle: React.CSSProperties = {
    backgroundColor: previewButtonBg,
    borderRadius: `${previewMetrics.borderRadius}px`,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap:
      buttonContentType === "text" &&
      buttonIconPosition !== "none" &&
      !previewIsIconOnly
        ? "6px"
        : "0",
    border: "none",
    boxShadow: `0 4px 14px ${previewButtonBg}44, 0 1px 3px rgba(0,0,0,0.12)`,
    color:
      buttonContentType === "text" ? hsbToHex(buttonTextColor) : "inherit",
    padding: previewIsIconOnly
      ? "0"
      : `${previewMetrics.paddingY}px ${previewMetrics.paddingX}px`,
    minWidth: previewIsIconOnly
      ? `${previewMetrics.iconOnlySize}px`
      : "fit-content",
    width: previewIsIconOnly ? `${previewMetrics.iconOnlySize}px` : "auto",
    height: previewIsIconOnly ? `${previewMetrics.iconOnlySize}px` : "auto",
    overflow: "hidden",
    fontSize: `${previewMetrics.fontSize}px`,
    lineHeight: 1,
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    letterSpacing: "-0.01em",
  };

  const selectedIconOpt = BUTTON_ICON_OPTIONS.find((o) => o.value === buttonIcon);
  const previewIconNode = (() => {
    if (buttonIcon === "none" || !selectedIconOpt) return null;
    const PreviewIcon = selectedIconOpt.icon;
    const iconSize = Math.max(16, previewMetrics.fontSize - 2);
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          flexShrink: 0,
        }}
      >
        <PreviewIcon
          style={{ width: "100%", height: "100%", fill: "currentColor" }}
        />
      </span>
    );
  })();

  const previewContent =
    previewContentType === "image" ? (
      buttonImageUrl ? (
        <img
          src={buttonImageUrl}
          alt={buttonText || "Button icon"}
          width={Math.max(20, previewMetrics.fontSize)}
          height={Math.max(20, previewMetrics.fontSize)}
          style={{
            objectFit: "cover",
            borderRadius: "9999px",
            display: "block",
          }}
        />
      ) : (
        <span aria-hidden="true">{buttonEmoji || "👀"}</span>
      )
    ) : previewContentType === "emoji" ? (
      <span aria-hidden="true">{buttonEmoji || "👀"}</span>
    ) : buttonIconPosition === "before" ? (
      <>
        {previewIconNode}
        <span>{buttonText || "Try It On"}</span>
      </>
    ) : buttonIconPosition === "after" ? (
      <>
        <span>{buttonText || "Try It On"}</span>
        {previewIconNode}
      </>
    ) : (
      <span>{buttonText || "Try It On"}</span>
    );

  // ── Onboarding steps ──
  const onboardingSteps = [
    {
      label: "Install application",
      done: true,
    },
    {
      label: "Enable Try-On widget",
      done: isWidgetEnabled,
    },
    {
      label: "Customize widget appearance",
      done: merchantData.hasCustomizedWidget,
    },
  ];
  const completedSteps = onboardingSteps.filter((s) => s.done).length;

  // ── Size / roundness humanized labels ──
  const sizeLabel =
    buttonSize <= 20
      ? "Compact"
      : buttonSize <= 40
        ? "Small"
        : buttonSize <= 60
          ? "Medium"
          : buttonSize <= 80
            ? "Large"
            : "Extra Large";

  const roundnessLabel =
    buttonRadius <= 5
      ? "Sharp"
      : buttonRadius <= 25
        ? "Slightly rounded"
        : buttonRadius <= 50
          ? "Rounded"
          : buttonRadius <= 75
            ? "Pill-ish"
            : "Full pill";

  const positionReadable = position
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="600">
        {/* ─── Hero Banner ─── */}
        {!isWidgetEnabled && (
          <Banner
            title="Your Try-On widget is currently disabled"
            tone="warning"
            action={{ content: "Enable widget", onAction: toggleWidget }}
            secondaryAction={{
              content: "Preview on storefront",
              url: `https://${merchantData.shopDomain}?try_on_preview=1`,
              target: "_blank",
            }}
          >
            Enable the widget to start showing virtual try-on to your customers.
          </Banner>
        )}

        {/* ─── Status Row: Welcome + Quick Stats ─── */}
        <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="100">
                  <Text variant="headingLg" as="h2">
                    Welcome to Planicle Try-On
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Your virtual try-on widget is ready to boost conversions.
                    Customize the button, pick your colors, and go live.
                  </Text>
                </BlockStack>
                <Badge
                  tone={isWidgetEnabled ? "success" : "critical"}
                >
                  {isWidgetEnabled ? "Active" : "Inactive"}
                </Badge>
              </InlineStack>

              <Divider />

              <InlineStack gap="300" wrap={false}>
                <ButtonGroup>
                  <Button
                    variant={isWidgetEnabled ? "secondary" : "primary"}
                    onClick={toggleWidget}
                    icon={isWidgetEnabled ? undefined : PlayIcon}
                  >
                    {isWidgetEnabled ? "Disable Widget" : "Enable Widget"}
                  </Button>
                  <Button
                    url={`https://${merchantData.shopDomain}?try_on_preview=1`}
                    target="_blank"
                    icon={ViewIcon}
                  >
                    Test on Storefront
                  </Button>
                </ButtonGroup>
              </InlineStack>
            </BlockStack>
          </Card>

          <Card roundedAbove="sm">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">
                  Monthly Usage
                </Text>
                <Badge
                  tone={merchantData.plan === "free" ? "attention" : "success"}
                >
                  {`${planLabel} Plan`}
                </Badge>
              </InlineStack>

              <Divider />

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="headingXl" as="p" fontWeight="bold">
                    {stats.usedGenerations}
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    of {stats.totalGenerations}
                  </Text>
                </InlineStack>
                <ProgressBar
                  progress={progressPercentage}
                  tone={progressPercentage > 80 ? "critical" : "primary"}
                  size="small"
                />
                <Text variant="bodySm" as="p" tone="subdued">
                  {stats.totalGenerations - stats.usedGenerations} generations
                  remaining this month
                </Text>
              </BlockStack>

              {merchantData.plan === "free" && (
                <Button variant="primary" fullWidth>
                  Upgrade Plan
                </Button>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ─── Setup Checklist ─── */}
        <Card roundedAbove="sm">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingSm" as="h3">
                  Setup Progress
                </Text>
                <Badge tone="info">
                  {`${completedSteps} of ${onboardingSteps.length}`}
                </Badge>
              </InlineStack>
            </InlineStack>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
              {onboardingSteps.map((step, i) => (
                <Box
                  key={i}
                  padding="300"
                  background={step.done ? "bg-surface-success" : "bg-surface-secondary"}
                  borderRadius="200"
                  borderWidth="025"
                  borderColor={step.done ? "border-success" : "border"}
                >
                  <InlineStack gap="200" blockAlign="center" wrap={false}>
                    <Box>
                      <Icon
                        source={step.done ? CheckCircleIcon : ClockIcon}
                        tone={step.done ? "success" : "subdued"}
                      />
                    </Box>
                    <BlockStack gap="050">
                      <Text
                        variant="bodySm"
                        as="p"
                        fontWeight="semibold"
                        tone={step.done ? "success" : undefined}
                      >
                        {step.done ? "Complete" : "Pending"}
                      </Text>
                      <Text variant="bodySm" as="p">
                        {step.label}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              ))}
            </InlineGrid>
          </BlockStack>
        </Card>

        {/* ─── Widget Customization ─── */}
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Section: Content */}
              <Card roundedAbove="sm">
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h3">
                      Button Content
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Choose what your try-on button displays — text, emoji, or
                      a custom image.
                    </Text>
                  </BlockStack>

                  <Divider />

                  <FormLayout>
                    <Select
                      label="Content type"
                      options={[
                        { label: "Text label", value: "text" },
                        { label: "Single emoji", value: "emoji" },
                        { label: "Custom image", value: "image" },
                      ]}
                      onChange={(value) =>
                        setButtonContentType(normalizeButtonContentType(value))
                      }
                      value={buttonContentType}
                      helpText="Text lets you add an optional icon alongside."
                    />

                    {buttonContentType === "text" && (
                      <>
                        <TextField
                          label="Button label"
                          value={buttonText}
                          onChange={setButtonText}
                          autoComplete="off"
                          maxLength={24}
                          showCharacterCount
                          helpText="Keep it short — 2-3 words work best."
                        />
                        <BlockStack gap="300">
                          <BlockStack gap="050">
                            <Text variant="bodySm" as="p" fontWeight="semibold">
                              Icon
                            </Text>
                            <Text variant="bodySm" as="p" tone="subdued">
                              Optional icon displayed alongside the label.
                            </Text>
                          </BlockStack>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4, 1fr)",
                              gap: "8px",
                            }}
                          >
                            {BUTTON_ICON_OPTIONS.map(({ value, label, icon: PickerIcon }) => {
                              const isSelected = buttonIcon === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    const nextIcon = normalizeButtonIcon(value);
                                    setButtonIcon(nextIcon);
                                    setButtonIconPosition(
                                      nextIcon === "none"
                                        ? "none"
                                        : buttonIconPosition === "none"
                                          ? "after"
                                          : buttonIconPosition
                                    );
                                  }}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 6px 8px",
                                    borderRadius: "8px",
                                    border: isSelected
                                      ? "2px solid var(--p-color-border-interactive-active)"
                                      : "1.5px solid var(--p-color-border)",
                                    background: isSelected
                                      ? "var(--p-color-bg-surface-active)"
                                      : "var(--p-color-bg-surface)",
                                    cursor: "pointer",
                                    transition: "border-color 0.15s ease, background 0.15s ease",
                                  }}
                                >
                                  <Icon
                                    source={PickerIcon}
                                    tone={isSelected ? "interactive" : "subdued"}
                                  />
                                  <Text
                                    variant="bodySm"
                                    as="span"
                                    tone={isSelected ? undefined : "subdued"}
                                    fontWeight={isSelected ? "semibold" : undefined}
                                  >
                                    {label}
                                  </Text>
                                </button>
                              );
                            })}
                          </div>
                          {buttonIcon !== "none" && (
                            <Select
                              label="Icon placement"
                              options={[
                                { label: "Before text", value: "before" },
                                { label: "After text", value: "after" },
                              ]}
                              onChange={(value) =>
                                setButtonIconPosition(
                                  normalizeButtonIconPosition(value)
                                )
                              }
                              value={buttonIconPosition}
                            />
                          )}
                        </BlockStack>
                      </>
                    )}

                    {buttonContentType === "emoji" && (
                      <TextField
                        label="Emoji character"
                        value={buttonEmoji}
                        onChange={setButtonEmoji}
                        autoComplete="off"
                        helpText="A single emoji creates a compact circular button."
                      />
                    )}

                    {buttonContentType === "image" && (
                      <BlockStack gap="400">
                        <Select
                          label="Image source"
                          options={[
                            { label: "Upload file", value: "upload" },
                            { label: "Image URL", value: "url" },
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
                                const file =
                                  event.currentTarget.files?.[0] || null;
                                handleImageUpload(file);
                                event.currentTarget.value = "";
                              }}
                            />
                            <InlineStack gap="200">
                              <Button
                                onClick={() =>
                                  imageInputRef.current?.click()
                                }
                              >
                                Choose file
                              </Button>
                              {buttonImageUrl && (
                                <Button
                                  variant="plain"
                                  tone="critical"
                                  onClick={() => setButtonImageUrl("")}
                                >
                                  Remove
                                </Button>
                              )}
                            </InlineStack>
                            <Text variant="bodySm" as="p" tone="subdued">
                              {buttonImageUrl
                                ? "✓ Image selected"
                                : "No file chosen. Upload a PNG or SVG for best results."}
                            </Text>
                          </BlockStack>
                        ) : (
                          <TextField
                            label="Image URL"
                            value={buttonImageUrl}
                            onChange={setButtonImageUrl}
                            autoComplete="off"
                            type="url"
                            helpText="Use a publicly accessible URL. Square images work best."
                          />
                        )}
                      </BlockStack>
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Section: Appearance */}
              <Card roundedAbove="sm">
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h3">
                      Appearance
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Control where the button appears, its size, shape, and
                      colors.
                    </Text>
                  </BlockStack>

                  <Divider />

                  <FormLayout>
                    <Select
                      label="Widget position"
                      options={[
                        { label: "Bottom right", value: "bottom-right" },
                        { label: "Bottom left", value: "bottom-left" },
                        { label: "Center left", value: "middle-left" },
                      ]}
                      onChange={setPosition}
                      value={position}
                      helpText="Where the button floats on product pages."
                    />

                    <FormLayout.Group>
                      <RangeSlider
                        label="Size"
                        min={0}
                        max={100}
                        step={1}
                        value={buttonSize}
                        onChange={(value) => setButtonSize(Number(value))}
                        output
                        suffix={
                          <Text variant="bodySm" as="span" tone="subdued">
                            {sizeLabel}
                          </Text>
                        }
                      />
                      <RangeSlider
                        label="Roundness"
                        min={0}
                        max={100}
                        step={1}
                        value={buttonRadius}
                        onChange={(value) => setButtonRadius(Number(value))}
                        output
                        suffix={
                          <Text variant="bodySm" as="span" tone="subdued">
                            {roundnessLabel}
                          </Text>
                        }
                      />
                    </FormLayout.Group>

                    <InlineGrid columns={buttonContentType === "text" ? 2 : 1} gap="400">
                      <BlockStack gap="200" inlineAlign="center">
                        <InlineStack gap="200" blockAlign="center" align="center">
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              backgroundColor: hsbToHex(btnColor),
                              border: "1px solid var(--p-color-border)",
                              flexShrink: 0,
                            }}
                          />
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            Button color
                          </Text>
                        </InlineStack>
                        <ColorPicker onChange={setBtnColor} color={btnColor} />
                      </BlockStack>

                      {buttonContentType === "text" && (
                        <BlockStack gap="200" inlineAlign="center">
                          <InlineStack gap="200" blockAlign="center" align="center">
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                backgroundColor: hsbToHex(buttonTextColor),
                                border: "1px solid var(--p-color-border)",
                                flexShrink: 0,
                              }}
                            />
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                              Text color
                            </Text>
                          </InlineStack>
                          <ColorPicker
                            onChange={setButtonTextColor}
                            color={buttonTextColor}
                          />
                        </BlockStack>
                      )}
                    </InlineGrid>
                  </FormLayout>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* ── Sticky Preview Sidebar ── */}
          <Layout.Section variant="oneThird">
            <div style={{ position: "sticky", top: 16 }}>
              <Card roundedAbove="sm">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd" as="h3">
                      Live Preview
                    </Text>
                    <Badge
                      tone={isWidgetEnabled ? "success" : "attention"}
                    >
                      {isWidgetEnabled ? "Live" : "Preview only"}
                    </Badge>
                  </InlineStack>

                  <Divider />

                  {/* Simulated storefront preview */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "240px",
                      borderRadius: "10px",
                      border: "1px solid var(--p-color-border-secondary)",
                      background: "var(--p-color-bg-surface)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Mini browser chrome */}
                    <div
                      style={{
                        height: "24px",
                        background: "var(--p-color-bg-surface-secondary)",
                        borderBottom: "1px solid var(--p-color-border-secondary)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 8px",
                        gap: "4px",
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5f57" }} />
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#febc2e" }} />
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#28c840" }} />
                      <div
                        style={{
                          marginLeft: "8px",
                          flex: 1,
                          height: "12px",
                          borderRadius: "4px",
                          background: "var(--p-color-bg-surface)",
                          maxWidth: "120px",
                        }}
                      />
                    </div>

                    {/* Product page skeleton */}
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        padding: "10px",
                        height: "calc(100% - 24px)",
                        opacity: 0.3,
                      }}
                    >
                      {/* Product image skeleton */}
                      <div
                        style={{
                          width: "45%",
                          borderRadius: "6px",
                          background: "var(--p-color-bg-surface-secondary)",
                          flexShrink: 0,
                        }}
                      />
                      {/* Product details skeleton */}
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          paddingTop: "4px",
                        }}
                      >
                        <div style={{ width: "80%", height: "10px", borderRadius: "3px", background: "var(--p-color-bg-surface-secondary)" }} />
                        <div style={{ width: "50%", height: "8px", borderRadius: "3px", background: "var(--p-color-bg-surface-secondary)" }} />
                        <div style={{ width: "35%", height: "12px", borderRadius: "3px", background: "var(--p-color-bg-surface-secondary)", marginTop: "4px" }} />
                        <div style={{ width: "100%", height: "6px", borderRadius: "3px", background: "var(--p-color-bg-surface-secondary)", marginTop: "8px" }} />
                        <div style={{ width: "90%", height: "6px", borderRadius: "3px", background: "var(--p-color-bg-surface-secondary)" }} />
                        <div style={{ width: "60%", height: "24px", borderRadius: "4px", background: "var(--p-color-bg-surface-secondary)", marginTop: "auto" }} />
                      </div>
                    </div>

                    {/* The actual button preview, positioned */}
                    <div
                      style={{
                        position: "absolute",
                        ...(position.includes("right")
                          ? { right: 10 }
                          : { left: 10 }),
                        ...(position.includes("bottom")
                          ? { bottom: 10 }
                          : position.includes("middle")
                            ? { top: "50%", transform: "translateY(-50%)" }
                            : { bottom: 10 }),
                        zIndex: 2,
                      }}
                    >
                      <div style={previewButtonStyle}>
                        {previewContent}
                      </div>
                    </div>
                  </div>

                  {/* Metadata — key-value table */}
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="200">
                      {[
                        { label: "Position", value: positionReadable },
                        { label: "Size", value: sizeLabel },
                        { label: "Shape", value: roundnessLabel },
                        {
                          label: "Type",
                          value:
                            previewContentType === "text"
                              ? "Text button"
                              : previewContentType === "emoji"
                                ? "Emoji"
                                : "Image",
                        },
                      ].map((row) => (
                        <InlineStack
                          key={row.label}
                          align="space-between"
                          blockAlign="center"
                        >
                          <Text variant="bodySm" as="p" tone="subdued">
                            {row.label}
                          </Text>
                          <Text variant="bodySm" as="p" fontWeight="semibold">
                            {row.value}
                          </Text>
                        </InlineStack>
                      ))}
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodySm" as="p" tone="subdued">
                          Color
                        </Text>
                        <InlineStack gap="100" blockAlign="center">
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "3px",
                              backgroundColor: previewButtonBg,
                              border: "1px solid var(--p-color-border)",
                            }}
                          />
                          <Text variant="bodySm" as="p" fontWeight="semibold">
                            {previewButtonBg.toUpperCase()}
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    </BlockStack>
                  </Box>

                  <Divider />

                  <Button
                    onClick={handleSaveSettings}
                    variant="primary"
                    loading={isSaving}
                    fullWidth
                    size="large"
                  >
                    Save settings
                  </Button>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
