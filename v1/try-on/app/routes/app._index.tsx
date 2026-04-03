import { useEffect, useState, useCallback } from "react";
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
  Select,
  Grid,
  Icon,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";
import { eq } from "drizzle-orm";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { HeadersFunction } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
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

  // Always sync current DB state to AppInstallation metafield on page load
  // This ensures the storefront widget always reflects the latest DB state
  try {
    const appInstRes = await admin.graphql(`
      query { currentAppInstallation { id } }
    `);
    const appInstData = await appInstRes.json();
    const ownerId = appInstData.data.currentAppInstallation.id;

    await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { key namespace value }
          userErrors { field message code }
        }
      }
    `, {
      variables: {
        metafields: [
          {
            key: "widget_config",
            namespace: "try_on",
            ownerId,
            type: "json",
            value: JSON.stringify({
              hue: currentMerchant.widgetBtnColorHue,
              position: currentMerchant.widgetPosition,
              isEnabled: currentMerchant.isWidgetEnabled,
            })
          }
        ]
      }
    });
    console.log("Loader: Widget config synced to metafield");
  } catch (err) {
    console.error("Loader: Failed to sync metafield", err);
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
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const hue = parseInt(formData.get("btnColorHue") as string, 10);
  const position = formData.get("position") as string;
  const isEnabled = formData.get("isEnabled") === "true";

  await db.update(merchant)
    .set({
      widgetBtnColorHue: hue,
      widgetPosition: position,
      isWidgetEnabled: isEnabled,
      updatedAt: new Date(),
    })
    .where(eq(merchant.shopDomain, session.shop));

  // Sync settings to AppInstallation metafields — accessible in theme extensions via app.metafields
  const appInstRes = await admin.graphql(`
    query { currentAppInstallation { id } }
  `);
  const appInstData = await appInstRes.json();
  const ownerId = appInstData.data.currentAppInstallation.id;

  const mfRes = await admin.graphql(`#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key namespace value }
        userErrors { field message code }
      }
    }
  `, {
    variables: {
      metafields: [
        {
          key: "widget_config",
          namespace: "try_on",
          ownerId,
          type: "json",
          value: JSON.stringify({ hue, position, isEnabled })
        }
      ]
    }
  });

  const mfData = await mfRes.json();
  console.log("Metafield sync full response:", JSON.stringify(mfData, null, 2));
  if (mfData.data?.metafieldsSet?.userErrors?.length) {
    console.error("Metafield sync error:", mfData.data.metafieldsSet.userErrors);
  } else {
    console.log("Widget config saved to app metafield:", mfData.data?.metafieldsSet?.metafields);
  }

  return { success: true };
};

export default function Index() {
  const { merchant, stats } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  
  const isSaving = navigation.state === "submitting";

  // Widget settings state
  const [btnColor, setBtnColor] = useState({
    hue: merchant.widgetBtnColorHue ?? 120,
    brightness: 1,
    saturation: 1,
  });
  const [position, setPosition] = useState(merchant.widgetPosition ?? "bottom-right");
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(merchant.isWidgetEnabled ?? false);

  const handleSaveSettings = useCallback(() => {
    const formData = new FormData();
    formData.append("btnColorHue", btnColor.hue.toString());
    formData.append("position", position);
    formData.append("isEnabled", isWidgetEnabled.toString());
    submit(formData, { method: "post" });
    shopify.toast.show("Settings saved successfully");
  }, [btnColor, position, isWidgetEnabled, submit, shopify]);

  const toggleWidget = useCallback(() => setIsWidgetEnabled((v) => !v), []);

  const progressPercentage = (stats.usedGenerations / stats.totalGenerations) * 100;

  // Deriving HSL string for the preview button
  const previewColor = `hsl(${btnColor.hue}, 100%, 40%)`;

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

          {/* Settings Section */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card roundedAbove="sm">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Widget Customization
                  </Text>
                  <FormLayout>
                    <Select
                      label="Widget Position"
                      options={[
                        { label: "Bottom Right", value: "bottom-right" },
                        { label: "Bottom Left", value: "bottom-left" },
                        { label: "Middle Left", value: "middle-left" },
                      ]}
                      onChange={setPosition}
                      value={position}
                    />
                    <Box>
                      <Text as="p" variant="bodyMd">Primary Button Color</Text>
                      <Box paddingBlockStart="200">
                        <ColorPicker onChange={setBtnColor} color={btnColor} />
                      </Box>
                    </Box>
                  </FormLayout>
                  <Divider />
                  
                  {/* Button Live Preview */}
                  <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text variant="headingSm" as="h4">Button Preview</Text>
                      <div
                        style={{
                          backgroundColor: previewColor,
                          color: "#fff",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          display: "inline-block",
                          border: "1px solid rgba(0,0,0,0.1)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}
                      >
                        Try It On 👀
                      </div>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Position: {position.replace("-", " ")}
                      </Text>
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
